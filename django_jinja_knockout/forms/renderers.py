from copy import copy

from django.conf import settings
from django.utils.html import format_html, mark_safe

from djk_ui import conf as djk_ui_conf

from ..templatetags import bootstrap
from .. import tpl

from . import base


def get_layout_classes():
    return getattr(settings, 'LAYOUT_CLASSES', djk_ui_conf.LAYOUT_CLASSES)


def get_form_renderer(typ, form, default_cls=None):
    renderer_cls_name = 'render_{}_cls'.format(typ)
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
    return mark_safe(''.join(form[field].renderer() for field in fields))


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

    def __init__(self, request, context=None):
        super().__init__(request, context)
        self.display_layout = None

    def get_template_dir(self):
        self.display_layout = bootstrap.get_display_layout(self.obj)
        template_dir = 'render/' if self.display_layout != 'table' else 'render/display/'
        return getattr(self.obj.field, 'template_dir', template_dir)

    def get_template_name(self):
        if hasattr(self.obj.field, 'render_template'):
            return self.obj.field.render_template
        if self.display_layout == 'table':
            return 'field.htm'
        elif self.display_layout == 'div':
            return 'field_standard.htm'
        elif bootstrap.is_checkbox(self.obj):
            return 'field_checkbox.htm'
        elif bootstrap.is_multiple_checkbox(self.obj):
            self.update_context({
                'classes': {
                    'multiple_type': 'checkbox'
                }
            })
            return 'field_multiple.htm'
        elif bootstrap.is_radio(self.obj):
            self.update_context({
                'classes': {
                    'multiple_type': 'radio'
                }
            })
            return 'field_multiple.htm'
        else:
            return 'field_standard.htm'

    def set_classes(self, classes=None):
        bootstrap.add_input_classes_to_field(self.obj.field)
        if classes is None:
            classes = {}
        _classes = copy(self.default_classes)
        _classes.update(classes)
        self.context['classes'] = _classes


# The instance is stored into form._renderer['body']
class FormBodyRenderer(RelativeRenderer):

    obj_kwarg = 'form'
    obj_template_attr = 'body_template'
    template = 'form_body.htm'
    field_renderer_cls = FieldRenderer

    def ioc_render_field(self, field):
        # Note: field.field is not a typo but an access to ModelField from BoundField.
        renderer_cls = getattr(field.field, 'renderer_cls', self.field_renderer_cls)
        return renderer_cls(self.request, {'field': field})

    def ioc_fields(self):
        field_classes = self.context.get('layout_classes', self.get_layout_classes())
        for field in self.obj.visible_fields():
            field.renderer = self.ioc_render_field(field)
            field.renderer.set_classes(field_classes)

    def render_raw(self):
        self.ioc_fields()
        output = ''.join([
            format_html(
                '<div><div>{}</div><div>{}</div></div>', field.label, field.renderer.render_raw()
            ) for field in self.obj.visible_fields()
        ])
        return mark_safe(output)

    def __str__(self):
        self.ioc_fields()
        return super().__str__()


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
