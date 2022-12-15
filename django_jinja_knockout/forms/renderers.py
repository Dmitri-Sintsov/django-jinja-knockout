from copy import copy

from django import forms
from django.conf import settings
from django.utils.html import format_html, mark_safe
from django.utils.translation import gettext as _
from django.utils.text import format_lazy

from djk_ui import conf as djk_ui_conf

from ..templatetags.fields import (
    is_visible_field, is_triggered_field, is_select_multiple_field, is_prefill_field,
    filter_get_display_layout, filter_is_checkbox, filter_is_multiple_checkbox, filter_is_radio
)
from .. import tpl

from . import base


def add_input_classes_to_field(model_field):
    classes = model_field.widget.attrs.get('class', '').strip()
    classnames = [] if classes == '' else classes.split(' ')
    # Do not add 'form-control' to bootstrap checkbox / radio, otherwise
    # they will look ugly.
    if 'form-control' not in classnames and is_visible_field(model_field) and not is_triggered_field(model_field):
        classnames.append('form-control')
    # Support autogrow plugin.
    if 'autogrow' not in classnames and isinstance(model_field.widget, forms.widgets.Textarea):
        classnames.append('autogrow')
        model_field.widget.attrs['rows'] = 2
    # Support bootstrap date / datetime plugin.
    if 'date-control' not in classnames and isinstance(model_field.widget, forms.widgets.DateInput):
        classnames.append('date-control')
    if 'datetime-control' not in classnames and isinstance(model_field.widget, forms.widgets.DateTimeInput):
        classnames.append('datetime-control')
    # Support PrefillWidget.
    if is_prefill_field(model_field):
        tpl.add_css_classes_to_dict(model_field.widget.data_widget.attrs, 'form-control')
    model_field.widget.attrs['class'] = ' '.join(classnames)
    if is_select_multiple_field(model_field):
        msg = _('Hold down "Control", or "Command" on a Mac, to select more than one.')
        help_text = model_field.help_text
        model_field.help_text = format_lazy('{} {}', help_text, msg) if help_text else msg


def get_layout_classes():
    return getattr(settings, 'LAYOUT_CLASSES', djk_ui_conf.LAYOUT_CLASSES)


def get_form_renderer(typ, form, default_cls=None):
    renderer_cls_name = f'render_{typ}_cls'
    renderer_cls = getattr(
        getattr(form, 'Meta', None), renderer_cls_name, default_cls
    )
    return get_form_renderer(typ, base.BootstrapModelForm) if renderer_cls is None else renderer_cls


def ioc_form_renderer(request, typ, context, obj_kwarg=None, default_cls=None):
    if obj_kwarg is None:
        if default_cls is None:
            default_cls = get_form_renderer(typ, base.BootstrapModelForm)
        obj_kwarg = default_cls.obj_kwarg
    form = context[obj_kwarg]
    if '_renderer' not in form:
        form._renderer = {}
    if typ in form._renderer:
        renderer = form._renderer[typ]
        renderer.update_context(context)
        return renderer
    else:
        renderer_cls = get_form_renderer(typ, form, default_cls)
        renderer = renderer_cls(request, context=context)
        form._renderer[typ] = renderer
        return renderer


def render_form(request, typ, form, context=None):
    obj_kwarg = get_form_renderer(typ, base.BootstrapModelForm).obj_kwarg
    if context is None:
        context = {}
    context[obj_kwarg] = form
    return ioc_form_renderer(request, typ, context, obj_kwarg=obj_kwarg).__str__()


def render_fields(form, *fields):
    return mark_safe(''.join(form[field].djk_renderer() for field in fields))


class RelativeRenderer(tpl.Renderer):

    def get_template_dir(self):
        template_dir = getattr(self.context.get(self.obj_kwarg, None), 'template_dir', 'render/')
        return template_dir

    def get_layout_classes(self):
        layout_type = getattr(self.context.get(self.obj_kwarg, None), 'layout_type', '')
        layout_classes = get_layout_classes()
        return layout_classes[layout_type]


# The instance is stored into field.renderer.
class FieldRenderer(tpl.Renderer):

    obj_kwarg = 'field'
    template = 'field.htm'
    default_classes = {
        'label': 'col-md-2',
        'field': 'col-md-6',
        'multiple_type': '',
    }

    def __init__(self, request, template=None, context=None):
        super().__init__(request, template, context)
        self.display_layout = None

    def get_template_dir(self):
        self.display_layout = filter_get_display_layout(self.obj)
        template_dir = 'render/' if self.display_layout != 'table' else 'render/display/'
        return getattr(self.obj.field, 'template_dir', template_dir)

    def get_template_name(self):
        if hasattr(self.obj.field, 'render_template'):
            return self.obj.field.render_template
        if self.display_layout == 'table':
            return 'field.htm'
        elif self.display_layout == 'div':
            return 'field_standard.htm'
        elif filter_is_checkbox(self.obj):
            return 'field_checkbox.htm'
        elif filter_is_multiple_checkbox(self.obj):
            self.update_context({
                'classes': {
                    'multiple_type': 'checkbox'
                }
            })
            return 'field_multiple.htm'
        elif filter_is_radio(self.obj):
            self.update_context({
                'classes': {
                    'multiple_type': 'radio'
                }
            })
            return 'field_multiple.htm'
        else:
            return 'field_standard.htm'

    def set_classes(self, classes=None):
        add_input_classes_to_field(self.obj.field)
        if classes is None:
            classes = {}
        _classes = copy(self.default_classes)
        _classes.update(classes)
        self.context['classes'] = _classes


# The instance is stored into form._renderer['fields']
class FormFieldsRenderer(RelativeRenderer):

    obj_kwarg = 'form'
    obj_template_attr = 'fields_template'
    template = 'form_fields.htm'
    field_renderer_cls = FieldRenderer

    def ioc_render_field(self, field):
        # Note: field.field is not a typo but an access to ModelField from BoundField.
        renderer_cls = getattr(field.field, 'renderer_cls', self.field_renderer_cls)
        return renderer_cls(self.request, context={'field': field})

    def ioc_fields(self):
        field_classes = self.context.get('layout_classes', self.get_layout_classes())
        for field in self.obj.visible_fields():
            if not hasattr(field, 'djk_renderer'):
                field.djk_renderer = self.ioc_render_field(field)
            field.djk_renderer.set_classes(field_classes)

    def render_raw(self):
        self.ioc_fields()
        output = ''.join([
            format_html(
                '<div><div>{}</div><div>{}</div></div>', field.label, field.djk_renderer.render_raw()
            ) for field in self.obj.visible_fields()
        ])
        return mark_safe(output)

    def __str__(self):
        self.ioc_fields()
        return super().__str__()


class FormBodyRenderer(RelativeRenderer):
    obj_kwarg = 'form'
    obj_template_attr = 'body_template'
    template = 'form_body.htm'
    form_fields_renderer_cls = FormFieldsRenderer

    def ioc_render_form_fields(self, opts):
        return ioc_form_renderer(
            self.request, 'fields', {
                'caller': self.context.get('caller'),
                'opts': opts,
                'form': self.obj,
            },
            default_cls=self.form_fields_renderer_cls
        )

    def render_raw(self):
        context = self.get_template_context()
        return context[self.obj_kwarg]._renderer['fields']()

    def get_template_context(self):
        context = super().get_template_context()
        if 'opts' not in self.context:
            self.context['opts'] = {}
        if 'layout_classes' not in self.context['opts']:
            self.context['opts']['layout_classes'] = self.context['opts'].get('layout_classes', self.get_layout_classes())
        fields_renderer = self.ioc_render_form_fields(self.context['opts'])
        fields_renderer.ioc_fields()
        return context


# The instance is stored into form._renderer['related'].
class RelatedFormRenderer(RelativeRenderer):

    obj_kwarg = 'related_form'
    obj_template_attr = 'related_template'
    template = 'related_form.htm'
    form_body_renderer_cls = FormBodyRenderer

    def ioc_render_form_body(self, opts):
        return ioc_form_renderer(
            self.request, 'body', {
                'caller': self.context.get('caller'),
                'opts': opts,
                'form': self.obj,
            },
            default_cls=self.form_body_renderer_cls
        )

    def render_raw(self):
        context = self.get_template_context()
        return context[self.obj_kwarg]._renderer['body']()

    def get_template_context(self):
        context = super().get_template_context()
        if 'opts' not in self.context:
            self.context['opts'] = {}
        if 'layout_classes' not in self.context['opts']:
            self.context['opts']['layout_classes'] = self.context['opts'].get('layout_classes', self.get_layout_classes())
        self.ioc_render_form_body(self.context['opts'])
        return context


# The instance is stored info form._renderer['standalone'].
class StandaloneFormRenderer(RelatedFormRenderer):

    obj_kwarg = 'form'
    obj_template_attr = 'standalone_template'
    # Set form.standalone_template = 'form_raw.htm' to render form without the ui card.
    template = 'form.htm'


# The instance is stored into form._renderer['inline'].
class InlineFormRenderer(RelatedFormRenderer):

    obj_kwarg = 'form'
    obj_template_attr = 'inline_template'
    template = 'inline_form.htm'


# The instance is stored into formset.renderer.
class FormsetRenderer(tpl.Renderer):

    obj_kwarg = 'formset'
    obj_template_attr = 'template'
    template = 'formset.htm'
    inline_form_renderer_cls = InlineFormRenderer

    def ioc_render_inline_form(self, form):
        return ioc_form_renderer(
            self.request, 'inline', {
                'caller': self.context.get('caller'),
                'form': form,
            },
            default_cls=self.inline_form_renderer_cls
        )

    def ioc_forms(self, context):
        for idx, form in enumerate(self.obj):
            renderer = self.ioc_render_inline_form(form)
            renderer.update_context(context)
            renderer.update_context({'formset_index': idx})

    def get_template_context(self):
        context = super().get_template_context()
        self.ioc_forms({
            'opts': self.context.get('opts', {}),
        })
        return context

    def render_raw(self):
        self.get_template_context()
        output = ''.join([
            form._renderer['inline']() for form in self.obj
        ])
        return mark_safe(output)
