.. _action 'meta_list' preload: https://django-jinja-knockout.readthedocs.io/en/latest/datatables.html#meta-list-action-preload
.. _ActionsView: https://django-jinja-knockout.readthedocs.io/en/latest/viewmodels.html#ajax-actions
.. _App.Actions: https://django-jinja-knockout.readthedocs.io/en/latest/viewmodels.html#ajax-actions
.. _App.AjaxForm: https://django-jinja-knockout.readthedocs.io/en/latest/clientside.html#simplifying-ajax-calls
.. _App.Components: https://django-jinja-knockout.readthedocs.io/en/latest/clientside.html#components
.. _App.Dialog: https://django-jinja-knockout.readthedocs.io/en/latest/clientside.html#underscore-js-templates
.. _App.renderNestedList: https://django-jinja-knockout.readthedocs.io/en/latest/datatables.html#nested-verbose-field-names
.. _App.routeUrl(): https://django-jinja-knockout.readthedocs.io/en/latest/clientside.html#simplifying-ajax-calls
.. _Bootstrap 3: https://github.com/Dmitri-Sintsov/djk-bootstrap3
.. _Bootstrap 4: https://github.com/Dmitri-Sintsov/djk-bootstrap4
.. _bs_tabs(): https://django-jinja-knockout.readthedocs.io/en/latest/macros.html#macros-bs-tabs
.. _celery: http://www.celeryproject.org/
.. _ContextMiddleware: https://django-jinja-knockout.readthedocs.io/en/latest/middleware.html
.. _custom tags: https://django-jinja-knockout.readthedocs.io/en/latest/clientside.html#clientside-custom-tags
.. _DisplayText: https://django-jinja-knockout.readthedocs.io/en/latest/widgets.html#displaytext
.. _django-jinja: https://github.com/niwinz/django-jinja
.. _FilteredRawQuerySet: https://django-jinja-knockout.readthedocs.io/en/latest/query.html#filteredrawqueryset
.. _ForeignKeyGridWidget: https://django-jinja-knockout.readthedocs.io/en/latest/widgets.html#foreignkeygridwidget
.. _ForeignKeyRawIdWidget: https://github.com/django/django/search?l=Python&q=ForeignKeyRawIdWidget
.. _get_str_fields(): https://django-jinja-knockout.readthedocs.io/en/latest/datatables.html#get-str-fields
.. _KoGridView: https://django-jinja-knockout.readthedocs.io/en/latest/datatables.html
.. _ListSortingView: https://django-jinja-knockout.readthedocs.io/en/latest/views.html#listsortingview
.. _ListQuerySet: https://django-jinja-knockout.readthedocs.io/en/latest/query.html#listqueryset
.. _ModelForm: https://docs.djangoproject.com/en/dev/topics/forms/modelforms/#modelform
.. _Nested components: https://django-jinja-knockout.readthedocs.io/en/latest/clientside.html#clientside-nested-components
.. _Nested serializer: https://django-jinja-knockout.readthedocs.io/en/latest/usage.html#quickstart-serializers
.. _prefetch_related(): https://docs.djangoproject.com/en/dev/ref/models/querysets/#django.db.models.Prefetch
.. _PrefillWidget: https://django-jinja-knockout.readthedocs.io/en/latest/widgets.html#id1
.. _prepare_bs_navs(): https://django-jinja-knockout.readthedocs.io/en/latest/views.html#bstabsmixin
.. _reverseq(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=reverseq&type=&utf8=%E2%9C%93
.. _Renderer: https://django-jinja-knockout.readthedocs.io/en/latest/forms.html#forms-renderers
.. _SendmailQueue: https://django-jinja-knockout.readthedocs.io/en/latest/utils_mail.html
.. _Sparse components: https://django-jinja-knockout.readthedocs.io/en/latest/clientside.html#clientside-sparse-components
.. _template attributes merging: https://django-jinja-knockout.readthedocs.io/en/latest/clientside.html#clientside-attributes-merging
.. _tpl.resolve_cbv(): https://django-jinja-knockout.readthedocs.io/en/latest/tpl.html#url-resolution
.. _underscore.js templates: https://django-jinja-knockout.readthedocs.io/en/latest/clientside.html#underscore-js-templates
.. _viewmodels: https://django-jinja-knockout.readthedocs.io/en/latest/viewmodels.html

Major changes (version 0.9.0)
-----------------------------
Django 3.0 support.

Introduced ``TemplateContext`` class used to inject view title / client data / client routes / custom scripts to
templates.

Dependency on `django-jinja`_ package is optional and is off by default. It may be removed completely in case
`django-jinja`_ package will not be updated to run with Django 3.0 or newer version.

Running without ``DJK_MIDDLEWARE`` is greatly improved.

Pluggable extensions for Jinja2 templates.

``bs_breadcrumbs()`` / ``bs_dropdown()`` / ``bs_navs()`` Jinja2 macros are now argument compatible, allowing to use
these with `prepare_bs_navs()`_ as well with `ListSortingView`_ filters.

Selenium tests are more reliable, pass in Firefox. Added Selenium web drivers for Linux Chromium interactive / headless.

Minor changes (version 0.8.1)
-----------------------------
Django 2.2 support.

Improves compatibility and stability of middleware with third party apps.

Implemented `action 'meta_list' preload`_ for datatables.

Major changes (version 0.8.0)
-----------------------------
`Bootstrap 4`_ / `Bootstrap 3`_ support.

Default rendering layouts for fields / forms / related forms / inline formsets, which can be customized via providing
custom template or via inheriting the `Renderer`_ class.

Underscore.js templates support `template attributes merging`_ and `custom tags`_.

`Nested components`_ and `Sparse components`_ at the client-side.

`Nested serializer`_.

Major changes (version 0.7.0)
-----------------------------
Datatables now have new type of action ``'pagination'``. There are two built-in actions of this type implemented:
``'rows_per_page'`` and ``'switch_highlight'``.

Datatables support compound columns for better utilization of the display space. That allows to display more data
columns, including foreign relations at the screen.

Datatables ``glyphicon`` actions are rendered in the single column of datatable, instead of each action per column for
better utilization of the display space.

Static assets are moved to '/djk' subdirectory, minimizing the risk of conflicts with third party assets.

Updated to latest versions of Knockout.js / jQuery / Bootstrap 3 (should also work with not-too-old ones).

`viewmodels`_ AJAX response routing is rewritten as ``App.ViewModelRouter`` class with default instance
``App.vmRouter``. It now supports binding viewmodel handlers to Javascript class instances methods.

Optional built-in Javascript error logger.

``App.NestedList`` internally used by `App.renderNestedList`_ for greater flexibility of client-side Javascript nested
lists rendering. ``App.NestedList`` now supports ordered maps via ``_.ODict`` instances.

Ajax forms submitting is refactored into `App.AjaxForm`_ class, while setting up the ajax forms is performed by
``App.AjaxForms``, for better flexibility.

``App.readyInstances`` introduced for global client-side IoC, available in custom user scripts as well.

Knockout.js method subscription / unsubscription is placed into ``App.ko.Subscriber`` mixin class. ``focus`` binding
is implemented for Knockout.js.

Request mock-up when running without web server is greatly improved. That enables reverse resolving of FQN urls in
console management commands and in background celery tasks via `reverseq()`_ calls when sites framework is correctly
set up.

``ast_eval`` templage tag.

Headless Chrome Selenium webdriver support (phantom.js is deprecated).

Major changes (version 0.6.0)
-----------------------------
AJAX actions are rewritten as server-side `ActionsView`_ class and client-side counterpart `App.Actions`_. It is now
used as foundation for most of AJAX code, including grid datatables and new ``App.EditForm`` / ``App.EditInline``
client-side components.

New widget `PrefillWidget`_ to select pre-filled text from the list of supplied values.

Selective skipping of `DisplayText`_ field widget rendering.

Basic version of ``ViewmodelValidator`` for AJAX submitted forms.

Major changes (version 0.5.0)
-----------------------------
Rewritten recursive underscore.js template processor, see `underscore.js templates`_.

Displaying verbose field names in grid rows, grid row actions and in `ForeignKeyGridWidget`_ placeholder.

Clean-up of client-side components code.

Better support for datatable grids that use RAW queries with ``LEFT JOIN``, which may have multiple rows with the same
``pkVal`` equal to ``null``.

Improvements in Selenium automation testing: better handling of automation commands, more of commands implemented,
much larger test coverage.

* Numerous bugfixes, including related field queries support in `FilteredRawQuerySet`_.

Major changes (version 0.4.0)
-----------------------------
Large improvements in Selenium testing support: additional commands are implemented, auto-retry on DOM timeout, fixtures
loading / saving which allows to skip already debugged parts of tests, saving developer's time.

`ContextMiddleware`_ supports request mocking and request-time storage.

`FilteredRawQuerySet`_ supports Q expressions (Q objects) with relation mapping.

``BaseFilterView`` / `KoGridView`_ - basic support for Q expressions (currently is used for ``None`` value of field
filter), support for ``in`` query for ``choice`` filter value via the list of values.

Improved support of optional Django model `get_str_fields()`_ method in `DisplayText`_ widget and in Knockout.js
datatable grids.

Various bugfixes.

Minor changes (version 0.4.1)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Implemented ``multiple_choices``: ``True`` option of the field filter ``type`` ``choices`` in `ListSortingView`_.
That allows to perform ``in`` field lookups for the selected field filter.

Large monolithic ``views.py`` split into smaller parts with symbols exported via module ``__init__.py`` for the
convenience and compatibility.

Alternative breadcrumbs layout of field filters widgets.

Bugfixes and security fixes in query / views modules.

Major changes (version 0.3.0)
-----------------------------

Auto-configuration of nested foreign key filter fields in `KoGridView`_ / `ForeignKeyGridWidget`_.

`FilteredRawQuerySet`_ now supports more precise ``.count()`` method.

`ListQuerySet`_ supports significant part of Django queryset functionality for the lists of Django model instances,
returned by `prefetch_related()`_.

Bootstrap tabs generation macro `bs_tabs()`_ with client-side support of switching tabs when window.location.hash
value changes.

`SendmailQueue`_ functionality can be extended via injecting ioc class - for example to send email in the background
via `celery`_ task.

Major changes (version 0.2.0)
-----------------------------
``$.inherit()`` Javascript prototype inheritance function now supports multi-level inheritance with nested ``.super``
calls without having to specify parent class prototype property implicitely in descendant class instances, with newly
introduced ``$.SuperChain`` class.

"django.admin-like" AJAX functionality was implemented via `KoGridView`_ class-based view (CBV) at server-side with
corresponding Knockout.js templates and Javascript classes at client-side. Besides providing standard CRUD actions and
filters, it allows to implement arbitrary actions in descendant classes and quickly design django.admin-like user
interfaces in non-admin views. AJAX calls also minimize server HTTP traffic, reducing network bandwitch and making the
UI more responsive.

New `ForeignKeyGridWidget`_ was developed which provides `ForeignKeyRawIdWidget`_-like functionality in non-admin
`ModelForm`_ classes to select foreign key fields value via AJAX query / response.

Support of auto-instantiating Javascript classes with binding these to selected DOM nodes with 'component' css class via
`App.Components`_ class.

Support of auto-compiling / auto-loading client-side underscore.js templates via ``App.compileTemplate`` /
``App.domTemplate`` / ``App.loadTemplates``. One of usage examples is the possibility of loading modal body from
underscore.js template in `App.Dialog`_.

Support of client-side generation of view urls with kwargs for client-side url names via updated ``context_processors.py``
and client-side `App.routeUrl()`_ Javascript function.

`tpl.resolve_cbv()`_ allows to resolve view class via url name and it's kwargs.

Django templates (DTL) and Jinja2 templates now can be mixed using shared Jinja2 template code via ``{% load jinja %}``
template library ``jinja`` template tags, which performs ``include`` for Jinja2 template with current context::

    {% extends 'base_min.html' %}
    {% load jinja %}
    {% load staticfiles %}

    {% block main %}
    {% jinja 'bs_list.htm' with _render_=1 view=view object_list=object_list is_paginated=is_paginated page_obj=page_obj %}
    {% endblock main %}

Numerous bug fixes.
