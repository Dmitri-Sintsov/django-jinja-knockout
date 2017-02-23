.. :changelog:

.. _add_instance: https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=add_instance
.. _bs_list.htm: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/bs_list.htm
.. _dump_data: https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=dump_data
.. _fixtures_order: https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=fixtures_order
.. _.has_fixture(): https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=has_fixture
.. _yield_out_instances: https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=yield_out_instances

History
-------

0.1.0
+++++

* To be released on PyPI.

0.2.0
+++++
* Django 1.8 / 1.9 / 1.10, Python 3.4 / 3.5 support.
* ``djk-sample`` demo / automated testing project.
* "django.admin-like" AJAX functionality implemented via ``KoGridView`` class-based view.
* ``$.inherit()`` Javascript prototype inheritance function now supports multi-level inheritance with nested
  ``._super._call()``.
* ``FilteredRawQuerySet`` supports Django raw querysets with ``.filter()`` / ``.exclude()`` / ``.order_by()`` /
  ``.values()`` / ``.values_list()`` and SQL level slicing.
* ``ForeignKeyGridWidget`` provides ``ForeignKeyRawIdWidget`` -like functionality via AJAX query / response in non-admin
  forms to select ModelForm foreign key values.
* Client-side generation of view urls with kwargs in Javascript client-side routes via ``App.routeUrl()``.
* Nested autocompiled underscore.js client-side templates for Javascript components, primarily used with Knockout.js,
  but is not limited to.

0.3.0
+++++
* ``ContentTypeLinker`` - added method to return html representation of content types framework related object (html
  link with the description by default).
* ``FilteredRawQuerySet`` now supports more precise ``.count()`` method to calculate the length of raw queryset.
* ``ListQuerySet`` implements large part of queryset methods for the lists of Django model instances. Such lists are
  created by Django queryset ``.prefetch_related()`` method.
* Auto-highlight bootstrap navs which have 'auto-highlight' css class at client-side.
* ``bs_tabs()`` Jinja2 macro which simplifies generation of bootstrap tabs. Bootstrap tabs now support automatic
  switching via window.location.hash change.
* ``ListSortingView`` improvements:

  * Supports graceful handling of error reporting, producing in-place messages instead of just rising an exception.
  * ``.get_filter_args()`` / ``.get_no_match_kwargs()`` methods are implemented to generate macro arguments used in
    `bs_list.htm`_ Jinja2 template. This allows to override default messages for field filters / no match reports in
    the grid classes.

* ``KoGridView`` has multiple improvements:

  * ``decimal`` field filter is renamed to ``number`` as now it supports both Django model ``DecimalField`` and
    ``IntegerField``.
  * Django model ``IntegerField`` is now bound either to ``choices`` type filter, when it has non-empty ``choices``
    attribute, or to ``number`` type filter to select range of values, otherwise.
  * Action handlers do not require to return default viewmodel ``view`` name manually, now it's being done automatically
    (when viewmodel ``view`` name is not specified).
  * ``get_default_grid_options()`` method was renamed to shorter ``get_grid_options()`` method.
  * ``grid_options`` may be defined as class attribute, not having to always define ``get_grid_options()`` method which
    is more verbose (but is more flexible).
  * ``discover_grid_options()`` method was implemented to populate grid ``fkGridOptions`` which are used to setup
    foreign key filter fields automatically (when possible). That allows to reduce boilerplate data in ``grid_options``
    / ``get_grid_options()``, especially when using nested foreign key filters. ``fkGridOptions`` nested dictionary
    still can be specified manually as the part of ``get_grid_options()`` result, in complex cases (eg. DB or view
    kwargs based options).
  * Enable quick selection / deselection of currently displayed grid rows when ``selectMultipleRows`` is ``true``.

* ``ForeignKeyGridWidget`` also autodetects foreign key filter ``fkGridOptions``.
* ``SendmailQueue`` supports extension of ``add()`` / ``flush()`` methods via ioc class.
* ``SendmailQueue`` may be used to send uncaught exception emails when running in production mode.

0.4.0
+++++
* Improvements in testing support:

  * ``AutomationCommands`` now uses yield to generate the sequence of opcodes and their args, resulting in cleaner code.
  * ``SeleniumCommands`` is reworked into ``BaseSeleniumCommands``. It supports:

    * Saving current database state to Django fixtures at the particular points of tests via `dump_data`_ command. That
      allows to skip already debugged parts of tests via `.has_fixture()`_ method, greatly reducing the time
      required to develop and debug long running Selenium tests. To make proper order (sequence) of stored / loaded
      fixtures, one has to define `fixtures_order`_ attribute of ``DjkTestCase`` derived class.
    * Automatical retry of the last Selenium commands execution in case current command is timed out when running at
      slow client due to DOM is not being updated in time.
    * css parsing / xpath string escaping.

  * ``SeleniumQueryCommands`` implements generic Selenium commands, including Django reverse url support for navigation
    bar, anchors and forms, which could be useful in any Django application.
  * ``DjkSeleniumQueryCommands`` implements additional Selenium commands related to django-jinja-knockout functionality,
    such as BootstrapDialog and Knockout.js grids / widgets support.

forms.py
~~~~~~~~
* ``BootstrapModelForm`` always populates ``.request`` attribute for convenience.
* ``CustomFullClean`` / ``StripWhilespaceMixin`` mixins for Django forms.

middleware.py
~~~~~~~~~~~~~
* ``ContextMiddleware`` class:

  * Supports request mocking when running not under HTTP server, for example as shell command / celery task.
  * Supports request-time storage of lists / dicts of objects via `add_instance`_ / `yield_out_instances`_ methods.

query.py
~~~~~~~~
* ``FilteredRawQuerySet`` supports Q expressions (Q objects) with relation mapping.

views submodule
~~~~~~~~~~~~~~~
* ``BaseFilterView``

  * ``filter_queryset()`` now supports args in addition to kwargs. That allows to use Django ``Q`` objects in grids
    and lists, although actual generation of ``Q`` objects is still limited to ``None`` value filtering.
  * ``None`` can be valid value of field filter query. It is mapped to ``is_null`` field lookup, also it uses Django
    ``Q.__or__`` operation in case ``None`` is presented in the list of field filter values.
  * Query filters now support ``in`` clause for drop-down ``choice`` filter.

widgets.py
~~~~~~~~~~
* ``DisplayText`` field widget ``__init__()`` method now supports two types of ``get_text`` callback arguments:

  * ``get_text_method`` which binds passed function to DisplayText widget instance (self as first argument)
  * ``get_text_fn`` which uses unbound function (no self).

If form that defined widget uses ``WidgetInstancsMixin`` and model field instance has ``get_str_fields()`` method
implemented, such field will be auto-rendered via ``print_list_group()`` / ``print_bs_well()`` functions of ``tpl``
modile to produce structured output.

ko_grid_body.htm
~~~~~~~~~~~~~~~~
*  Fixed ``ko_grid_body()`` macro not including underscore.js templates copied with different ``template_id`` when these
   templates were called from related underscore.js templates.

ko-grid.js
~~~~~~~~~~
* Reset filter now uses ``undefined`` value instead of ``null`` value because filtering by ``None`` value is now
  supported in ``KoGridView``.
* ``App.ko.GridRow`` class ``toDisplayValue()`` method now automatically picks nested relation value from nested
  ``strFields`` value, when available. That allows to traverse nested ``get_str_fields()`` values automatically.

  See ``getDisplayValue()`` method for the implementation.
* Allow to click nested elements of row cells when these are enclosed into anchors.
* Allow to override grid callback action via viewmodel ``callback_action`` property.
* Query filters now support multi-value ``in`` clause for values of drop-down ``choice`` filter.
* Grid viewmodel ``deleted_pks`` key values are processed first in ``App.ko.Grid.updatePage()``. That allows to delete
  old row and add new row with the same ``pkVal`` at once (forced update).
* ``App.ko.Grid`` class  ``.setFiltersChoices()`` method simplifies programmatic filtering of grid at client-side, for
  example from the parsed querystring.

plugins.js
~~~~~~~~~~
``$.linkPreview`` now has separate inclusion filter for local urls and exclusion filter for remote urls, which minimizes
the possibility of preview glitches due to wrong guess of resource type.

0.4.1
+++++
Support of the ``'choices' filter`` option ``multiple_choices``: ``True`` in  non-AJAX ``ListSortingView``. That allows
to perform ``in`` field lookups for the selected field filter which was previously available only in AJAX
``KoGridView``.

Large monolithic ``views.py`` split into smaller parts with symbols exported via module ``__init__.py`` for the
convenience and compatibility.

Alternative breadcrumbs layout of field filters widgets.
