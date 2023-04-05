======
Forms
======

.. _ajaxform.js: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/static/djk/js/ajaxform.js
.. _base module: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/forms/base.py
.. _BootstrapModelForm: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=bootstrapmodelform
.. _djk_sample: https://github.com/Dmitri-Sintsov/djk-sample
.. _fields_template: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?q=fields_template&type=code
.. _empty_form: https://docs.djangoproject.com/en/dev/topics/forms/formsets/#empty-form
.. _FieldRenderer class: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=fieldrenderer
.. _Formset: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=Formset&type=code
.. _FormBodyRenderer class: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=formbodyrenderer
.. _FormFieldsRenderer class: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=formfieldsrenderer
.. _FormsetRenderer: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=formsetrenderer
.. _FormViewmodel: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?q=FormViewmodel&type=code
.. _forms package: https://github.com/Dmitri-Sintsov/django-jinja-knockout/tree/master/django_jinja_knockout/forms
.. _inline formset: https://docs.djangoproject.com/en/dev/topics/forms/modelforms/#inline-formsets
.. _InlineFormRenderer: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=inlineformrenderer
.. _InlineViewmodel: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?q=InlineViewmodel&type=code
.. _ioc_vm_form(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?q=ioc_vm_form&type=code
.. _ioc_vm_inline(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?q=ioc_vm_inline&type=code
.. _layout_classes: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=layout_classes
.. _ModelForm: https://docs.djangoproject.com/en/dev/topics/forms/modelforms/
.. _RelatedFormRenderer: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=relatedformrenderer
.. _renderers module: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/forms/renderers.py
.. _Renderer: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=renderer&type=code
.. _render_fields_cls: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?q=render_fields_cls&type=code
.. _RendererModelForm: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=renderermodelform
.. _render_form(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=HTML&q=render_form
.. _.render_raw(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=render_raw
.. _renderer template samples: https://github.com/Dmitri-Sintsov/djk-sample/tree/master/club_app/jinja2/render
.. _StandaloneFormRenderer: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=standaloneformrenderer
.. _validators module: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/forms/validators.py
.. _vm_form: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=vm_form&type=code
.. _vm_inline: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=vm_inline&type=code
.. _vm_renderers module: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/forms/vm_renderers.py

forms module is split into `forms package`_ with the following submodules:

* `base module`_
* `renderers module`_
* `validators module`_
* `vm_renderers module`_

.. _forms_renderers:

Renderers
---------

See `renderers module`_ for source code.

django-jinja-knockout uses `Renderer`_ derived classes to display Django model forms and inline formsets. Recent
versions of Django utilize renderers with templates to display form field widgets. There are some packages that use
renderers with templates to generate the whole forms. In addition to that, django-jinja-knockout uses renderers to
generate the formsets with the related forms, which follows Django DRY approach. It's possible to override the displayed
HTML partially or completely.

The base `Renderer`_ class is located in `tpl` module and is not tied to any field / form / formset. It may be used in
any template context.

The instance of `Renderer`_ holds the following related data:

* ``self.obj`` - a Python object that should be displayed (converted to HTML / string);
* ``.get_template_name()`` - method to obtain a DTL or Jinja2 template name, which could be hardcoded via ``.template``
  class attribute, or can be dynamically generated depending on the current value of ``self.obj``.

  See `FieldRenderer`_ for example of dynamic template name generation based on ``self.obj`` value, where ``self.obj``
  is an instance of model form field;
* ``self.context`` - a Python dict with template context that will be passed to the rendered template;

The instance of `Renderer`_ encapsulates the object and the template with it's context to convert ``self.obj`` to
string / HTML representation. Basically, it's an extensible string formatter. See ``.__str__()`` and ``.__call__()``
methods of `Renderer`_ class for the implementation.

The built-in renderers support both ordinary input fields POST forms (non-AJAX and AJAX versions) and the display forms
(read-only forms): `Displaying read-only "forms"`_.

Multiple objects should not re-use the same `Renderer`_ derived instance: instead the renderers of nested objects are
nested into each other (object composition). Here is the complete list of nested hierarchies of the built-in renderers:

.. highlight:: jinja

FieldRenderer
~~~~~~~~~~~~~
Renders model form field.

Default `FieldRenderer class`_ instance attached to each form field will apply bootstrap HTML to the form fields / form
field labels. It supports both input fields POST forms (non-AJAX and AJAX versions) and the display forms (read-only forms):
`Displaying read-only "forms"`_. Templates are chosen dynamically depending on the field type.

The instance of `FieldRenderer class`_ is attached to each visible form field. By default the form fields are rendered by
`FormFieldsRenderer`_ this way::

    {% for field in form.visible_fields() -%}
        {{ field.djk_renderer() }}
    {% endfor -%}

It's possible to render "raw" field with::

    {{ field }}

or formatted field as::

    <div>{{ form.my_field.djk_renderer() }}</div>

and to render the list of selected fields with::

    {{ render_fields(form, 'field1', 'fieldN') }}

FormBodyRenderer
~~~~~~~~~~~~~~~~
Renders only the form body, no ``<form>`` tag, similar to how Django converts form to string.

* `FormBodyRenderer`_

  * `FormFieldsRenderer`_

    * [`FieldRenderer`_ (1), ... `FieldRenderer`_ (n)]

In Jinja2 template call `render_form()`_ template context function::

    {{ render_form(request, 'body', form, opts) }}

See `FormBodyRenderer class`_. See `opts argument`_.

FormFieldsRenderer
~~~~~~~~~~~~~~~~~~

Renders the form fields, by default one by one via their specified order. See `Rendering customization`_ how to override
the default layout of fields.

* `FormFieldsRenderer`_

  * [`FieldRenderer`_ (1), ... `FieldRenderer`_ (n)]

In Jinja2 template to call form fields renderer::

    {{ form.djk_renderer['fields']() }}

or::

    {{ render_form(request, 'fields', form, opts) }}

See `FormFieldsRenderer class`_. See `opts argument`_.

StandaloneFormRenderer
~~~~~~~~~~~~~~~~~~~~~~
Standalone form renderer includes the whole form with the body (fields, field labels), ``<form>`` tag, wrapped into
bootstrap card tags. It's a complete HTML form with separate visual look which could be directly submitted to view.

Renders the instance of model form:

* `StandaloneFormRenderer`_

  * `FormBodyRenderer`_

    * `FormFieldsRenderer`_

      * [`FieldRenderer`_ (1), ... `FieldRenderer`_ (n)]

In Jinja2 template call :ref:`macros_bs_form` macro or call `render_form()`_ template context function::

    {{ render_form(request, 'standalone', form, {
        'action': action,
        'opts': opts,
        'method': method,
    }) }}

Rendering FormWithInlineFormsets
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
To render `FormWithInlineFormsets class`_, in Jinja2 template call :ref:`macros_bs_inline_formsets` macro, which calls
the following hierarchy of renderers:

* `RelatedFormRenderer`_

  * `FormBodyRenderer`_

    * `FormFieldsRenderer`_

      * [`FieldRenderer`_ (1), ... `FieldRenderer`_ (n)]

* `FormsetRenderer`_ (1)

  * `InlineFormRenderer`_ (1)

    * `FormBodyRenderer`_ (1)

      * `FormFieldsRenderer`_ (1)

        * [`FieldRenderer`_ (1), ... `FieldRenderer`_ (n)]

  * `InlineFormRenderer`_ (n)

    * `FormBodyRenderer`_ (n)

      * `FormFieldsRenderer`_ (n)

        * [`FieldRenderer`_ (1), ... `FieldRenderer`_ (n)]

* `FormsetRenderer`_ (n)

  * `InlineFormRenderer`_ (n)

    * `FormBodyRenderer`_ (n)

      * `FormFieldsRenderer`_ (n)

        * [`FieldRenderer`_ (1), ... `FieldRenderer`_ (n)]

Note that is the composition hierarchy of instances, not a class inheritance hierarchy.

Single formset is rendered with the following call::

    {{ formset.djk_renderer() }}

.. _forms_opts:

opts argument
~~~~~~~~~~~~~
``opts`` dict argument optionally passed to :ref:`macros_bs_form` / :ref:`macros_bs_inline_formsets` macros /
`render_form()`_ template context function / form renderers support the following keys:

* ``class`` - CSS class of bootstrap panel form wrapper;
* ``is_ajax`` - bool, whether the form should be submitted via AJAX - by default is `False`; see `AJAX forms processing`_
  for more info;
* `layout_classes`_ - change default Bootstrap grid layout width for field labels / field inputs. See
  :ref:`macros_layout_classes` for more details;
* ``submit_text`` - text of form submit button; if not defined, no button will be displayed;
* ``title`` - text of bootstrap panel title form wrapper; if not defined, no title will be displayed;

Some attributes are used only by some renderers:

* ``inline_title`` - the title of inline form, which could be different from ``title`` of related / standalone form;
* ``table_classes`` - CSS classes of form table wrapper for `Displaying read-only "forms"`_;

.. highlight:: python

Rendering customization
~~~~~~~~~~~~~~~~~~~~~~~

The most simplest way to customize form is to override / extend one of the default model form templates via
overriding `RendererModelForm`_ template attributes, for example to change inline form wrapper::

    class EquipmentForm(RendererModelForm):

        inline_template = 'inline_equipment_form.htm'

To change field templates one should override `RendererModelForm`_ ``Meta`` class ``field_templates`` dict attribute::

    class ClubMemberDisplayForm(WidgetInstancesMixin, RendererModelForm, metaclass=DisplayModelMetaclass):

        inline_template = 'inline_form_chevron.htm'
        fields_template = 'form_fields_club_group_member_display.htm'

        class Meta:

            model = ClubMember

            fields = [
                'role',
                'profile',
                'note',
            ]
            field_templates = {
                'role': 'field_items.htm',
                'note': 'field_items.htm',
            }

Since v2.2.0, it's possible to customize fields layout without altering default form body by overriding:

* either `fields_template`_ form attribute (example above)
* or ``BootstrapModelForm`` ``Meta`` class `render_fields_cls`_ attribute only (example below).

Custom `fields_template`_ can include non-modelform fields and / or custom :ref:`clientside_components`.

To change formset template, one should set the value of formset class attribute like this::

    ClubEquipmentFormSet = ko_inlineformset_factory(
        Club, Equipment, form=EquipmentForm, extra=0, min_num=1, max_num=5, can_delete=True
    )
    ClubEquipmentFormSet.template = 'club_equipment_formset.htm'

It's also possible to use raw built-in rendering, which does not uses Jinja2 templates. To achieve that, set the
template name value to empty string ''. In such case renderer instance `.render_raw()`_ method will be called to convert
``self.obj`` with it's current context to the string. For more complex cases one may override `.render_raw()`_ method
via inherited renderer class.

To use custom renderer classes with model forms, one may override `BootstrapModelForm`_ ``Meta`` class default renderer
attributes with the extended classes::

    class MyModelForm(BootstrapModelForm):

        class Meta(BootstrapModelForm.Meta):
            render_fields_cls = MyFormFieldsRenderer
            # render_body_cls = MyFormBodyRenderer
            # render_inline_cls = MyInlineFormRenderer
            # render_related_cls = MyRelatedFormRenderer
            render_standalone_cls = MyStandaloneFormRenderer

but in most of the cases overriding the template names is enough.

See `renderer template samples`_ in ``djk-sample`` project for the example of simple customization of default templates.

.. _forms_base:

Forms base module
-----------------

See `base module`_ source code.

RendererModelForm
~~~~~~~~~~~~~~~~~

While it's possible to use renderers with ordinary Django ``ModelForm`` class, the recommended way is to derive model
form class from `RendererModelForm`_ class::

    from django_jinja_knockout.forms import RendererModelForm

    class ProfileForm(RendererModelForm):

        class Meta:
            model = Profile
            exclude = ('age',)
            fields = '__all__'

By default, in case there are no custom templates / no custom renderers specified, `render_form()`_ will use the default
renderers from `BootstrapModelForm`_ ``Meta`` class, which would stylize model form with Bootstrap attributes.

`RendererModelForm`_ class ``.has_saved_instance()`` method used to check whether current Django ModelForm has the bound
and saved instance.

AJAX forms processing
---------------------

.. highlight:: jinja

``django_jinja_knockout`` includes ``bs_form()`` and ``bs_inline_formsets()`` Jinja2 macros, which generate Bootstrap
styled Django ModelForms. Usual form generation syntax is::

    {% extends 'base_min.htm' %}
    {% from 'bs_form.htm' import bs_form with context %}

    {% block main %}

    {{ bs_form(form=form, action=url('my_url_name'), opts={
        'class': 'form_css_class',
        'title': page_context.get_view_title(),
        'submit_text': 'My button'
    }) }}

    {% endblock main %}

.. highlight:: python

If your class-based views extends one of the following view classes::

    django_jinja_knockout.views.FormWithInlineFormsetsMixin
    django_jinja_knockout.views.InlineCreateView
    # Next view is suitable both for updating ModelForms with inline formsets
    # as well for displaying read-only forms with forms.DisplayModelMetaclass.
    django_jinja_knockout.views.InlineCrudView

.. highlight:: jinja

then, in order to have the form processed as AJAX form, add ``'is_ajax': True`` key to ``bs_form()`` /
``bs_inline_formsets()`` Jinja2 macro call::

    {{ bs_form(form=form, action=url('my_url_name'), opts={
        'class': 'form_css_class',
        'is_ajax': True,
        'title': page_context.get_view_title(),
        'submit_text': 'My button'
    }) }}

AJAX response and success URL redirection will be automatically generated. Form errors will be displayed in case there
is any. Such form will behave very similarly to usual non-AJAX submitted form with the following advantages:

1. AJAX response saves HTTP traffic.
2. Instead of just redirecting to ``success_url``, one may perform custom actions, including displaying BootstrapDialog
   alerts and confirmations.
3. `ajaxform.js`_ includes Bootstrap progress bar when the form has file inputs. So when large files are uploaded, the
   progress indicator will be updated, instead of just waiting until the request completes.

.. highlight:: python

At client-side both successful submission of form and form errors are handled by lists of client-side viewmodels.
See :doc:`viewmodels` for more detail.

At server-side (Django), the following code of ``FormWithInlineFormsetsMixin`` is used to process AJAX-submitted form
errors::

    def get_form_error_viewmodel(self, form):
        for bound_field in form:
            return {
                'view': 'form_error',
                'class': 'danger',
                'id': bound_field.auto_id,
                'messages': list((escape(message) for message in form.errors['__all__']))
            }
        return None

    def get_field_error_viewmodel(self, bound_field):
        return {
            'view': 'form_error',
            'id': bound_field.auto_id,
            'messages': list((escape(message) for message in bound_field.errors))
        }

and the following code returns success viewmodels::

    def get_success_viewmodels(self):
        # @note: Do not just remove 'redirect_to', otherwise deleted forms will not be refreshed
        # after successful submission. Use as callback for view: 'alert' or make your own view.
        return vm_list({
            'view': 'redirect_to',
            'url': self.get_success_url()
        })

In instance of ``FormWithInlineFormsetsMixin``, ``self.forms_vms`` and ``self.fields_vms`` are the instances of
``vm_list()`` defined in ``viewmodels.py``. These instances accumulate viewmodels (each one is a simple Python dict
with ``'view'`` key) during ModelForm / inline formsets validation.

Actual AJAX ModelForm response success / error viewmodels can be overridden in child class, if needed.

These examples shows how to generate dynamic lists of client-side viewmodels at server-side. ``viewmodels.py``
defines methods to alter viewmodels in already existing ``vm_list()`` instances.

.. _forms_read_only:

Displaying read-only "forms"
----------------------------

If form instance was instantiated from ``ModelForm`` class with ``DisplayModelMetaclass`` metaclass::

    from django_jinja_knockout.forms import BootstrapModelForm, DisplayModelMetaclass

    from my_app.models import Profile

    class ProfileDisplayForm(BootstrapModelForm, metaclass=DisplayModelMetaclass):

        class Meta:
            model = Profile
            exclude = ('age',)
            fields = '__all__'

.. highlight:: jinja

one may use empty string as submit url value of ``action=''`` argument, to display ModelForm instance as read-only
Bootstrap table::

    {% extends 'base_min.htm' %}
    {% from 'bs_inline_formsets.htm' import bs_inline_formsets with context %}

    {{
        bs_inline_formsets(related_form=form, formsets=[], action='', opts={
            'class': 'project',
            'title': form.get_title(),
        })
    }}

.. highlight:: python

Such "forms" do not contain ``<input>`` elements and thus cannot be submitted. Additionally you may inherit
from ``UnchangeableModelMixin``::

    from django_jinja_knockout.forms import UnchangeableModelMixin

to make sure bound model instances cannot be updated via custom script submission (eg. Greasemonkey).

In case related many to one inline formset ModelForms should be included into read-only "form", define their
``ModelForm`` class with ``metaclass=DisplayModelMetaclass`` and specify that class as ``form`` kwarg of
``inlineformset_factory()``::

    from django_jinja_knockout.forms import BootstrapModelForm, DisplayModelMetaclass, set_empty_template

    from my_app.models import Profile

    class MemberDisplayForm(BootstrapModelForm, metaclass=DisplayModelMetaclass):

        class Meta:
            model = Profile
            fields = '__all__'

    MemberDisplayFormSet = inlineformset_factory(
        Project, Member,
        form=MemberDisplayForm, extra=0, min_num=1, max_num=2, can_delete=False
    )
    MemberDisplayFormSet.set_knockout_template = set_empty_template


``DisplayText`` read-only field widget automatically supports lists as values of ``models.ManyToManyField`` fields,
rendering these as Bootstrap "list groups".

Custom rendering of DisplayText form widgets
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Sometimes read-only "form" fields contain complex values, such as dates, files and foreign keys. In such case default
rendering of ``DisplayText`` form widgets, set up by ``DisplayModelMetaclass``, can be customized via manual ModelForm
field definition with ``get_text_method`` argument callback::

    from django_jinja_knockout.forms import BootstrapModelForm, DisplayModelMetaclass, WidgetInstancesMixin
    from django_jinja_knockout.widgets import DisplayText
    from django.utils.html import format_html
    from django.forms.utils import flatatt

    from my_app.models import ProjectMember

    class ProjectMemberDisplayForm(WidgetInstancesMixin, BootstrapModelForm, metaclass=DisplayModelMetaclass):

        class Meta:

            def get_profile(self, value):
                return format_html(
                    '<a {}>{}</a>',
                    flatatt({'href': reverse('profile_detail', profile_id=self.instance.pk)}),
                    self.instance.user
                )

            model = ProjectMember
            fields = '__all__'
            widgets = {
                'profile': DisplayText(get_text_method=get_profile)
            }

``WidgetInstancesMixin`` is used to make model ``self.instance`` available in ``DisplayText`` widget callbacks.
It enables access to all fields of current model instance in ``get_text_method`` callback, in addition to ``value`` of
the current field.

Note that ``get_text_method`` argument will be re-bound from form ``Meta`` class to instance of ``DisplayText`` widget.

``DisplayText`` field widget supports selective skipping of table rows rendering via setting widget instance property
``skip_output`` to ``True``::

    # ... skipped imports ...
    class ProjectMemberDisplayForm(WidgetInstancesMixin, BootstrapModelForm, metaclass=DisplayModelMetaclass):

        class Meta:

            def get_profile(self, value):
                if self.instance.is_active:
                    return format_html(
                        '<a {}>{}</a>',
                        flatatt({'href': reverse('profile_detail', profile_id=self.instance.pk)}),
                        self.instance.user
                    )
                else:
                    # Do not display inactive user profile link in table form.
                    self.skip_output = True
                    return None

            model = ProjectMember
            fields = '__all__'
            widgets = {
                'profile': DisplayText(get_text_method=get_profile)
            }

Customizing string representation of scalar values is performed via ``scalar_display`` argument of ``DisplayText``
widget::

    class ProjectMemberDisplayForm(WidgetInstancesMixin, BootstrapModelForm, metaclass=DisplayModelMetaclass):

        class Meta:
            widgets = {
                'state': DisplayText(
                    scalar_display={True: 'Allow', False: 'Deny', None: 'Unknown', 1: 'One'}
                ),
            }

Optional ``scalar_display`` and ``get_text_method`` arguments of ``DisplayText`` widget can be used together.

Optional ``get_text_fn`` argument of ``DisplayText`` widget allows to use non-bound functions to generate text of the
widget. It can be used with ``scalar_display`` argument, but not with ``get_text_method`` argument.

Dynamically adding new related formset forms
--------------------------------------------

``bs_inline_formsets()`` macro with conjunction of ``django_jinja_knockout.forms.set_knockout_template()`` monkey
patching formset method and client-side ``formsets.js`` script supports dynamic adding / removing of new formset forms
(so-called `empty_form`_) via Knockout.js custom binding to `Formset`_.

.. highlight:: javascript

Instead of simply storing ``formset.empty_form`` value then cloning it via jQuery and performing
``String.prototype.replace()`` to set form index::

    $('#form_set').append($('#empty_form').html().replace(/__prefix__/g, form_idx));

Knockout.js bindings offer the following advantages:

* Imagine unintentional or malicious content where ``__prefix__`` substring appears in `empty_form`_ representation
  outside form inputs DOM attribute values. ``set_knockout_template()`` of ``django_jinja_knockout.forms`` ensures that
  only ``__prefix__`` substring in specified DOM attributes is bound to be changed by using ``lxml`` to convert
  `empty_form`_ naive string prefixes to proper Knockout.js ``data-bind`` attribute values.
* Knockout.js automatically re-calculates form prefix index when one of newly dynamically added formset
  forms are deleted before submitting.
* Knockout.js translated version of `empty_form`_ template is stored in ``bs_inline_formsets()`` Jinja2 macro as
  the value of hidden textarea, which allows to dynamically add field widgets with inline scripts.

AFAIK it's the only solution to add client-side `empty_form`_ dynamically without possible XSS attacks. If there are
another such solutions, please let me know.

.. highlight:: python

To be able to add / remove new empty forms use monkey patching of inline formset class like this in ``forms.py``::

    from django.forms.models import BaseInlineFormSet, inlineformset_factory
    from django_jinja_knockout.forms import BootstrapModelForm, set_knockout_template, FormWithInlineFormsets

    from my_app.models import Project

    class ProjectForm(BootstrapModelForm):

        class Meta:
            model = Project
            fields = '__all__'

        def clean(self):
            super().clean()
            # Put form field validation here.

    class ProjectMemberFormSetDef(BaseInlineFormSet):

        def clean(self):
            super().clean()
            for form in self.forms:
                if form.cleaned_data.get('DELETE'):
                    continue
                # Put inline formset form field validation here.
                # Warning! May be None, thus dict.get() is used.
                my_field_value = form.cleaned_data.get('my_field')

    ProjectMemberFormSet = inlineformset_factory(
        Project, ProjectMember,
        form=ProjectForm, formset=ProjectMemberFormSetDef, extra=0, min_num=1, max_num=2, can_delete=True
    )
    ProjectMemberFormSet.set_knockout_template = set_knockout_template

    class ProjectFormWithInlineFormsets(FormWithInlineFormsets):

        FormClass = ProjectForm
        FormsetClasses = [ProjectMemberFormSet]

In your class-based views.py::

    from django_jinja_knockout.views import InlineCreateView, InlineDetailView

    class ProjectCreate(InlineCreateView):

        form_with_inline_formsets = ProjectFormWithInlineFormsets
        template_name = 'project_form.htm'

    class ProjectUpdate(InlineDetailView):

        form_with_inline_formsets = ProjectFormWithInlineFormsets
        template_name = 'project_form.htm'

.. _FormWithInlineFormsets:

FormWithInlineFormsets class
~~~~~~~~~~~~~~~~~~~~~~~~~~~~
This class encapsulates zero or one related `ModelForm`_ with zero / one / many related `inline formset`_.

``ProjectFormWithInlineFormsets`` derives from  ``forms.FormWithInlineFormsets`` class that serves as an intermediate
layer between related form with inline formsets and Django view. It populates form data, validates form, formsets and
non-form errors for both the related form and the inline formsets, used with traditional and AJAX views.

Besides class-based views (``InlineCreateView``, ``InlineDetailView``, ``FormWithInlineFormsetsMixin``) it can be used
in traditional functional views as well::

    ff = ProjectFormWithInlineFormsets(request, create=True)
    if request.method == 'POST':
        if ff.save() is None:
            # Show form errors.
            return render(request, 'project_template.htm', {
                'form': ff.form,
                'formsets': ff.formsets
            })
        else:
            # Form with inline formsets was saved successfully.
            return redirect('project_save_success')
    else:
        # Display initial form for project instance (project update form).
        project = Project.objects.filter(user=user).first()
        ff.get(project)
        return render(request, 'project_template.htm', {
            'form': ff.form,
            'formsets': ff.formsets,
        })


forms vm_renderers module
-------------------------
Since v2.2.0, AJAX rendering of `ModelForm`_ and `FormWithInlineFormsets`_ are implemented via separate
`vm_renderers module`_.

It includes `FormViewmodel`_ and `InlineViewmodel`_ classes, which are used to render forms submitted with
:ref:`viewmodels_ajax_actions`.

It's possible to override the default rendering of AJAX actions `ModelForm`_ and / or `FormWithInlineFormsets`_ by
extending `FormViewmodel`_ / `InlineViewmodel`_ classes, then overriding AJAX view's `vm_form`_ / `vm_inline`_
attributes::

    from django_jinja_knockout.forms.vm_renderers import FormViewmodel

    # ... skipped ...

    class UserChangeFormViewmodel(FormViewmodel):

        def get_action_local_name(self):
            action_local_name = super().get_action_local_name()
            action_local_name = f'{action_local_name} user {self.instance}'
            return action_local_name

        def get_verbose_name(self):
            verbose_names = model_fields_verbose_names(self.instance)
            verbose_names['full_name'] = 'Full name'
            str_fields = self.get_object_desc(self.instance)
            str_fields['full_name'] = f'{str_fields.pop("first_name", "")} {str_fields.pop("last_name", "")}'.strip()
            if str_fields['full_name'] == '':
                del str_fields['full_name']
            return tpl.print_bs_badges(str_fields, show_keys=1, i18n=verbose_names)


    class UserChangeView(ModelFormActionsView):

        form = UserPreferencesForm
        # Overriding vm_form is optional and is not required:
        vm_form = UserChangeFormViewmodel

and / or calling AJAX view's `ioc_vm_form()`_ / `ioc_vm_inline()`_ methods, which may be used in custom AJAX form actions::

    class ClubEquipmentGrid(EditableClubGrid):

        # ... skipped ...
        form = ClubForm
        form_with_inline_formsets = None

        def get_actions(self):
            actions = super().get_actions()
            actions['built_in']['save_equipment'] = {}
            actions['iconui']['add_equipment'] = {
                'localName': _('Add club equipment'),
                'css': 'iconui-wrench',
            }
            return actions

        # Creates AJAX ClubEquipmentForm bound to particular Club instance.
        def action_add_equipment(self):
            club = self.get_object_for_action()
            if club is None:
                return vm_list({
                    'view': 'alert_error',
                    'title': 'Error',
                    'message': 'Unknown instance of Club'
                })
            equipment_form = ClubEquipmentForm(initial={'club': club.pk})
            # Generate equipment_form viewmodel
            vms = self.ioc_vm_form(
                form=equipment_form
            )(
                form_action='save_equipment'
            )
            return vms

In more complex scenarios, calling `ioc_vm_form()`_ / `ioc_vm_inline()`_ in :ref:`viewmodels_ajax_actions` handlers
allows to specify the source action and / or to override the form action, like this example when one view handles
different Django models::

    class ClubGrid(KoGridView):
        form = ClubForm
        # ... skipped ...

        # Custom action to show bound MemberForm, not ClubForm.
        def action_edit_owner_form(self):
            club = self.get_object_for_action()
            obj = club.member_set.get(role='owner')
            form = MemberForm(instance=obj)
            # Generates different model instance AJAX form:
            return self.ioc_vm_form(
                form=form,
                source_action=self.current_action_name,
                instance=obj,
            )(
                form_action='save_owner_form',
                action_query={
                    # Saved ModelForm object pk.
                    'pk_val': obj.pk,
                }
            )

See `djk_sample`_ demo project for the complete example.
