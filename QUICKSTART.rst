.. _clientside: https://django-jinja-knockout.readthedocs.io/en/latest/clientside.html
.. _datatables: https://django-jinja-knockout.readthedocs.io/en/latest/datatables.html
.. _discover_grid_options(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=discover_grid_options
.. _DJK_APPS: https://github.com/Dmitri-Sintsov/djk-sample/search?l=Python&q=djk_apps
.. _forms: https://django-jinja-knockout.readthedocs.io/en/latest/forms.html
.. _get_str_fields(): https://django-jinja-knockout.readthedocs.io/en/latest/datatables.html?highlight=get_str_fields
.. _management_commands: https://django-jinja-knockout.readthedocs.io/en/latest/management_commands.html
.. _middleware: https://django-jinja-knockout.readthedocs.io/en/latest/middleware.html
.. _models: https://django-jinja-knockout.readthedocs.io/en/latest/models.html
.. _pretetch_related: https://docs.djangoproject.com/en/dev/ref/models/querysets/#prefetch-related
.. _PrintList: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=PrintList
.. _Renderer: https://django-jinja-knockout.readthedocs.io/en/latest/forms.html#renderers
.. _Renderers: https://django-jinja-knockout.readthedocs.io/en/latest/forms.html#renderers
.. _query.py: https://django-jinja-knockout.readthedocs.io/en/latest/query.html
.. _utils.sdv: https://django-jinja-knockout.readthedocs.io/en/latest/utils_sdv.html
.. _tpl: https://django-jinja-knockout.readthedocs.io/en/latest/tpl.html
.. _viewmodels: https://django-jinja-knockout.readthedocs.io/en/latest/viewmodels.html
.. _views: https://django-jinja-knockout.readthedocs.io/en/latest/views.html

Key features overview
---------------------

Datatables
----------

The package includes server-side (Python) and client-side (Javascript) code to quickly create easy to use datatables
with standard and custom actions for Django models, including adding, editing, deleting.

See `datatables`_ for more info.

Client-side
-----------

There are lots of client-side Javascript included into the package. It includes ready to use components such as:

* Django ModelForm / Formset AJAX dialogs.
* Django models AJAX datatables.
* Nested templating with custom tags.
* Client-side widget support.
* AJAX `viewmodels`_.

See `clientside`_ for more info.

admin.py
--------
* ``DjkAdminMixin`` - optionally inject css / scripts into django.admin to support widgets.OptionalInput.
* ``ProtectMixin`` - allow only some model instances to be deleted in django.admin.
* ``get_admin_url`` - make readonly foreignkey field to be rendered as link to the target model admin change view.
* ``get_model_change_link`` - generates the link to django admin model edit page.

forms.py / formsets.js
----------------------
* `Renderers`_ for forms / formsets / form fields.
* AJAX form processing.
* Display read-only "forms" (model views).
* ``BootstrapModelForm`` - Form with field classes stylized for Bootstrap. Since version 0.4.0 it also always has
  ``request`` attribute for convenience to be used in ``clean()`` method and so on.
* ``DisplayModelMetaclass`` - Metaclass used to create read-only "forms", to display models as html tables.
* ``WidgetInstancesMixin`` - Provides model instances bound to ``ModelForm`` in field widgets. It helps to make custom
  ``get_text_fn`` / ``get_text_method`` callbacks for ``DisplayText`` form widgets .
* ``set_knockout_template`` - Monkey-patching methods for formset to support knockout.js version of ``empty_form``. Allows
  to dynamically add / remove new forms to inline formsets, including third-party custom fields with inline Javascript
  (such as AJAX populated html selects, rich text edit fields).
* ``FormWithInlineFormsets`` - Layer on top of related form and it's many to one multiple formsets. GET / CREATE / UPDATE.
  Works both in function views and in class-based views (CBVs).
* ``SeparateInitialFormMixin`` - Mixed to ``BaseInlineFormset`` to use different form classes for already existing model
  objects and for newly added ones (empty_form). May be used with ``DisplayModelMetaclass`` to display existing forms as
  read-only, while making newly added ones editable.
* ``CustomFullClean`` / ``StripWhilespaceMixin`` mixins for Django forms.

See `forms`_ for the detailed explanation.

management/commands/djk_seed.py
-------------------------------
``djk_seed`` management command allows to execute post-migration database seeds for specified Django app / model.

See `management_commands`_ for more info.

middleware.py
-------------
* Middleware is extendable (inheritable).
* Client-side `viewmodels`_ via AJAX result and / or injected into html page / user session.
* Automatic timezone detection and timezone activation from the browser.
* request.custom_scripts for dynamic injection of client-side scripts.
* `DJK_APPS`_ views require permission defined in urls.py by default, which increases the default security.
* Request mock-up.
* Mini-router.

See `middleware`_ for more info.

models.py
---------
* Get users with specific permissions.
* Get related fields / related field values.
* Model class / model instance / model fields metadata retrieval.
* ``model_values()`` to get queryset ``.values()`` like dict for single Django model object instance.

See `models`_ for more info.

query.py
--------
* Allows to create raw Django querysets with filter methods such as filter() / order_by() / count().
* Allows to convert Python lists to Django-like querysets, which is useful to filter the data received via
  `pretetch_related`_ Django ORM reverse relation query.

It makes possible to use raw SQL queries and Python lists as the arguments of datatables / filtered lists.
See `query.py`_ for more info.

.. _quickstart_serializers:

serializers.py
--------------
Nested serializer for Django model instances with localization / internationalisation. Note that the serializer is
written to create logs / archives of model object changes. It's unused by built-in viewmodels / datatables. Datatables
use `get_str_fields()`_ model serialization method instead.

tpl.py
------
* `Renderer`_ class for recursive object context rendering.
* `PrintList`_ class for nested formatting of Python structures. Includes various formatting wrapper functions.
* HTML / CSS manipulation in Python.
* Date / url / JSON formatting.
* Model / content type links formatters.
* `discover_grid_options()`_ enables to embed :doc:`datatables` into arbitrary HTML DOM subtrees.

See `tpl`_ for more info.

utils/sdv.py
------------
Low-level helper functions:

* Class / model helpers.
* Debug logging.
* Iteration.
* Nested data structures access.
* String conversion.

See `utils.sdv`_ for more info.

viewmodels.py
-------------
Server-side Python functions and classes to manipulate lists of client-side viewmodels. Mostly are used with AJAX JSON
responses and in ``app.js`` client-side response routing. Read `viewmodels`_ documentation for more info.

views submodule
---------------
* Permission / view title kwargs.
* ``FormWithInlineFormsetsMixin`` - view / edit zero or one ModelForm with one or many related formsets. Supports
  dynamic formset forms via ``formsets.js`` and ``set_knockout_template`` patching.
* ``BsTabsMixin`` - insert additional context data to support Bootstrap navbars.
* ``ContextDataMixin` - insert arbitrary context data via ``extra_context_data`` class attribute value.
* ``ListSortingView`` - non-AJAX filtered / sorted ListView, with partial support of AJAX ``KoGridView`` settings.
* AJAX views: ``ActionsView`` / ``ModelFormActionsView`` / ``KoGridView``

See `views`_ for the detailed explanation.
