=============================
django-jinja-knockout
=============================

.. image:: https://badge.fury.io/py/django-jinja-knockout.png
    :target: https://badge.fury.io/py/django-jinja-knockout

Bootstrap / Jinja2 / Knockout.js integration into Django projects.

Documentation
-------------

The full documentation is at https://django-jinja-knockout.readthedocs.org.

Quick notes:

* Credits_
.. _Credits: AUTHORS.rst
* How to contribute_
.. _contribute: CONTRIBUTING.rst
* History_
.. _History: HISTORY.rst


Quickstart
----------

Inside virtualenv of your Django 1.8 project, install `django-jinja-knockout`::

    pip3 install django-jinja-knockout

Then use it in a project::

    import django_jinja_knockout

Key features overview
---------------------

app.js
~~~~~~
* Implements client-side helper classes for Twitter Bootstrap 3.
* Implements client-side response routing:

 * Separates AJAX calls from their callback processing, allowing to specify AJAX routes in button html5 data
   attributes without implicit callback.
 * Allows to write more modular Javascript code.
 * Client-side view models can also be executed from Javascript code directly.
 * Possibility to optionally inject client-side view models into html pages, executing these onload.
 * Possibility to execute client-side viewmodels from current user session (also onload).

admin.py
~~~~~~~~
* Allow only some model instances to be deleted in django.admin.
* Make readonly foreignkey field to be rendered as link to target model change view.

context_processors.py
~~~~~~~~~~~~~~~~~~~~~
Context processor adds many useful functions and classes into Jinja2 template context, allowing to write more powerful
and more flexible Jinja2 templates.

* Functions to manipulate css classes in Jinja2 templates: `add_css_classes()` / `add_css_classes_to_dict()`.
* Client data to be injected as JSON to HTML page, which is accessible then at client-side, including optional JSON
  response view models (client-side response routing).
* Client configuration passed to be accessible at client-side (in Javascript app):

 * `'csrfToken'` - current CSRF token to be used with AJAX POST from Javascript;
 * `'staticPath'` - root static url path to be used with AJAX requests from Javascript;
 * `'userId'` - current user id, 0 for anonymous; used both in Jinja2 templates to detect authorized users and from
   Javascript mostly with AJAX requests;
 * `'url'` - Python dict mapped to Javascript object with the selected list of url routes to be used with AJAX
   requests from Javascript (to do not have hard-coded app urls in Javascript code);

* `ContentTypeLinker` class to easily generate contenttypes framework links in Jinja2 templates.
* `get_verbose_name()` allows to get verbose_name of Django model field, including related (foreign) and reverse-related
  fields.
* Django functions to format html content: `flat_att()` / `format_html()` / `force_text()`.
* Possibility to raise exceptions in Jinja2 templates via `{{ raise('Error message') }}`
* `reverseq()` allows to build reverse urls with optional query string specified as Python dict.
* `sdv_dbg()` for optional template variables dump (debug).
* Context processor is inheritable which allows greater flexibility to implement your own custom features by
  overloading methods.

forms.py
~~~~~~~~
* `BootstrapModelForm` - Form with field classes stylized for Bootstrap 3
* `DisplayModelMetaclass` - Metaclass used to create read-only forms (display models).
* `WidgetInstancesMixin` - Provides model instances of model bound ModelForm in field widgets. It allows to make custom
  flexible display model forms.
* `set_knockout_template` - Monkey-patching methods for formset to support knockout.js version of `empty_form`. Allows
  to dynamically add /remove new forms to inline formsets, including custom fields with inline javascript.
* `FormWithInlineFormsets` - Layer on top of related form and it's many to one multiple formsets. GET / CREATE / UPDATE.
  Works both in function views and in class-based views (CBVs).
* `SeparateInitialFormMixin` - Mixed to BaseInlineFormset to use different form classes for already existing model
  objects and for newly added ones (empty_form). May be used with DisplayModelMetaclass to display existing forms as
  read-only, while making newly added ones editable.

middleware.py
~~~~~~~~~~~~~
* Access current request anywhere in form / formset / field widget code - but please do not abuse this feature by
  using request in models code which might be executed without HTTP request (eg. in the management commands)::

    ContextMiddleware.get_request()

* Support optional client-side viewmodels injection from current user session.
* Automatic timezone detection and activation from browser (which should be faster than using maxmind geoip database).
* Secured views permissions with optional checks for AJAX requests, required checks for anonymous / inactive access /
  Django permission, defined as django.conf.urls.url() extra kwargs per view.
  Anonymous views require explicit permission::

    url(r'^signup/$', 'my_app.views.signup', name='signup', kwargs={'allow_anonymous': True})
* View title is optionally defined as url kwargs `'view_title'` key value, to be used in generic templates
  (one template per many views).
* View kwargs are stored into `request.view_kwargs` to make these accessible in forms when needed.
* Middleware is inheritable which allows greater flexibility to implement your own extended features via overloaded
  methods.

models.py
~~~~~~~~~
* `ContentTypeLinker` class to easily generate contenttypes framework links in Jinja2 templates.
* `get_verbose_name()` allows to get verbose_name of Django model field, including related (foreign) and reverse-related
  fields.

tpl.py
~~~~~~
Various formatting functions, primarily to be used in django.admin readonly_fields, Jinja2 templates and `DisplayText`
widgets.
* `limitstr()` - cut string after specified length.
* `repeat_insert()` - separate string every nth character with specified separator characters.
* `print_list()` - print nested HTML list. It's used to format HTML in JSON responses and in custom `DisplayText`
  widgets.
* `print_table()` - print uniform 2D table (no colspan / rowspan yet).
* `print_bs_labels()` - print HTML list as Boostrap 3 labels.
* `reverseq()` - construct url with query parameters.
* Manipulation with css classes:
 * `add_css_classes()`
 * `remove_css_classes()`
 * `add_css_classes_to_dict()` - optimized for usage as argument of django.forms.utils.flatatt;
 * `remove_css_classes_from_dict()` - optimized for usage as argument of django.forms.utils.flatatt;
* `html_to_text()` - convert html fragment with anchor links into plain text with text links.
* `format_local_date()` - output localized Date / DateTime.

viewmodels.py
~~~~~~~~~~~~~
Server-side Python functions and classes to manipulate lists of client-side view models. Mostly are used with AJAX JSON
responses and app.js client-side response routing.

views.py
~~~~~~~~
* `auth_redirect()` - authorization required response with redirect to login. Supports next' url query argument.
  Supports JSON viewmodel response.
* `error_response()` / `exception_response()` - wrappers around django.http.HttpResponseBadRequest to allow JSON
  viewmodel response in AJAX requests in case of error / exception occured.
* `cbv_decorator()` - May be used to check class-based views permissions.
* `prepare_bs_navs()` - used to highlight current url in Bootstrap 3 navbars.
* `BsTabsMixin` - Automatic template context processor for bs_navs() jinja2 macro.
* `FormWithInlineFormsetsMixin` - CBV mixin with built-in support of django_jinja_knockout.forms.FormWithInlineFormsets.
  There is one ModelForm and one or many related ModelFormsets, ModelForm also is optional (can be None).
  Also supports client-side addition and removal of inline forms with Knockout.js (support of custom widgets with inline
  Javascript). HTML rendering usually is performed with Bootstrap 3 Jinja2 `bs_inline_formsets()` macro.
* `InlineCreateView` - CBV view to create new models with one to many related models.
* `InlineDetailView` - CBV view to display models with one to many related models. Suitable both for CREATE and for
  VIEW actions (via form `metaclass=DisplayModelMetaclass`).
* `ListSortingView` - ListView with built-in support of sorting and field filtering.
* `ContextDataMixin` - allows to inject pre-defined dict of `extra_context_data` into template context of CBV.

widgets.py
~~~~~~~~~~
* `OptionalWidget` - A two-component MultiField, a checkbox that indicates optional value and a field itself which
  is disabled via client-side plugins.js when checkbox is unchecked.
* `DisplayText` - Read-only widget for existing models. Specify manually as `ModelForm.widgets` or
  `ModelForm.fields.widget` to make one of form fields read-only, or use
  `django_jinja_knockout.forms.DisplayModelMetaclass` to set all field widgets of form as DisplayText, making the
  whole form read-only. In last case form will have special table rendering in Jinja2 `bs_form()` /
  `bs_inline_formsets()` macros.
  Widget allows to specify custom formatting callback to display complex fields, including foreign relationships,
  pre-defined string mapping for scalar `True` / `False` / `None` and layout override for `bs_form()` /
  `bs_inline_formsets()` macros.

Cookiecutter Tools Used in Making This Package
----------------------------------------------

*  cookiecutter
*  cookiecutter-djangopackage
