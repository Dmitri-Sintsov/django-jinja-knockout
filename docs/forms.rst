======
Forms
======

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

    class ProjectForm(BootstrapModelForm):

        class Meta:
            model = Project
            fields = '__all__'

        def clean(self):
            super().clean()

    class ProjectMemberFormSetDef(BaseInlineFormSet):

        def clean(self):
            super().clean()
            for form in self.forms:
                if form.cleaned_data.get('DELETE'):
                    continue
                # Warning! May be None, thus dict.get() is used.
                type = form.cleaned_data.get('type')

    ProjectMemberFormSet = inlineformset_factory(
        Project, ProjectMember,
        form=ProjectForm, formset=ProjectMemberFormSetDef, extra=0, min_num=1, max_num=2, can_delete=True
    )
    ProjectMemberFormSet.set_knockout_template = set_knockout_template

    class ProjectFormWithInlineFormsets(FormWithInlineFormsets):

        FormClass = ProjectForm
        FormsetClasses = [ProjectMemberFormSet]
