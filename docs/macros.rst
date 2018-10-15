==============
Jinja2 macros
==============

.. _app.js: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/static/djk/js/app.js
.. _bs_breadcrumbs(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=HTML&q=bs_breadcrumbs
.. _bs_choice_list(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=HTML&q=bs_choice_list
.. _bs_dropdown(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=HTML&q=bs_dropdown
.. _bs_field(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/bs_field.htm
.. _bs_form(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/bs_form.htm
.. _bs_form_body(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/bs_form_body.htm
.. _bs_inline_formsets(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/bs_inline_formsets.htm
.. _bs_tabs(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/bs_tabs.htm
.. _.get_filter_args(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=HTML&q=get_filter_args
.. _render_form(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=HTML&q=render_form
.. _tpl.json_flatatt(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=HTML&q=json_flatatt

.. _bs_tabs() sample: https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=bs_tabs
.. _App.TabPane sample: https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=App.TabPane

.. highlight:: jinja

ModelForms
----------

`bs_form()`_ macro allows to generate html representation of ``ModelForm``::

    {% extends 'base_min.htm' %}
    {% from 'bs_form.htm' import bs_form with context %}

    {% block main %}

    {{ bs_form(form=form, action=url('my_url_name'), opts={
        'class': 'form_css_class',
        'title': request.view_title,
        'submit_text': 'My button'
    }) }}

    {% endblock main %}

Note that the `bs_form()`_ macro also generates html ``<form>`` tag and wraps the whole form into Bootstrap 3 panel
with the heading / body. If you want to generate form body only (usual Django approach), call `render_form()`_ template
context function instead::

    {{ render_form(request, 'body', form) }}

To read more about `render_form()`_ template context function and built-in form / inline formsets renderers, see
:doc:`forms`.

.. highlight:: python

To have Bootstrap3 attributes to be applied to form fields it's also advisable to inherit ``ModelForm`` class from
``BootstrapModelForm``::

    from django_jinja_knockout.forms import BootstrapModelForm

    class ProfileForm(BootstrapModelForm):

        class Meta:
            model = Profile
            exclude = ('age',)
            fields = '__all__'

Inline formsets
---------------
`bs_inline_formsets()`_ is a macro that supports html rendering of one or zero Django ``ModelForm`` with one or multiple
related inline formsets. It also supports two types of rendering layouts:

* ``<div>`` layout for real changeable submittable forms.
* ``<table>`` layout primarily used to display read-only "forms" (see :doc:`forms`).

Also it has support for inserting custom content between individual forms of formsets.

.. highlight:: jinja

Example of form with inline formsets rendering::

    {{
    bs_inline_formsets(related_form=form, formsets=formsets, action=url('add_project', project_id=project.pk), html={
        'class': 'project',
        'is_ajax': True,
        'title': request.view_title,
        'submit_text': 'Add new project'
    }) }}

* In this case form with formsets will be submitted and processed via AJAX POST request / response due to ``is_ajax`` =
  ``True`` argument.
* `bs_inline_formsets()`_ also supports ``{% call() bs_inline_formsets() %}`` syntax for complex formatting of formsets
  which is unused in this simplified example.

Changing bootstrap grid layout
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
One may use ``'layout_classes'`` key of the following macros ``highlighted`` arguments:

* bs_inline_formsets( related_form, formsets, action, ``html`` )
* bs_form_body( form, ``field_classes`` )
* bs_field( field, ``classes`` = {} )

to alter default Bootstrap 3 inline form grid width, for example::

    {{
    bs_inline_formsets(related_form=form, formsets=formsets, action=url('project_candidate_add', project_id=project.pk), html={
        'class': 'project',
        'is_ajax': True,
        'title': request.view_title,
        'submit_text': 'Add candidate',
        'layout_classes': {
            'label': 'col-md-4', 'field': 'col-md-4'
        }
    }) }}

Default value of Bootstrap inline grid layout classes, defined in `bs_field()`_ macro, is::

    {'label': 'col-md-2', 'field': 'col-md-6'}

Inserting custom content
~~~~~~~~~~~~~~~~~~~~~~~~

Calling `bs_inline_formsets()`_ macro with ``kwargs`` argument allows to insert custom blocks of html at the following
points of form with related formsets rendering:

Begin of formset. ``formset_begin`` will hold the instance of formset, allowing to distinguish one formset from another
one::

    {{ caller({'formset_begin': formset, 'html': html}) }}

Begin of formset form::

    {{ caller({'form_begin': form, 'html': html}) }}

End of formset form::

    {{ caller({'form_end': form, 'html': html}) }}

End of formset. ``formset_end`` will hold the instance of formset, allowing to distinguish one formset from another one
(see the example below)::

    {{ caller({'formset_end': formset, 'html': html}) }}

Adding custom buttons, for example many AJAX POST buttons each with different ``data-url`` or ``data-route`` html5
attributes. That allows to submit the same AJAX form to different Django views::

    {{ caller({'buttons': True}) }}

The following example inserts custom submit button, which is supported when the ``'is_ajax': True`` parameter is
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

Resulting html will have two form submit buttons:

* one is automatically generated with submit ``url('project_update', ...)``
* another is manually inserted with submit ``url('project_postpone', ...)``

Different views may be called from the same Django AJAX form with inline formsets, depending on which html button is
pressed.

The following example will insert total project read-only "form" (see :doc:`forms`) extra cost columns after the end of
rendering related ``projectmember_set`` inline formset::

    {% extends 'base_min.htm' %}
    {% from 'bs_inline_formsets.htm' import bs_inline_formsets with context %}

    {% call(kwargs)
    bs_inline_formsets(related_form=form, formsets=formsets, action='', html={
        'class': 'project',
        'title': form.instance,
        'submit_text': 'Review project'
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


Bootstrap macros
----------------

bs_breadcrumbs()
~~~~~~~~~~~~~~~~

`bs_breadcrumbs()`_ macro generates bootstrap breadcrumbs of the current filter choices from the result of
``ListSortingView`` class `.get_filter_args()`_ call::

    {% for field in view.allowed_filter_fields -%}
        {{ bs_breadcrumbs(*view.get_filter_args(field)) }}
    {% endfor -%}

bs_choice_list()
~~~~~~~~~~~~~~~~

`bs_choice_list()`_ macro generates the flat list of the currently selected filter choices from the result of
``ListSortingView`` class `.get_filter_args()`_ call::

    {% for field in view.allowed_filter_fields -%}
        {{ bs_choice_list(*view.get_filter_args(field)) }}
    {% endfor -%}

bs_dropdown()
~~~~~~~~~~~~~

`bs_dropdown()`_ macro generates bootstrap dropdown of the current filter choices from the result of
``ListSortingView`` class `.get_filter_args()`_ call::

    {% for field in view.allowed_filter_fields -%}
        {{ bs_dropdown(*view.get_filter_args(field)) }}
    {% endfor -%}


bs_tabs()
~~~~~~~~~

`bs_tabs()`_ macro simplifies generation of bootstrap tabs. It has client-side support via ``App.TabPane`` class,
defined in `app.js`_:

* ``.show()`` method enables automatic switching of bootstrap tab panes upon page load and via window.location.hash
  change. Hash change may occur programmatically from user script, or via clicking the anchor with matching hash name.
* ``.highlight()`` method provides permanent or temporary highlighting of displayed bootstrap tab, to indicate that
  it's contents was updated / changed. That is particularly useful when `bs_tabs()`_ is used together with AJAX
  dynamic components, such as grids.

djk_sample demo project has `bs_tabs() sample`_ / `App.TabPane sample`_ which places grids into bootstrap tabs.


The first mandatory argument of `bs_tabs()`_ macro is the ``tabs`` list. Each element of the ``tabs`` list should be the
dict that defines content of each tab. The following mandarory key-value pairs are required:

* ``id`` - the value of window.location.hash for current tab;
* ``title`` - title of current tab;
* ``html`` - html of tab pane. Use Jinja 2.8+ ``{% set html %}`` ``{% endset %}`` syntax to capture complex content,
  such as grid, ModelForm, inline formset and so on;

Optional key-value pairs:

* ``is_active`` - set to ``True`` when current tab has to be selected by default;
* ``tooltip`` - optional tooltip for the tab link;

The second optional argument of `bs_tabs()`_ macro is ``tabs_attrs`` dict which defines `tpl.json_flatatt()`_ HTML
attributes for the tabs wrapper tag, which is `ul.nav.nav-tabs` by default.

The third optional argument of `bs_tabs()`_ macro is ``content_attrs`` dict which defines `tpl.json_flatatt()`_ HTML
attributes for the tabs content tag, which is `div.tab-content` by default.
