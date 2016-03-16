==============
Jinja2 macros
==============

.. highlight:: jinja

ModelForms
----------

``bs_form()`` macro allows to generate html representation of ``ModelForm``::

    {% extends 'base_min.htm' %}
    {% from 'bs_form.htm' import bs_form with context %}

    {% block main %}

    {{ bs_form(form=form, action=url('my_url_name'), opts={
        'class': 'form_css_class',
        'title': request.view_title,
        'submit_text': 'My button'
    }) }}

    {% endblock main %}

Note that the ``bs_form()`` macro also generates html ``<form>`` tag and wraps the whole form into Bootstrap 3 panel
with the heading / body. If you want to generate form body only (usual Django approach), use ``bs_form_body()`` macro
instead::

    {{ bs_form_body(form) }}

.. highlight:: python

Note that to have Bootstrap3 attributes to be applied to form fields it's also advisable to inherit ModelForm class from
``BootstrapModelForm``::

    from django_jinja_knockout.forms import BootstrapModelForm

    class ProfileForm(BootstrapModelForm):

        class Meta:
            model = Profile
            exclude = ('age',)
            fields = '__all__'

Inline formsets
---------------
``bs_inline_formsets()`` is a macro that supports html rendering of one or zero ``ModelForm`` with one or multiple one
to many related inline formsets. It also supports two types of rendering layouts:

#. ``<div>`` layout for real changable submittable forms.
#. html ``<table>`` layout primarily used to display read-only "forms" (see :doc:`forms`).

Also it has support for inserting custom content between individual forms of formsets.

.. highlight:: jinja

Example of form with inline formsets rendering::

    {% call(kwargs)
    bs_inline_formsets(related_form=form, formsets=formsets, action=url('project_candidate_add', project_id=project.pk), html={
        'class': 'project',
        'is_ajax': True,
        'title': request.view_title,
        'submit_text': 'Add candidate'
    }) %}

Note that in this case form with formsets will be submitted and processed via AJAX POST request / response. Also note
unused ``call(kwargs)`` argument. Due to structure of ``bs_inline_formsets()`` it's required but is unused in this
simplified example.

Changing bootstrap grid layout
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
One may use ``'layout_classes'`` key of the following macros ``highlighted`` arguments:

#. bs_inline_formsets( related_form, formsets, action, ``html`` )
#. bs_form_body( form, ``field_classes`` )
#. bs_field( field, ``classes`` = {} )

to alter default Bootstrap 3 inline form grid width, for example::

    {% call(kwargs)
    bs_inline_formsets(related_form=form, formsets=formsets, action=url('project_candidate_add', project_id=project.pk), html={
        'class': 'project',
        'is_ajax': True,
        'title': request.view_title,
        'submit_text': 'Add candidate',
        'layout_classes': {
            'label': 'col-md-4', 'field': 'col-md-4'
        }
    }) %}

Default value of Bootstrap inline grid layout classes, defined in ``bs_field()`` macro, is::

    {'label': 'col-md-2', 'field': 'col-md-6'}

Inserting custom content
~~~~~~~~~~~~~~~~~~~~~~~~

Calling ``bs_inline_formsets`` macro with ``kwargs`` argument allows to insert custom blocks of html at the following
points of form with related formsets rendering:

Begin of formset, formset_begin will hold instance of formset, such way you could distinguish one fromset from another
one::

    {{ caller({'formset_begin': formset, 'html': html}) }}

Begin of formset form::

    {{ caller({'form_begin': form, 'html': html}) }}

End of formset form::

    {{ caller({'form_end': form, 'html': html}) }}

End of formset, formset_end will hold instance of formset, such way you could distinguish one fromset from another
one, see example below::

    {{ caller({'formset_end': formset, 'html': html}) }}

Adding custom buttons (for example many different AJAX POST buttons each with ``data-url`` or ``data-route`` html5
attributes)::

    {{ caller({'buttons': True}) }}

The following example inserts custom submit button, which is supported when the ``'is_ajax': True parameter`` is
specified::

    {% extends 'base_min.htm' %}
    {% from 'bs_inline_formsets.htm' import bs_inline_formsets with context %}

    {% call(kwargs)
    bs_inline_formsets(related_form=form, formsets=formsets, action=url('project_update', project_id=project.pk), html={
        'class': 'project',
        'is_ajax': True,
        'title': request.view_title,
        'submit_text': 'Update project'
    }) %}

    {% if 'buttons' in kwargs %}
        <button type="submit" data-url="{{ url('project_postpone', project_id=project.pk) }}" class="btn btn-primary">
            Postpone project
        </button>
    {% endif %}

    {% endcall %}

Resulting html will have two form submit buttons, one is automatically generated with submit
``url('project_update', ...)``, another is manually inserted with submit ``url('project_postpone', ...)``. Different
Django views may be called from the same form with inline formsets, depending on which html button is pressed.

The following example will insert total project read-only "form" (see :doc:`forms`) extra cost columns after the end of
rendering related ``projectmember_set`` inline formset::

    {% extends 'base_min.htm' %}
    {% from 'bs_inline_formsets.htm' import bs_inline_formsets with context %}

    {% call(kwargs)
    bs_inline_formsets(related_form=form, formsets=formsets, action='', html={
        'class': 'project',
        'title': form.instance,
        'submit_text': 'My submit button'
    }) %}

    {% if 'formset_end' in kwargs and kwargs.formset_end.prefix == 'projectmember_set' %}
        {% set total_cost = form.project.get_total_cost() %}
        {% if total_cost > 0 %}
            <div class="default-padding">
                <table class="table">
                    <colgroup>
                        <col class="{{ kwargs.html.layout_classes.label }}">
                        <col class="{{ kwargs.html.layout_classes.field }}">
                    </colgroup>
                    <tr>
                        <th class="success">Total cost</th>
                        <td class="info">{{ total_cost }}</td>
                    </tr>
                </table>
            </div>
        {% endif %}
    {% endif %}

    {% endcall %}

Wrapping each form of formset with div with custom attributes (to process these in custom Javascript)::

    {% call(kwargs)
    bs_inline_formsets(related_form=form, formsets=formsets, action=url('project_update', project_id=project.pk), html={
        'class': 'project',
        'is_ajax': True,
        'title': form.instance,
        'submit_text': 'Update project'
    }) %}

    {% if 'form_begin' in kwargs %}
    <div id="revision-{{ kwargs.form_begin.instance.pk }}">
    {% endif %}

    {% if 'form_end' in kwargs %}
    </div>
    {% endif %}

    {% endcall %}
