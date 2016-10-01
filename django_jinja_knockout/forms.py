from .utils import sdv
from io import StringIO
import lxml.html
from lxml.etree import tostring
from django.conf import settings
from .context_processors import LAYOUT_CLASSES
from django.db import transaction
from django import forms
from django.forms.models import BaseInlineFormSet, ModelFormMetaclass, inlineformset_factory
from django.template import loader as tpl_loader
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


class UnchangableModelMixin():

    def has_changed(self):
        # Display forms never change.
        return False


# Metaclass used to create read-only forms (display models). #
class DisplayModelMetaclass(ModelFormMetaclass):

    def __new__(mcs, name, bases, attrs):
        if attrs is None:
            attrs = {}
        bases = bases + (UnchangableModelMixin,)
        attrs.update({'formfield_callback': display_model_formfield_callback})
        return ModelFormMetaclass.__new__(mcs, name, bases, attrs)


class WidgetInstancesMixin(forms.ModelForm):

    def set_request(self, request):
        for name, field in self.fields.items():
            field.widget.request = request

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if hasattr(self, 'instance'):
            for name, field in self.fields.items():
                field.widget.instance = self.instance


# Used to generate fake empty_form template for display models formsets where real knockout.js template is unneeded. #
def set_empty_template(formset, request, html={}):
    return None


# Monkey-patching methods for formset to support knockout.js version of empty_form #
def set_knockout_template(formset, request, html={}):
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
    for element in html.xpath("//*[(@id and @name) or @for]"):
        # sdv.dbg('element', element)
        data_bind_args = []
        for attr in ['for', 'id', 'name']:
            if attr in element.attrib:
                attr_parts = element.attrib[attr].split('__prefix__')
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


# Layer on top of related form and it's many to one multiple formsets.
# GET / CREATE / UPDATE.
class FormWithInlineFormsets(object):

    FormClass = None
    FormsetClasses = None

    def __init__(self, request, create=False):
        self.model = None
        self.form = None
        self.formsets = None
        self.request = request
        # True: create, False: update. Non-destructive by default.
        self.create = create

    def get_form_class(self):
        return self.__class__.FormClass

    def get_formset_classes(self):
        return self.__class__.FormsetClasses

    def get_formset_initial(self, formset_class):
        return None

    def get_model_when_form_invalid(self):
        return None

    def prepare_form(self, form):
        if hasattr(form, 'set_request') and callable(form.set_request):
            form.set_request(self.request)

    def get_formset_inline_title(self, formset):
        return None

    def prepare_formset(self, formset):
        inline_title = self.get_formset_inline_title(formset)
        if inline_title is not None:
            formset.inline_title = inline_title
        formset.set_knockout_template(self.request)
        formset.request = self.request
        for form in formset:
            if hasattr(form, 'set_request') and callable(form.set_request):
                form.set_request(self.request)

    def get_form(self):
        form_class = self.get_form_class()
        if form_class is not None:
            self.form = form_class(instance=self.model)
            self.prepare_form(self.form)

    def post_form(self):
        form_class = self.get_form_class()
        if form_class is not None:
            form = form_class(self.request.POST, self.request.FILES, instance=self.model)
            self.prepare_form(form)
            self.form = form

    def get_formsets(self):
        formset_classes = self.get_formset_classes()
        self.formsets = [
            formset_class(instance=self.model, initial=self.get_formset_initial(formset_class))
            for formset_class in formset_classes
        ]
        for formset in self.formsets:
            self.prepare_formset(formset)

    def post_formsets(self):
        formset_classes = self.get_formset_classes()
        self.formsets = [
            formset_class(
                self.request.POST, self.request.FILES, instance=self.model
            ) for formset_class in formset_classes
        ]
        for formset in self.formsets:
            self.prepare_formset(formset)

    def save_model(self):
        self.model = self.form.save()

    def save_m2m(self):
        if hasattr(self.form, 'save_m2m') and callable(self.form.save_m2m):
            self.form.save_m2m()

    def rollback_formsets(self):
        if self.create:
            if self.model is not None:
                # Do not create model instance when formsets are invalid.
                self.model.delete()

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
        self.model = instance
        self.post_form()
        if self.form is not None:
            if not self.form.is_valid():
                self.model = self.get_model_when_form_invalid()
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
        return self.model

    def get(self, instance=None):
        self.model = instance
        self.get_form()
        self.get_formsets()


# Currently is unused, because 'form' kwarg is passed to inlineformset_factory() instead. #
class InlineFormSet(BaseInlineFormSet):

    FormClass = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.form = self.get_form

    def get_form(self, **defaults):
        return self.__class__.FormClass(**defaults)


# Mixed to BaseInlineFormset to use different form classes for already existing model objects
# and for newly added ones (empty_form).
# May be used with DisplayModelMetaclass to display existing forms as read-only, while
# making newly added ones editable.
class SeparateInitialFormMixin(object):

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
        return self.__class__.InitialForm(**defaults) \
            if self.form_index < self.initial_form_count() \
            else self.__class__.EmptyForm(**defaults)

    # Used during GET at client-side.
    @property
    def empty_form(self):
        form = self.__class__.EmptyForm(
            auto_id=self.auto_id,
            prefix=self.add_prefix('__prefix__'),
            empty_permitted=True,
        )
        self.add_fields(form, None)
        return form

    def _construct_form(self, i, **kwargs):
        self.form_index = i
        return super()._construct_form(i, **kwargs)
