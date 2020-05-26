==============
Jinja2 macros
==============

.. _app.js: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/static/djk/js/app.js
.. _App.TabPane: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=tabpane
.. _bs_breadcrumbs: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=HTML&q=bs_breadcrumbs
.. _bs_choice_list: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=HTML&q=bs_choice_list
.. _bs_dropdown: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=HTML&q=bs_dropdown
.. _bs_field(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/bs_field.htm
.. _bs_form(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/bs_form.htm
.. _bs_inline_formsets(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/bs_inline_formsets.htm
.. _bs_tabs(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/bs_tabs.htm
.. _cbv_list.htm: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/cbv_list.htm
.. _club_list_with_component.htm: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/club_app/jinja2/club_list_with_component.htm
.. _.get_filter_kwargs(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=HTML&q=get_filter_kwargs
.. _.get_filter_kwargs() sample: https://github.com/Dmitri-Sintsov/djk-sample/search?l=HTML&q=get_filter_kwargs
.. _layout_classes: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=layout_classes
.. _prepare_bs_navs: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=prepare_bs_navs
.. _render_form(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=HTML&q=render_form
.. _tpl.json_flatatt(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=HTML&q=json_flatatt
.. _bs_tabs() sample: https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=bs_tabs
.. _App.TabPane sample: https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=App.TabPane

.. highlight:: jinja

ModelForms
----------

.. _macros_bs_form:

bs_form()
~~~~~~~~~

`bs_form()`_ macro allows to generate html representation of ``ModelForm``::

    {% extends 'base_min.htm' %}
    {% from 'bs_form.htm' import bs_form with context %}

    {% block main %}

    {{ bs_form(form=form, action=tpl.url('my_url_name'), opts={
        'class': 'form_css_class',
        'title': page_context.get_view_title(),
        'submit_text': 'My button'
    }) }}

    {% endblock main %}

Since the introduction of form renderers in version 0.8.0, `bs_form()`_ macro become a simple compatibility wrapper,
while the actial HTML code of form is generated with the following `render_form()`_ call::

    {{ render_form(request, 'standalone', form, {
        'action': action,
        'opts': opts,
        'method': method,
    }) }}

Note that the `bs_form()`_ macro generates html ``<form>`` tag and wraps the whole form into Bootstrap card with the
heading / body. If you want to generate form body only (usual Django approach), call `render_form()`_ template context
function instead::

    {{ render_form(request, 'body', form) }}

To read more about `render_form()`_ template context function and built-in form / inline formsets renderers, see
:doc:`forms`.

Inline formsets
---------------

.. _macros_bs_inline_formsets:

bs_inline_formsets()
~~~~~~~~~~~~~~~~~~~~

`bs_inline_formsets()`_ is a macro that supports html rendering of one or zero Django ``ModelForm`` with one or multiple
related inline formsets. It also supports two types of rendering layouts:

* ``<div>`` layout for real changeable submittable forms.
* ``<table>`` layout primarily used to display read-only "forms" (see :doc:`forms`).

Also it has support for inserting custom content between individual forms of formsets.

.. highlight:: jinja

Example of form with inline formsets rendering::

    {{
    bs_inline_formsets(related_form=form, formsets=formsets, action=tpl.url('add_project', project_id=project.pk), opts={
        'class': 'project',
        'is_ajax': True,
        'title': page_context.get_view_title(),
        'submit_text': 'Add new project'
    }) }}

* In this case form with formsets will be submitted and processed via AJAX POST request / response due to ``is_ajax`` =
  ``True`` argument.
* `bs_inline_formsets()`_ also supports ``{% call() bs_inline_formsets() %}`` syntax for complex formatting of formsets
  which is unused in this simplified example.

.. _macros_layout_classes:

Changing bootstrap grid layout
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
One may use the custom `layout_classes`_ value as the key of the following macros ``opts`` dict argument:

* bs_form(form, action, opts, method='post')
* bs_inline_formsets(related_form, formsets, action, opts)

to alter default Bootstrap inline form grid width, for example::

    {{
    bs_inline_formsets(related_form=form, formsets=formsets, action=tpl.url('project_candidate_add', project_id=project.pk), opts={
        'class': 'project',
        'is_ajax': True,
        'title': page_context.get_view_title(),
        'submit_text': 'Add candidate',
        'layout_classes': {
            '': {
                'label': 'col-md-4', 'field': 'col-md-6',
            }
        }
    }) }}

Default value of Bootstrap inline grid layout classes is defined in ``djk_ui`` app :ref:`djk_ui_conf` module
``LAYOUT_CLASSES`` variable.

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
    bs_inline_formsets(related_form=form, formsets=formsets, action=tpl.url('project_update', project_id=project.pk), opts={
        'class': 'project',
        'is_ajax': True,
        'title': page_context.get_view_title(),
        'submit_text': 'Update project'
    }) %}

    {% if 'buttons' in kwargs %}
        <button type="submit" data-url="{{ tpl.url('project_postpone', project_id=project.pk) }}" class="btn btn-primary">
            Postpone project
        </button>
    {% endif %}

    {% endcall %}

Resulting html will have two form submit buttons:

* one is automatically generated with submit ``tpl.url('project_update', ...)``
* another is manually inserted with submit ``tpl.url('project_postpone', ...)``

Different views may be called from the same Django AJAX form with inline formsets, depending on which html button is
pressed.

The following example will insert total project read-only "form" (see :doc:`forms`) extra cost columns after the end of
rendering related ``projectmember_set`` inline formset::

    {% extends 'base_min.htm' %}
    {% from 'bs_inline_formsets.htm' import bs_inline_formsets with context %}

    {% call(kwargs)
    bs_inline_formsets(related_form=form, formsets=formsets, action='', opts={
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
    bs_inline_formsets(related_form=form, formsets=formsets, action=tpl.url('project_update', project_id=project.pk), opts={
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

Since version 0.8.0, the more flexible approach could be to override :ref:`forms_renderers` templates instead.

Bootstrap navigation
--------------------

See `.get_filter_kwargs() sample`_ for working example of boostrap navigation macros.

bs_breadcrumbs()
~~~~~~~~~~~~~~~~

`bs_breadcrumbs`_ macro generates bootstrap breadcrumbs of the current filter choices from the result of
:ref:`views_listsortingview` class `.get_filter_kwargs()`_ call::

    {% for field in view.allowed_filter_fields -%}
        {{ bs_breadcrumbs(**view.get_filter_kwargs(field)) }}
    {% endfor -%}

bs_choice_list()
~~~~~~~~~~~~~~~~

`bs_choice_list`_ macro generates the flat list of the currently selected filter choices from the result of
:ref:`views_listsortingview` class `.get_filter_kwargs()`_ call::

    {% for field in view.allowed_filter_fields -%}
        {{ bs_choice_list(**view.get_filter_kwargs(field)) }}
    {% endfor -%}

bs_dropdown()
~~~~~~~~~~~~~

`bs_dropdown`_ macro generates bootstrap dropdown of the current filter choices from the result of
:ref:`views_listsortingview` class `.get_filter_kwargs()`_ call::

    {% for field in view.allowed_filter_fields -%}
        {{ bs_dropdown(**view.get_filter_kwargs(field)) }}
    {% endfor -%}

bs_filters()
~~~~~~~~~~~~

Displays the list of :ref:`views_listsortingview` filters which produce empty queryset::

    {{ bs_filters(**view.get_no_match_kwargs()) }}

bs_list()
~~~~~~~~~

Displays current page of the supplied ``ListView`` / :ref:`views_listsortingview`  view instance ``object_list``
(queryset) with ``page_obj`` paginator links stylized for bootstrap. It has the optional call wrapper which supports
three optional arguments to provide three optional caller sections: ``has_filters``, ``has_no_match``, ``has_pagination``.

To override all of the caller sections::

    {% call(has_filters, has_no_match, has_pagination) bs_list(view, object_list, is_paginated, page_obj) -%}
        {% if has_filters -%}
            {# insert custom filters layout here #}
        {% elif has_no_match -%}
            {# insert custom filters layout here #}
        {% elif has_pagination -%}
            {# insert custom pagination layout here #}
        {% endif -%}
    {% endcall -%}

To override just one ``has_filters`` caller section::

    {% call(has_filters) bs_list(view, object_list, is_paginated, page_obj) -%}
        {% if has_filters -%}
            {# insert custom filters layout here #}
        {% endif -%}
    {% endcall -%}

No override (no call) see `cbv_list.htm`_ for example::

    {{ bs_list(view, object_list, is_paginated, page_obj) }}

For the example of customizing :ref:`views_listsortingview` has_filters section / has_pagination section see the
djk-sample `club_list_with_component.htm`_ Jinja2 template.

.. _macros_bs_navs:

bs_navs()
~~~~~~~~~
This macro takes the result of `prepare_bs_navs`_ function or the result of :ref:`views_bstabsmixin` template context
``main_navs`` variable to display automatically highlighted server-side bootstrap navigation tabs. Do not confuse to
`bs_tabs()`_ macro, which is similar but switches between tabs at the client-side via `App.TabPane`_ Javascript class.

Since v0.9.0, `bs_navs()`_ macro is also argument-compatible to filter choices from the result of
:ref:`views_listsortingview` class `.get_filter_kwargs()`_ call (see also `bs_breadcrumbs()`_  / `bs_choice_list()`_ /
`bs_dropdown()`_ / `bs_filters()`_ which are compatible)::

    {% for field in view.allowed_filter_fields -%}
        {{ bs_navs(**view.get_filter_kwargs(field)) }}
    {% endfor -%}

.. _macros_bs_tabs:

bs_tabs()
~~~~~~~~~

`bs_tabs()`_ macro creates ``App.TabList`` Javascript component which manages client-side bootstrap tabs. Internally
it uses ``App._TabPane`` Javascript class. Both classes are defined in `app.js`_. Let's explain some methods of
``App._TabPane`` class:

* ``.switchTo()`` method enables automatic switching of bootstrap tab panes upon page load and via window.location.hash
  change. Hash change may occur programmatically from user script, or via clicking the anchor with matching hash name.
* ``.highlight()`` method provides permanent or temporary highlighting of displayed bootstrap tab, to indicate that
  it's contents was updated / changed. This is particularly useful when `bs_tabs()`_ is used together with AJAX
  dynamic components, such as datatables.
* ``.loadTemplate()`` method allows one-time filling of tab content from the specified ``template_id`` attribute of
  `bs_tabs()`_ macro. It allows to delay AJAX calls of the template components until the user actually clicked on the
  tab, instead of performing all AJAX calls even for the inivisible tabs at once. Which is useful for the long lists
  of tabs with :ref:`datatables_ko_grid_macro` generated datatable component for example.

djk_sample demo project has `bs_tabs() sample`_ / `App.TabPane sample`_ which places grids into bootstrap tabs.

The first mandatory argument of `bs_tabs()`_ macro is the ``tabs`` list. Each element of the ``tabs`` list should be the
dict that defines content of each tab. The following mandarory key-value pairs are required:

* ``id`` - the value of window.location.hash for current tab;
* ``title`` - title of current tab;

The following keys are mutually exclusive:

* ``html`` - html of tab pane. Use Jinja 2.8+ ``{% set html %}`` ``{% endset %}`` syntax to capture complex content,
  such as grid, ModelForm, inline formset and so on;
* ``template_id`` - since version 0.8.0 one may specifify underscore.js template id which will be expanded to tab pane
  when the user switches to that pane, instead of ``html`` which loads the content to the tab immediately. It may be
  used to delay loading of Javascript components, eg. datatables (grids). See :ref:`clientside_underscore_js_templates`
  and :ref:`clientside_components` for more info.

Optional key-value pairs:

* ``is_active`` - set to ``True`` when current tab has to be selected by default;
* ``tooltip`` - optional tooltip for the tab link;

The second optional argument of `bs_tabs()`_ macro is ``tabs_attrs`` dict which defines `tpl.json_flatatt()`_ HTML
attributes for the tabs wrapper tag, which is `ul.nav.nav-tabs` by default.

The third optional argument of `bs_tabs()`_ macro is ``content_attrs`` dict which defines `tpl.json_flatatt()`_ HTML
attributes for the tabs content tag, which is `div.tab-content` by default.
