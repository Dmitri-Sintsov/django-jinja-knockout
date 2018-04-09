from collections import OrderedDict
import string
from .utils import sdv
from io import StringIO
import lxml.html
from lxml.etree import tostring

from django.http import QueryDict
from django.conf import settings
from django.db import transaction
from django import forms
from django.forms.models import BaseInlineFormSet, ModelFormMetaclass, inlineformset_factory
from django.contrib.contenttypes.forms import generic_inlineformset_factory
from django.template import loader as tpl_loader

from .apps import DjkAppConfig
from .context_processors import LAYOUT_CLASSES
from .templatetags.bootstrap import add_input_classes_to_field
from .widgets import DisplayText
from .viewmodels import to_json


# Form with field classes stylized for bootstrap3. #
class BootstrapModelForm(forms.ModelForm):

    def __init__(self, *args, **kwargs):
        """
        for field in Meta.fields:
            if field not in Meta.labels:
                Meta.labels[field] = Meta.model._meta.get_field(field).verbose_name.title()
            if field not in Meta.widgets:
                Meta.widgets[field] = forms.TextInput(attrs={'class': 'form-control'})
        """
        super().__init__(*args, **kwargs)
        # Automatically make current http request available as .request attribute of form instance.
        ContextMiddleware = DjkAppConfig.get_context_middleware()
        self.request = ContextMiddleware.get_request()
        for fieldname, field in self.fields.items():
            if hasattr(self.Meta, 'fields'):
                if self.Meta.fields == '__all__' or fieldname in self.Meta.fields:
                    add_input_classes_to_field(field)
            else:
                # Support for ModelForm which has Meta.exclude but no Meta.fields.
                add_input_classes_to_field(field)
            # sdv.dbg('label',self.fields[field].label)


# Set all default (implicit) widgets to DisplayText.
def display_model_formfield_callback(db_field, **kwargs):
    defaults = {'widget': DisplayText}
    defaults.update(kwargs)
    return db_field.formfield(**defaults)


class UnchangableModelMixin:

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
        bases = bases + (UnchangableModelMixin,)
        attrs.update({'formfield_callback': display_model_formfield_callback})
        return ModelFormMetaclass.__new__(mcs, name, bases, attrs)


class WidgetInstancesMixin(forms.ModelForm):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for name, field in self.fields.items():
            if hasattr(self, 'instance'):
                field.widget.instance = self.instance
            if hasattr(self, 'request'):
                field.widget.request = self.request


# Used to generate fake empty_form template for display models formsets where real Vue.js template is unneeded.
def set_empty_template(formset, request, html: dict=None):
    return None


# Monkey-patching of formset class to support Vue.js version of empty_form.
def set_vue_template(formset, request, html: dict=None):
    if html is None:
        html = {}
    t = tpl_loader.get_template('bs_formset_form.htm')
    _html = {
        'formset_form_class': 'form-empty',
        'inline_title': getattr(formset, 'inline_title', formset.model._meta.verbose_name),
        'layout_classes': getattr(settings, 'LAYOUT_CLASSES', LAYOUT_CLASSES)
    }
    _html.update(html)
    empty_form = t.render(request=request, context={
        'form': formset.empty_form,
        'html': _html
    })
    # return str(empty_form)
    html = lxml.html.parse(StringIO(empty_form))
    for element in html.xpath("//*[@id or @name or @for]"):
        # sdv.dbg('element', element)
        data_bind_args = OrderedDict()
        for attr in ['for', 'id', 'name']:
            if attr in element.attrib:
                if attr == 'name' and element.attrib[attr].endswith('-DELETE'):
                        element.attrib['v-on:change'] = '$parent.deleteForm($event, form_idx)'
                else:
                    attr_parts = element.attrib[attr].split('__prefix__')
                    if len(attr_parts) == 2:
                        data_bind_args[attr] = \
                            to_json(attr_parts[0]) + ' + ($parent.getFormIndex(form_idx)) + ' + to_json(attr_parts[1])
                        del element.attrib[attr]
        # sdv.dbg('data_bind_args', data_bind_args)
        if len(data_bind_args) > 0:
            for attr, vue_expr in data_bind_args.items():
                element.attrib['v-bind:' + attr] = vue_expr
    vue_template = tostring(html, method='html', encoding='utf-8', standalone=True).decode('utf-8')
    # sdv.dbg('vue_template before', vue_template)
    body_begin = vue_template.find('<body>')
    body_end = vue_template.rfind('</body>')
    if body_begin == -1 or body_end == -1:
        sdv.dbg('failed vue template', vue_template)
        raise ValueError('Vue template is not wrapped in body tag')
    formset.vue_template = '<div data-top="true">' + vue_template[body_begin + len('<body>'):body_end] + '</div>'
    # sdv.dbg('vue_template after', formset.vue_template)
    # @note: Uncomment next line to test Vue.js template for XSS.
    # alert() should execute only when new form is added into formset, not during the page load.
    # formset.vue_template += '<script language="javascript">alert(1);</script>'
    formset.uuid = 'empty-form-' + sdv.uuid4_base32()


def ko_inlineformset_factory(parent_model, model, form, **kwargs):
    if isinstance(form, DisplayModelMetaclass):
        kwargs.update({
            'extra': 0,
            'can_delete': False
        })
    formset = inlineformset_factory(parent_model, model, form, **kwargs)
    formset.set_vue_template = set_empty_template \
        if isinstance(form, DisplayModelMetaclass) \
        else set_vue_template
    return formset


def ko_generic_inlineformset_factory(model, form, **kwargs):
    if isinstance(form, DisplayModelMetaclass):
        kwargs.update({
            'extra': 0,
            'can_delete': False
        })
    formset = generic_inlineformset_factory(model, form, **kwargs)
    formset.set_vue_template = set_empty_template \
        if isinstance(form, DisplayModelMetaclass) \
        else set_vue_template
    return formset


# Layer on top of related form and it's many to one multiple formsets.
# GET / CREATE / UPDATE.
class FormWithInlineFormsets:

    FormClass = None
    FormsetClasses = None
    prefix = None

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

    # Note that 'GET' mode form can be generateed in AJAX 'POST' request,
    # thus method argument value should be hardcoded, not filled from current request.
    def prepare_form(self, form, method):
        if hasattr(form, 'set_request') and callable(form.set_request):
            form.set_request(self.request)

    def get_formset_inline_title(self, formset):
        return None

    # Note that 'GET' mode formset can be generateed in AJAX 'POST' request,
    # thus method argument value should be hardcoded, not filled from current request.
    def prepare_formset(self, formset, method):
        inline_title = self.get_formset_inline_title(formset)
        if inline_title is not None:
            formset.inline_title = inline_title
        formset.set_vue_template(self.request)
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
