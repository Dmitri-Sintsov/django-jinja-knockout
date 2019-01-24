from copy import copy
import string
from io import StringIO
import lxml.html
from lxml.etree import tostring

from django.conf import settings
from django.utils.html import format_html, mark_safe
from django.http import QueryDict
from django.db import transaction
from django import forms
from django.forms.models import BaseInlineFormSet, ModelFormMetaclass, inlineformset_factory
from django.contrib.contenttypes.forms import generic_inlineformset_factory

from djk_ui import conf as djk_ui_conf

from .apps import DjkAppConfig
from .utils import sdv
from .templatetags import bootstrap
from .tpl import Renderer
from .widgets import DisplayText
from .viewmodels import to_json


def get_layout_classes():
    return getattr(settings, 'LAYOUT_CLASSES', djk_ui_conf.LAYOUT_CLASSES)


class RelativeRenderer(Renderer):

    def get_template_dir(self):
        template_dir = getattr(self.context.get(self.obj_kwarg, None), 'template_dir', 'render/')
        return template_dir

    def get_layout_classes(self):
        layout_type = getattr(self.context.get(self.obj_kwarg, None), 'layout_type', '')
        layout_classes = get_layout_classes()
        return layout_classes[layout_type]


# The instance is stored into field.renderer.
class FieldRenderer(Renderer):

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


def get_form_renderer(typ, form, default_cls=None):
    renderer_cls_name = 'render_{}_cls'.format(typ)
    renderer_cls = getattr(
        getattr(form, 'Meta', None), renderer_cls_name, default_cls
    )
    return get_form_renderer(typ, BootstrapModelForm) if renderer_cls is None else renderer_cls


def ioc_form_renderer(request, typ, context, obj_kwarg=None, default_cls=None):
    if obj_kwarg is None:
        if default_cls is None:
            default_cls = get_form_renderer(typ, BootstrapModelForm)
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
    obj_kwarg = get_form_renderer(typ, BootstrapModelForm).obj_kwarg
    if context is None:
        context = {}
    context[obj_kwarg] = form
    return ioc_form_renderer(request, typ, context, obj_kwarg=obj_kwarg).__str__()


def render_fields(form, *fields):
    return mark_safe(''.join(form[field].renderer() for field in fields))


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
class FormsetRenderer(Renderer):

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


# Form with self.request and attributes for renderer templates, which can be overriden in derived class.
class RendererModelForm(forms.ModelForm):

    # None value means that the default template from renderer class will be used.
    body_template = None
    standalone_template = None
    related_template = None
    inline_template = None

    class Meta:
        field_templates = {}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Automatically make current http request available as .request attribute of form instance.
        context_middleware = DjkAppConfig.get_context_middleware()
        self.request = context_middleware.get_request()
        if hasattr(self.Meta, 'field_templates'):
            for field_name in self.Meta.field_templates:
                if field_name in self.fields:
                    self.fields[field_name].render_template = self.Meta.field_templates[field_name]


# Form with default renderers stylized for bootstrap3 which can be overriden in derived class.
class BootstrapModelForm(RendererModelForm):

    class Meta(RendererModelForm.Meta):
        render_body_cls = FormBodyRenderer
        render_inline_cls = InlineFormRenderer
        render_related_cls = RelatedFormRenderer
        render_standalone_cls = StandaloneFormRenderer


# Set all default (implicit) widgets to DisplayText.
def display_model_formfield_callback(db_field, **kwargs):
    defaults = {'widget': DisplayText}
    defaults.update(kwargs)
    return db_field.formfield(**defaults)


class UnchangeableModelMixin:

    def has_changed(self):
        # Display forms never change.
        return False


# http://stackoverflow.com/questions/8320739/django-where-to-clean-extra-whitespace-from-form-field-inputs
class CustomFullClean:

    # override to perform custom field cleaning.
    def custom_clean_field(self, key, val):
        return val

    def full_clean(self):
        # self.data can be dict (usually empty) or QueryDict here.
        is_querydict = isinstance(self.data, QueryDict)
        if is_querydict:
            # Clone QueryDict to make it writeable.
            self.data = self.data.copy()
        for key in self.data:
            if is_querydict:
                self.data.setlist(key, [self.custom_clean_field(key, val) for val in self.data.getlist(key)])
            else:
                self.data[key] = self.custom_clean_field(key, self.data[key])
        super().full_clean()


class StripWhitespaceMixin(CustomFullClean):

    nonprintable_map = {
        ord(character): None for character in set([chr(i) for i in range(128)]).difference(string.printable)
    }

    def custom_clean_field(self, key, val):
        return val.strip().translate(self.nonprintable_map)


# Metaclass used to create read-only forms (display models). #
class DisplayModelMetaclass(ModelFormMetaclass):

    def __new__(mcs, name, bases, attrs):
        if attrs is None:
            attrs = {}
        bases = bases + (UnchangeableModelMixin,)
        attrs['formfield_callback'] = display_model_formfield_callback
        if 'template_dir' not in attrs:
            attrs['template_dir'] = 'render/display/'
        if 'layout_type' not in attrs:
            attrs['layout_type'] = 'display'
        return ModelFormMetaclass.__new__(mcs, name, bases, attrs)


class WidgetInstancesMixin(forms.ModelForm):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields.values():
            if hasattr(self, 'instance'):
                field.widget.instance = self.instance
            if hasattr(self, 'request'):
                field.widget.request = self.request


# Used to generate fake empty_form template for display models formsets where real knockout.js template is unneeded. #
def set_empty_template(formset, request, html: dict = None):
    return None


# Monkey-patching methods for formset to support knockout.js version of empty_form #
def set_knockout_template(formset, request, opts: dict = None):
    if opts is None:
        opts = {}
    _opts = {
        'formset_form_class': 'form-empty',
        'inline_title': getattr(formset, 'inline_title', formset.model._meta.verbose_name),
        'layout_classes': get_layout_classes()[''],
    }
    _opts.update(opts)
    renderer = render_form(request, 'inline', formset.empty_form, {
        'caller': {},
        'opts': _opts,
    })
    empty_form_str = renderer.__str__()
    # return str(empty_form_str)
    html = lxml.html.parse(StringIO(empty_form_str))
    for element in html.xpath("//*[@id or @name or @for]"):
        # sdv.dbg('element', element)
        data_bind_args = []
        for attr in ['for', 'id', 'name']:
            if attr in element.attrib:
                attr_parts = element.attrib[attr].split('__prefix__')
                if len(attr_parts) == 2:
                    attr_parts = to_json(attr_parts[0]) + ' + ($index() + $parent.serversideFormsCount) + ' + to_json(attr_parts[1])
                    data_bind_args.append(to_json(attr) + ': ' + attr_parts)
                    del element.attrib[attr]
        # sdv.dbg('data_bind_args', data_bind_args)
        if len(data_bind_args) > 0:
            data_bind = 'attr: {' + ', '.join(data_bind_args) + '}'
            # sdv.dbg('data_bind', data_bind)
            element.attrib['data-bind'] = data_bind
    knockout_template = tostring(html, method='html', encoding='utf-8', standalone=True).decode('utf-8')
    # sdv.dbg('knockout_template before', knockout_template)
    body_begin = knockout_template.find('<body>')
    body_end = knockout_template.rfind('</body>')
    if body_begin == -1 or body_end == -1:
        sdv.dbg('failed ko template', knockout_template)
        raise ValueError('Knockout template is not wrapped in body tag')
    # sdv.dbg('knockout_template after', formset.knockout_template)
    formset.knockout_template = knockout_template[body_begin + len('<body>'):body_end]
    # @note: Uncomment next line to test knockout.js template for XSS.
    # alert() should execute only when new form is added into formset, not during the page load.
    # formset.knockout_template += '<script language="javascript">alert(1);</script>'


def ko_inlineformset_factory(parent_model, model, form, **kwargs):
    if isinstance(form, DisplayModelMetaclass):
        kwargs.update({
            'extra': 0,
            'can_delete': False
        })
    formset = inlineformset_factory(parent_model, model, form, **kwargs)
    formset.set_knockout_template = set_empty_template \
        if isinstance(form, DisplayModelMetaclass) \
        else set_knockout_template
    return formset


def ko_generic_inlineformset_factory(model, form, **kwargs):
    if isinstance(form, DisplayModelMetaclass):
        kwargs.update({
            'extra': 0,
            'can_delete': False
        })
    formset = generic_inlineformset_factory(model, form, **kwargs)
    formset.set_knockout_template = set_empty_template \
        if isinstance(form, DisplayModelMetaclass) \
        else set_knockout_template
    return formset


# Layer on top of related form and it's many to one multiple formsets.
# GET / CREATE / UPDATE.
class FormWithInlineFormsets:

    FormClass = None
    FormsetClasses = None
    prefix = None
    related_form_renderer_cls = RelatedFormRenderer
    formset_renderer_cls = FormsetRenderer

    def __init__(self, request, form_class=None, formset_classes=None, create=False, prefix=None):
        if self.FormClass is None:
            self.FormClass = form_class
        if self.FormsetClasses is None:
            self.FormsetClasses = [] if formset_classes is None else formset_classes
        if self.prefix is None:
            self.prefix = prefix
        self.instance = None
        self.form = None
        self.formsets = None
        self.request = request
        # True: create, False: update. Non-destructive by default.
        self.create = create

    def get_form_class(self):
        return self.FormClass

    def get_formset_classes(self):
        return self.FormsetClasses

    def get_formset_initial(self, formset_class):
        return None

    def get_prefix(self):
        return self.prefix

    def get_instance_when_form_invalid(self):
        return None

    def ioc_related_form_renderer(self, form):
        return ioc_form_renderer(
            self.request, 'related', {
                'related_form': form,
            },
            default_cls=self.related_form_renderer_cls
        )

    # Note that 'GET' mode form can be generated in AJAX 'POST' request,
    # thus method argument value should be hardcoded, not filled from the current request.
    def prepare_form(self, form, method):
        if hasattr(form, 'set_request') and callable(form.set_request):
            form.set_request(self.request)
        self.ioc_related_form_renderer(form)

    def ioc_formset_renderer(self, formset):
        return self.formset_renderer_cls(self.request, {
            'formset': formset,
        })

    def get_formset_inline_title(self, formset):
        return None

    # Note that 'GET' mode formset can be generateed in AJAX 'POST' request,
    # thus method argument value should be hardcoded, not filled from current request.
    def prepare_formset(self, formset, method):
        formset.renderer = self.ioc_formset_renderer(formset)
        inline_title = self.get_formset_inline_title(formset)
        if inline_title is not None:
            formset.inline_title = inline_title
        formset.set_knockout_template(self.request)
        formset.request = self.request
        for form in formset:
            if hasattr(form, 'set_request') and callable(form.set_request):
                form.set_request(self.request)

    def get_form_kwargs(self):
        kwargs = {
            'instance': self.instance
        }
        prefix = self.get_prefix()
        if prefix is not None:
            kwargs['prefix'] = prefix
        return kwargs

    def get_form(self):
        form_class = self.get_form_class()
        if form_class is not None:
            self.form = form_class(**self.get_form_kwargs())
            self.prepare_form(self.form, 'GET')

    def post_form(self):
        form_class = self.get_form_class()
        if form_class is not None:
            form = form_class(self.request.POST, self.request.FILES, **self.get_form_kwargs())
            self.prepare_form(form, 'POST')
            self.form = form

    def get_formset_kwargs(self, formset_class):
        kwargs = {
            'instance': self.instance,
            'prefix': formset_class.get_default_prefix()
        }
        prefix = self.get_prefix()
        if prefix is not None:
            kwargs['prefix'] = self.get_prefix() + '-' + kwargs['prefix']
        kwargs['initial'] = self.get_formset_initial(formset_class)
        return kwargs

    def get_formsets(self):
        formset_classes = self.get_formset_classes()
        self.formsets = [
            formset_class(**self.get_formset_kwargs(formset_class))
            for formset_class in formset_classes
        ]
        for formset in self.formsets:
            self.prepare_formset(formset, 'GET')

    def post_formsets(self):
        formset_classes = self.get_formset_classes()
        self.formsets = [
            formset_class(
                self.request.POST, self.request.FILES, **self.get_formset_kwargs(formset_class)
            ) for formset_class in formset_classes
        ]
        for formset in self.formsets:
            self.prepare_formset(formset, 'POST')

    def save_model(self):
        self.instance = self.form.save()

    def save_m2m(self):
        if hasattr(self.form, 'save_m2m') and callable(self.form.save_m2m):
            self.form.save_m2m()

    def rollback_formsets(self):
        if self.create:
            if self.instance is not None:
                # Do not create model instance when formsets are invalid.
                self.instance.delete()

    def save_formset(self, formset):
        formset.save()

    def save_success(self):
        pass

    def has_changed(self):
        if self.form is not None and self.form.has_changed():
            return True
        for formset in self.formsets:
            for form in formset:
                if form.has_changed():
                    return True
        return False

    @transaction.atomic()
    def save(self, instance=None):
        self.instance = instance
        self.post_form()
        if self.form is not None:
            if not self.form.is_valid():
                self.instance = self.get_instance_when_form_invalid()
                self.post_formsets()
                return None
            self.save_model()
            self.save_m2m()
        self.post_formsets()
        if not all(formset.is_valid() for formset in self.formsets):
            self.rollback_formsets()
            return None
        for formset in self.formsets:
            # Delete previous relationships, if any.
            # Otherwise, formset model unique constraints may raise an error during update.
            # old_many = deepcopy(formset.queryset)
            # old_many.delete()
            """
            if formset.can_delete:
                for deleted_object in formset.deleted_objects:
                    deleted_object.delete()
            """
            self.save_formset(formset)
        self.save_success()
        return self.instance

    def get(self, instance=None):
        self.instance = instance
        self.get_form()
        self.get_formsets()


# Currently is unused, because 'form' kwarg is passed to inlineformset_factory() instead. #
class InlineFormSet(BaseInlineFormSet):

    FormClass = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.form = self.get_form

    def get_form(self, **defaults):
        return self.FormClass(**defaults)


# Mixed to BaseInlineFormset to use different form classes for already existing model objects
# and for newly added ones (empty_form).
# May be used with DisplayModelMetaclass to display existing forms as read-only, while
# making newly added ones editable.
class SeparateInitialFormMixin:

    InitialForm = None
    EmptyForm = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.form = self.get_form
        self.form_index = None

    # Used during POST.
    def get_form(self, **defaults):
        if self.form_index is None:
            raise ValueError('Invalid form index')
        return self.InitialForm(**defaults) \
            if self.form_index < self.initial_form_count() \
            else self.EmptyForm(**defaults)

    # Used during GET at client-side.
    @property
    def empty_form(self):
        form = self.EmptyForm(
            auto_id=self.auto_id,
            prefix=self.add_prefix('__prefix__'),
            empty_permitted=True,
        )
        self.add_fields(form, None)
        return form

    def _construct_form(self, i, **kwargs):
        self.form_index = i
        return super()._construct_form(i, **kwargs)
