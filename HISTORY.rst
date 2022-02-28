.. :changelog:

.. _add_instance: https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=add_instance
.. _bs_list.htm: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/bs_list.htm
.. _Bootstrap 3: https://github.com/Dmitri-Sintsov/djk-bootstrap3
.. _Bootstrap 4: https://github.com/Dmitri-Sintsov/djk-bootstrap4
.. _contenttypes: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/contenttypes.py
.. _custom tags: https://django-jinja-knockout.readthedocs.io/en/latest/clientside.html#clientside-custom-tags
.. _djk-sample: https://github.com/Dmitri-Sintsov/djk-sample
.. _djk_seed: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/management/commands/djk_seed.py
.. _dump_data: https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=dump_data
.. _FilteredRawQuerySet: https://django-jinja-knockout.readthedocs.io/en/latest/query.html#filteredrawqueryset
.. _fixtures_order: https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=fixtures_order
.. _ForeignKeyGridWidget: https://django-jinja-knockout.readthedocs.io/en/latest/datatables.html#foreignkeygridwidget
.. _.has_fixture(): https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=has_fixture
.. _KoGridView: https://django-jinja-knockout.readthedocs.io/en/latest/datatables.html
.. _ListQuerySet: https://django-jinja-knockout.readthedocs.io/en/latest/query.html#listqueryset
.. _modelFormAction: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=modelFormAction&utf8=%E2%9C%93
.. _MultipleKeyGridWidget: https://django-jinja-knockout.readthedocs.io/en/latest/datatables.html#multiplekeygridwidget
.. _Nested components: https://django-jinja-knockout.readthedocs.io/en/latest/clientside.html#clientside-nested-components
.. _Nested serializer: https://django-jinja-knockout.readthedocs.io/en/latest/usage.html#quickstart-serializers
.. _plugins.js: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/static/djk/js/plugins.js
.. _Renderer: https://django-jinja-knockout.readthedocs.io/en/latest/tpl.html#tpl-renderer
.. _reverseq(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=reverseq&type=&utf8=%E2%9C%93
.. _Sparse components: https://django-jinja-knockout.readthedocs.io/en/latest/clientside.html#clientside-sparse-components
.. _template attributes merging: https://django-jinja-knockout.readthedocs.io/en/latest/clientside.html#clientside-attributes-merging
.. _tooltips.js: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/static/djk/js/tooltips.js
.. _tpl: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/tpl.py
.. _validators: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/validators.py
.. _viewmodels: https://django-jinja-knockout.readthedocs.io/en/latest/viewmodels.html
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
* "django.admin-like" AJAX functionality implemented via `KoGridView`_ class-based view.
* ``$.inherit()`` Javascript prototype inheritance function now supports multi-level inheritance with nested
  ``._super._call()``.
* `FilteredRawQuerySet`_ supports Django raw querysets with ``.filter()`` / ``.exclude()`` / ``.order_by()`` /
  ``.values()`` / ``.values_list()`` and SQL level slicing.
* `ForeignKeyGridWidget`_ provides ``ForeignKeyRawIdWidget`` -like functionality via AJAX query / response in non-admin
  forms to select ModelForm foreign key values.
* Client-side generation of view urls with kwargs in Javascript client-side routes via ``App.routeUrl()``.
* Nested autocompiled underscore.js client-side templates for Javascript components, primarily used with Knockout.js,
  but is not limited to.

0.3.0
-----
* ``ContentTypeLinker`` - added method to return html representation of content types framework related object (html
  link with the description by default).
* `FilteredRawQuerySet`_ now supports more precise ``.count()`` method to calculate the length of raw queryset.
* `ListQuerySet`_ implements large part of queryset methods for the lists of Django model instances. Such lists are
  created by Django queryset ``.prefetch_related()`` method.
* Auto-highlight bootstrap navs which have 'auto-highlight' css class at client-side.
* ``bs_tabs()`` Jinja2 macro which simplifies generation of bootstrap tabs. Bootstrap tabs now support automatic
  switching via window.location.hash change.
* ``ListSortingView`` improvements:

  * Supports graceful handling of error reporting, producing in-place messages instead of just rising an exception.
  * ``.get_filter_args()`` / ``.get_no_match_kwargs()`` methods are implemented to generate macro arguments used in
    `bs_list.htm`_ Jinja2 template. This allows to override default messages for field filters / no match reports in
    the grid classes.

* `KoGridView`_ has multiple improvements:

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

* `ForeignKeyGridWidget`_ also autodetects foreign key filter ``fkGridOptions``.
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
* ``CustomFullClean`` / ``StripWhitespaceMixin`` mixins for Django forms.

middleware.py
~~~~~~~~~~~~~
* ``ContextMiddleware`` class:

  * Supports request mocking when running not under HTTP server, for example as shell command / celery task.
  * Supports request-time storage of lists / dicts of objects via `add_instance`_ / `yield_out_instances`_ methods.

query.py
~~~~~~~~
* `FilteredRawQuerySet`_ supports Q expressions (Q objects) with relation mapping.

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

If form that defined widget uses ``WidgetInstancesMixin`` and model field instance has ``get_str_fields()`` method
implemented, such field will be auto-rendered via ``print_list_group()`` / ``print_bs_well()`` functions of ``tpl``
module to produce structured output.

ko_grid_body.htm
~~~~~~~~~~~~~~~~
*  Fixed ``ko_grid_body()`` macro not including underscore.js templates copied with different ``template_id`` when these
   templates were called from related underscore.js templates.

grid.js
~~~~~~~
* Reset filter now uses ``undefined`` value instead of ``null`` value because filtering by ``None`` value is now
  supported in `KoGridView`_.
* ``App.ko.GridRow`` class ``display()`` method now automatically picks nested relation value from nested  ``strFields``
  value, when available. That allows to traverse nested ``get_str_fields()`` values automatically.

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
`KoGridView`_.

Large monolithic ``views.py`` split into smaller parts with symbols exported via module ``__init__.py`` for the
convenience and compatibility.

Alternative breadcrumbs layout of field filters widgets.

0.4.2
-----
* Compatibility to 1.10+ new-style middleware (thanks to Melvyn Sopacua).
* Fixed pagination when multiple filter field choices are selected in views.ListSortingView.

0.4.3
-----
* Django 1.11 / Python 3.6 support.
* Selenium testing commands fixes.

0.5.0
-----
* Reworked recursive underscore.js template processor as ``App.Tpl`` class.
* Grid rows, grid row actions and `ForeignKeyGridWidget`_ placeholder now are displaying Django model instances verbose
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
* `FilteredRawQuerySet`_ / `ListQuerySet`_ queryset classes ``values()`` and ``values_list()`` methods now support
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
* ``App.objByPath`` / ``App.newClassByPath`` is used by ``App.Tpl`` class factories.
* ``App.ko.Grid.iocKoFilter_*`` methods now are orthogonal thus are easier to override.
* Grid dialogs default hotkeys (``Escape``, ``Enter``).
* ``widgets.PrefillWidget`` - field widget to prefill form input value from bootstrap 3 dropdown menu. `ListQuerySet`_
  now has ``prefill_choices()`` method, which may provide prefill values for the form field from db field list of values.
* ``.badge.btn-*`` CSS classes which can be used to wrap long text in bootstrap buttons.
* Separate ``admin.js`` script to enable client-side of ``OptionalWidget`` in django admin.
* ``App.ko.Grid`` actions ``meta`` / ``list`` / ``meta_list`` first requests passing HTTP POST ``firstLoad`` variable to
  detect the initial grid datatable action at server-side in `KoGridView`_ derived class.
* Fixed selection of all current page grid datatable rows at multiple grid datatable pages.
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

0.7.0
-----
* Grids (datatables)

  * New type of action ``'pagination'``.

    * There are two built-in actions of this type implemented: ``'rows_per_page'`` and ``'switch_highlight'``.
  * Support of compound columns.
  * ``glyphicon`` actions are rendered in the single column of datatable, instead of each action per column.
* Static assets are moved to '/djk' subdirectory, minimizing the risk of conflicts with third party assets.
* Updated to latest versions of Knockout.js / jQuery / Bootstrap 3 (should also work with not-too-old ones).
* `viewmodels`_ AJAX response routing is rewritten as ``App.ViewModelRouter`` class with default instance
  ``App.vmRouter``. It now supports binding viewmodel handlers to Javascript class instances methods.
* Optional built-in Javascript error logger.
* ``App.NestedList`` internally used by ``App.renderNestedList`` for greater flexibility of client-side Javascript
  nested lists rendering. ``App.NestedList`` now supports ordered maps via ``_.ODict`` instances.
* Ajax forms submitting is refactored into ``App.AjaxForm`` class, while setting up the ajax forms is performed by
  ``App.AjaxForms``.
* ``App.readyInstances`` introduced for global client-side IoC, available in custom user scripts as well.
* Knockout.js method subscription / unsubscription is placed into ``App.ko.Subscriber`` mixin class.
* ``focus`` binding is implemented for Knockout.js.
* Request mock-up when running without web server allows reverse resolving of FQN urls in console management commands
  and in background celery tasks via `reverseq()`_ calls when sites framework is correctly set up.
* ``ast_eval`` template tag.
* Headless Chrome Selenium webdriver support.

0.8.0
-----
* Supports both `Bootstrap 4`_ and `Bootstrap 3`_ via pluggable djk_ui application.
* Default rendering layouts for fields / forms / related forms / inline formsets, which can be customized by providing
  custom template or via inheriting from `Renderer`_ class.
* Underscore.js templates support `template attributes merging`_ and `custom tags`_.
* `Nested components`_ and `Sparse components`_.
* `Nested serializer`_.

0.8.1
-----
* Dropped Django<=1.10 support. Added Django 2.2 support.
* Dropped IE9..10 support.
* Current request ``.view_title`` is stored in the ``.resolver_match``.
* ``bs_collapse()`` Jinja2 macro supports setting the initial collapse state ('out' / 'in') and Bootstrap card type.
* Implemented ``App.OrderedHooks`` class used to execute ``App.initClientHooks`` in proper order.
* ``grid.js``: cleaned up init / shutdown ``.applyBindings()`` / ``.cleanBindings()`` / ``.runComponent()`` /
  ``.removeComponent()`` code for ``App.ko.Grid`` and related classes.
* ``grid.js``: Implemented action ``meta_list`` preload.
* Refactored views classes inheritance hierarchy.
* middleware: refactored middleware classes inheritance hierarchy.
* middleware: less intrusive, better compatibility with third party modules.
* middleware: ``.djk_request()``_ ``.djk_view()`` methods are called only for ``DJK_APPS`` views by default.
* middleware : ``json_response()`` shortcut method.
* ``RendererModelForm`` ``.has_saved_instance()`` method to check whether current Django ModelForm has the bound and
  saved instance.
* `ListQuerySet`_: implemented ``|`` ``+`` operators.
* ``DjkJSONEncoder``: moved to ``tpl`` module. Encoding improvements.
* Refactored forms module to forms package with base / renderers / validators modules.
* HTTP response related classes / methods are moved to ``http`` module.

0.8.2
-----
* bdist wheel fix.
* PyPi readme fix.

0.9.0
-----
* ``django-jinja`` dependency is off by default, may be removed in the future.
* ``TemplateContext`` class is used to manage client-side data injection.
* Less dependency on ``DJK_MIDDLEWARE``.
* Templates / selenium test improvements.

1.0.0
-----
* Django 3.1a1 / Bootstrap 4.5 / Knockout 3.5 support.
* `MultipleKeyGridWidget`_ allows to edit many to many relationships for Django models.
* ``PageContext`` to inject view title / client data / client routes / custom scripts to templates via
  ``TemplateResponse``.
* ``App.renderValue`` supports jQuery elements / nested arrays / objects / strings HTML rendering.
* ``App.renderNestedList`` supports optional unwrapping of single top DOM node.
* Improved Bootstrap popovers support with jQuery ``.getPopoverTip()`` / ``.getVisiblePopovers()`` /
  ``.closeVisiblePopovers()`` plugins.
* Support for nested components in formsets.js (empty_form) 'anonymous_template' Knockout binding.
* ``UrlPath`` class for automatic ``re_path()`` generation with positional named keyword arguments.
