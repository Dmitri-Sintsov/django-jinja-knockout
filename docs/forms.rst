======
Forms
======

AJAX forms processing
---------------------

.. highlight:: jinja

``django_jinja_knockout`` includes ``bs_form()`` and ``bs_inline_formsets()`` Jinja2 macros, which generate Bootstrap3
styled Django ModelForms. Usual form generation syntax is::

    {% extends 'base_min.htm' %}
    {% from 'bs_form.htm' import bs_form with context %}

    {% block main %}

    {{ bs_form(form=form, action=url('my_url_name'), opts={
        'class': 'form_css_class',
        'title': request.view_title,
        'submit_text': 'My button'
    }) }}

    {% endblock main %}

.. highlight:: python

If your class-based views extends one of the following view classes::

    django_jinja_knockout.views.FormWithInlineFormsetsMixin
    django_jinja_knockout.views.InlineCreateView
    # Next view is suitable both for updating ModelForms with inline formsets
    # as well for displaying read-only forms with forms.DisplayModelMetaclass.
    django_jinja_knockout.views.InlineDetailView

.. highlight:: jinja

then, in order to have the form processed as AJAX form, it's enough to add ``'is_ajax': True`` key to ``bs_form()`` /
``bs_inline_formsets()`` Jinja2 macro call::

    {{ bs_form(form=form, action=url('my_url_name'), opts={
        'class': 'form_css_class',
        'is_ajax': True,
        'title': request.view_title,
        'submit_text': 'My button'
    }) }}

AJAX response and success URL redirection will be automatically generated. Form errors will also be displayed in case
there is any. Such form will behave very similarly to usual non-AJAX submitted form with three significant advantages:

1. AJAX response saves HTTP traffic.
2. Instead of just redirecting to ``success_url``, one may perform custom actions, including displaying BootstrapDialog
   alerts and confirmations.
3. app.js also includes Bootstrap 3 progress bar when form has file inputs. So when large files are uploaded, there
   will be progress indicator updated, instead of just waiting when request completes.

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
Bootstrap 3 table::

    {% extends 'base_min.htm' %}
    {% from 'bs_inline_formsets.htm' import bs_inline_formsets with context %}

    {% call(kwargs)
    bs_inline_formsets(related_form=form, formsets=[], action='', html={
        'class': 'project',
        'title': form.instance,
        'submit_text': 'My submit button'
    }) %}

    {% endcall %}

.. highlight:: python

Such "forms" do not contain ``<input>`` elements and thus cannot be submitted, additionally you may use::

    django_jinja_knockout.forms.UnchangableModelMixin

to make sure bound model instances cannot be updated via custom script submission (Greasemonkey?).

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
rendering these as Bootstrap 3 list-groups.

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
It allows to access all fields of current model instance in ``get_text_method`` callback, in addition to ``value`` of
current field.

Note that ``get_text_method`` argument will be re-bound from form ``Meta`` class to instance of ``DisplayText`` widget.

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
(so-called ``empty_form``) via Knockout.js custom binding ``App.ko.formset``.

.. highlight:: javascript

Instead of simply storing ``formset.empty_form`` value then cloning it via jQuery and performing
``String.prototype.replace()`` to set form index::

    $('#form_set').append($('#empty_form').html().replace(/__prefix__/g, form_idx));

Knockout.js bindings offer the following advantages:

* Imagine unintentional or malicious content where ``__prefix__`` substring appears in ``empty_form`` representation
  outside form inputs DOM attribute values. ``set_knockout_template()`` of ``django_jinja_knockout.forms`` ensures that
  only ``__prefix__`` substring in specified DOM attributes is bound to be changed by using ``lxml`` to convert
  ``empty_form`` naive string prefixes to proper Knockout.js ``data-bind`` attribute values.
* Knockout.js automatically re-calculates form prefix index when one of newly dynamically added formset
  forms are deleted before submitting.
* Knockout.js translated version of empty_form template is stored in ``bs_inline_formsets()`` Jinja2 macro as value of
  hidden textarea, which   allows to dynamically add field widgets with inline scripts.

AFAIK it's the only solution to add client-side ``empty_form`` dynamically without possible XSS attacks. If there are
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

FormWithInlineFormsets class
~~~~~~~~~~~~~~~~~~~~~~~~~~~~
There is extra step of deriving ``ProjectFormWithInlineFormsets`` from  ``forms.FormWithInlineFormsets`` class because
that class serves as intermediate layer between form with inline formsets and Django views. Besides class-based views
(``InlineCreateView``, ``InlineDetailView``, ``FormWithInlineFormsetsMixin``) it can be used in traditional functional
views as well::

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
