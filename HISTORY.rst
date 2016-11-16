.. :changelog:

.. _bs_list.htm: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/bs_list.htm

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
