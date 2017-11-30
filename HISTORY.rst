.. :changelog:

.. _add_instance: https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=add_instance
.. _bs_list.htm: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/bs_list.htm
.. _contenttypes: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/contenttypes.py
.. _djk-sample: https://github.com/Dmitri-Sintsov/djk-sample
.. _djk_seed: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/management/commands/djk_seed.py
.. _dump_data: https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=dump_data
.. _fixtures_order: https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=fixtures_order
.. _.has_fixture(): https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=has_fixture
.. _modelFormAction: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=modelFormAction&utf8=%E2%9C%93
.. _plugins.js: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/static/djk/js/plugins.js
.. _tooltips.js: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/static/djk/js/tooltips.js
.. _tpl: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/tpl.py
.. _validators: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/validators.py
.. _yield_out_instances: https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=yield_out_instances

=======
History
=======

0.1.0
-----

* To be released on PyPI.

0.2.0
-----
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
-----
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
-----
* Improvements in testing support:

  * ``AutomationCommands`` now uses yield to generate the sequence of opcodes and their args, resulting in cleaner code.
  * ``SeleniumCommands`` is reworked into ``BaseSeleniumCommands``. It supports:

    * Saving current database state to Django fixtures at the particular points of tests via `dump_data`_ command. That
      allows to skip already debugged parts of tests via `.has_fixture()`_ method, greatly reducing the time
      required to develop and debug long running Selenium tests. To make proper order (sequence) of stored / loaded
      fixtures, one has to define `fixtures_order`_ attribute of ``DjkTestCase`` derived class.
    * Automatic retry of the last Selenium commands execution in case current command is timed out when running at
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
-----
Support of the ``'choices' filter`` option ``multiple_choices``: ``True`` in  non-AJAX ``ListSortingView``. That allows
to perform ``in`` field lookups for the selected field filter which was previously available only in AJAX
``KoGridView``.

Large monolithic ``views.py`` split into smaller parts with symbols exported via module ``__init__.py`` for the
convenience and compatibility.

Alternative breadcrumbs layout of field filters widgets.

0.4.2
-----
* Compatibility to 1.10+ new-style middleware (thanks to Melvyn Sopacua).
* Fixed pagination when multiple filter field choices are seiected in views.ListSortingView.

0.4.3
-----
* Django 1.11 / Python 3.6 support.
* Selenium testing commands fixes.

0.5.0
-----
* Reworked recursive underscore.js template processor as ``App.Tpl`` class.
* Grid rows, grid row actions and ``ForeignKeyGridWidget`` placeholder now are displaying Django model instances verbose
  field names along with their values. Related model fields verbose names are displayed as well.
* Client-side components code now uses separate html5 data attribute ``data-component-class`` to bind DOM subtrees to
  Javascript component classes (for example grids), instead of placing everything into ``data-component-options``
  attribute as in previous versions.
* Overridable method to check whether two grid rows match the same Django model instance, suitable for RAW query
  grids with LEFT JOIN, which could have multiple rows with the same ``pkVal`` === ``null``.
* Automation commands now uses ``SimpleNamespace`` as chained context, which allows to use different nodes for relative
  search queries chaining. Currently implemented are relative Selenium queries for form, component, bootstrap dialog and
  grid. Much better tests coverage in `djk-sample`_ project. Many new Selenium commands are implemented, including
  ``screenshot`` command.
* ``ko_generic_inlineformset_factory`` supports dynamic adding / removal of generic inline formsets.
* ``FilteredRawQuerySet`` / ``ListQuerySet`` queryset classes ``values()`` and ``values_list()`` methods now support
  model relations in queried field names via ``__`` separator, just like usual Django querysets.
* Numerous bugfixes.

0.6.0
-----
* ``ActionsView`` with ``App.Actions`` client-side counterpart implements AJAX viewmodels routing to create generic AJAX
  actions / responses. It is now used as base foundation for ``App.ModelFormDialog`` / ``ModelFormActionsView`` and with
  knockout datatables actions (see `modelFormAction`_ method).
* ``ModelFormActionsView`` with ``App.ModelFormActions`` client-side counterpart allows to use Django forms / inline
  formsets with AJAX-powered BootstrapDialog via ``App.EditForm`` / ``App.EditInline`` client-side components.
* Selective skipping of ``DisplayText`` field widget rendering via setting ``skip_output`` property in
  ``get_text_method`` callback.
* Do not bind ``App.ko.Formset`` to display-only ``bs_inline_formsets()`` generated forms with inline formsets.
* Knockout grids (datatables) ``'button_footer'`` built-in action type.
* `djk_seed`_ Django management command.
* ``App.renderNestedList`` supports rendering of ``jQuery`` objects values.
* ``App.TabPane`` supports hiding / dynamic content loading of bootstrap 3 panes.
* ``App.Dialog`` is now closable by default. ``App.Dialog`` now can be run as component.
* ``html`` and ``replaceWith`` viewmodels applies ``App.initClient`` hooks, also works correctly with viewmodel ``.html``
  content that is not wrapped into top tags.
* Implemented ``App.propByPath`` which is now used to load Javascript object specified for ``App.renderNestedList`` as
  ``options.blockTags`` string. That allows to pass Javascript path string as ``options.blockTags`` via server-side AJAX
  response.
  ``App.Dialog`` class, ``'alert'`` / ``'alert_error'`` viewmodels suppports this functionality when ``message`` option
  has ``object`` type value.
* ``App.getClassFromPath`` / ``App.newClassFromPath`` is used by ``App.Tpl`` class factories.
* ``App.ko.Grid.iocKoFilter_*`` methods now are orthogonal thus are easier to override.
* Grid dialogs default hotkeys (``Escape``, ``Enter``).
* ``widgets.PrefillWidget`` - field widget to prefill form input value from bootstrap 3 dropdown menu. ``ListQuerySet``
  now has ``prefill_choices()`` method, which may provide prefill values for the form field from db field list of values.
* ``.badge.btn-*`` CSS classes which can be used to wrap long text in bootstrap buttons.
* Separate ``admin.js`` script to enable client-side of ``OptionalWidget`` in django admin.
* ``App.ko.Grid`` actions ``meta`` / ``list`` / ``meta_list`` first requests passing HTTP POST ``firstLoad`` variable to
  detect the initial grid datatable action at server-side in ``KoGridView`` derived class.
* Fixed selection of all current page grid datatable rows at miltiple grid datatable pages.
* `plugins.js`_: ``jQuery.id()`` to get multiple DOM ids, ``_.moveOptions()`` to move options with possible default
  values. ``highlightListUrl`` jQuery function bugfixes.
* `tooltips.js`_: ``form_error`` viewmodel handler, used to display AJAX forms validation errors now has the diagnostic
  for missing ``auto_id`` values and better support for multiple error messages per field.
* `contenttypes`_: Create content types / user groups / user permissions / Django model migration seeds. For the example
  of seeds, see `djk_seed`_ Django management command.
* ``FormWithInlineFormsets`` supports form auto_id prefix and optional customizeable form / formset constructor kwargs.
* ``json_validators`` module is renamed into `validators`_, which implements generic ``ViewmodelValidator`` class to
  validate AJAX submitted form input and to return error viewmodels when needed.
* ``DjkJSONEncoder`` serializes lazy strings to prevent json serialization errors.
* ``BaseSeleniumCommands`` logs browser errors.
* `tpl`_ module reworked and expanded. Nested lists use common class ``PrintList``. Implemented ``json_flatatt()`` and
  ``format_html_attrs()`` functions which work like built-in Django ``flatatt()`` and ``format_html()`` but automatically
  convert list / dict types of arguments into html attributes and / or JSON strings.
* Many bugfixes.
