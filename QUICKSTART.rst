===========
Quickstart
===========

.. _bs_field(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/bs_field.htm
.. _bs_form(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/bs_form.htm
.. _bs_inline_formsets(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/bs_inline_formsets.htm
.. _get_FOO_display(): https://docs.djangoproject.com/en/dev/ref/models/instances/#django.db.models.Model.get_FOO_display
.. _get_str_fields(): https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=get_str_fields
.. _grids documentation: https://django-jinja-knockout.readthedocs.io/en/latest/grids.html
.. _FilteredRawQuerySet: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/query.py
.. _FilteredRawQuerySet sample: https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=FilteredRawQuerySet
.. _$.optionalInput: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?utf8=%E2%9C%93&q=optionalinput
.. _macros: https://django-jinja-knockout.readthedocs.io/en/latest/macros.html
.. _plugins.js: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/static/js/front/plugins.js
.. _viewmodels: https://django-jinja-knockout.readthedocs.io/en/latest/viewmodels.html

Key features overview

app.js / tooltips.js
--------------------
* Implements client-side helper classes for Twitter Bootstrap 3.

Viewmodels (client-side response routing)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
See `viewmodels`_ for detailed explanation.

* Separates AJAX calls from their callback processing, allowing to specify AJAX routes in button html5 data
  attributes without defining DOM event handler and implicit callback.
* Allows to write more modular Javascript code.
* Client-side view models can also be executed from Javascript code directly.
* Possibility to optionally inject client-side view models into html pages, executing these onload.
* Possibility to execute client-side viewmodels from current user session (persistent onload).
* ``App.viewHandlers`` - predefined built-in AJAX response routing viewmodels to perform standard client-side actions,
  such as displaying BootstrapDialogs, manipulate DOM content, graceful AJAX errors handling and more.

Simplifying AJAX calls
~~~~~~~~~~~~~~~~~~~~~~

* ``App.routeUrl`` - mapping of Django server-side route urls to client-side Javascript.
* ``App.ajaxButton`` - automation of button click event AJAX POST handling for Django.
* ``App.ajaxForm`` - Django form AJAX POST submission with validation errors display via response client-side viewmodels.
  By default requires only an ``is_ajax=True`` argument of ``bs_form()`` / ``bs_inline_formsets()`` Jinja2 macros.
  The whole process of server-side to client-side validation errors mapping is performed by
  ``FormWithInlineFormsetsMixin.form_valid()`` / ``form_invalid()`` methods, defined in ``django_jinja_knockout.views``.
  Also supports class-based view ``get_success_url()`` automatic client-side redirect on success.
  Supports multiple Django POST routes for the same AJAX form via multiple ``input[type="submit"]`` buttons in the
  generated form html body.

* ``App.Dialog`` BootstrapDialog wrapper.
* ``App.get()`` / ``App.post()`` automate execution of AJAX POST handling for Django and allow to export named Django
  urls like ``url(name='my_url_name')`` to be used in client-side code directly.

* Client initialization performed separately from ``$(document).ready()`` initialization, because client initialization
  also may be used for dynamically added HTML DOM content (from AJAX response or via Knockout.js templates).
  For example, custom ``'formset:added'`` jQuery event automatically supports client initialization (field classes /
  field event handlers) when new form is added to inline formset dynamically.
* ``$(document).ready()`` event handler uses it's own hook system for plugins, to do not interfere with external scripts
  code.

Underscore.js templates
~~~~~~~~~~~~~~~~~~~~~~~
Underscore.js templates may be autoloaded as ``App.Dialog`` modal body content. Also they may be used in conjunction
with Knockout.js templates to generate components.

* ``App.compileTemplate`` provides singleton factory for compiled underscore.js templates from ``<script>`` tag with
  specified DOM id ``tplId``.
* ``App.domTemplate`` converts template with specified DOM id and template arguments into jQuery DOM subtee.
* ``App.loadTemplates`` automatically loads existing underscore.js templates by their DOM id into DOM nodes with html5
  ``data-template-id`` attributes for specified ``$selector``.

Components
~~~~~~~~~~
``App.Components`` class allows to automatically instantiate Javascript classes by their string path specified in
element's ``data-component-options`` html5 attribute and bind these to that element. Primarily used to provide
Knockout.js ``App.ko.Grid`` component auto-loading / auto-binding, but is not limited to Knockout.js.

plugins.js
----------
Set of jQuery plugins.

Multiple level Javascript class inheritance
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
* ``$.inherit`` - implementation of meta inheritance.
  Copies parent object ``prototype`` methods into ``instance`` of pseudo-child. Supports nested multi-level inheritance
  with chains of ``_super`` calls in Javascript via ``$.SuperChain`` class.

Multi-level inheritance should be specified in descendant to ancestor order.

.. highlight:: javascript

For example to inherit from base class App.ClosablePopover, then from immediate ancestor class App.ButtonPopover,
use the following Javascript code::

    App.CustomPopover = function(options) {
        // Immediate ancestor.
        $.inherit(App.ButtonPopover.prototype, this);
        // Base ancestor.
        $.inherit(App.ClosablePopover.prototype, this);
        this.init(options);
    };

    (function(CustomPopover) {

        CustomPopover.init = function(options) {
            // Will call App.ButtonPopover.init(), with current 'this' context when such method is defined, or
            // will call App.ClosablePopower.init(), with current 'this' context, otherwise.
            // App.ButtonPopover.init() also will be able to call it's this._super._call('init', options);
            // as inheritance chain.
            this._super._call('init', options);
        };

    })(App.CustomPopover.prototype);

Real examples of inheritance are available in ``button-popover.js`` ``App.ButtonPopover`` class implementation and in
``ko-grid.js``, including multi-level one::

    ActionTemplateDialog.inherit = function() {
        // First, import methods of direct ancestor.
        $.inherit(App.ActionsMenuDialog.prototype, this);
        // Second, import methods of base class that are missing in direct ancestor.
        $.inherit(App.Dialog.prototype, this);
        // Third, import just one method from ModelFormDialog (simple mixin).
        this.getButtons = App.ModelFormDialog.prototype.getButtons;
    };

jQuery plugins
~~~~~~~~~~~~~~
* ``$.autogrow`` plugin to automatically expand text lines of textarea elements;
* ``$.linkPreview`` plugin to preview outer links in secured html5 iframes;
* ``$.scroller`` plugin - AJAX driven infinite vertical scroller;

.. highlight:: html

These jQuery plugins have corresponding Knockout.js bindings in ``app.js``, simplifying their usage in client-side
scripts:

* ``ko.bindingHandlers.autogrow``::

    <textarea data-bind="autogrow: {rows: 4}"></textarea>
* ``ko.bindingHandlers.linkPreview``::

    <div data-bind="html: text, linkPreview"></div>
* ``ko.bindingHandlers.scroller``::

    <div class="rows" data-bind="scroller: {top: 'loadPreviousRows', bottom: 'loadNextRows'}">

admin.py
--------
* ``ProtectMixin`` - allow only some model instances to be deleted in django.admin.
* ``get_admin_url`` - make readonly foreignkey field to be rendered as link to the target model admin change view.

context_processors.py
---------------------
Context processor adds many useful functions and classes into Jinja2 template context, allowing to write more powerful
and more flexible Jinja2 templates.

Functions to manipulate css classes in Jinja2 templates
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

* ``add_css_classes()`` - similar to jQuery ``$.addClass()`` function;
* ``add_css_classes_to_dict()`` - similar to previous one but automatically uses 'class' key value of supplied dict
  by default, which is handy to use processed dictionary as argument of Django ``flatatt()`` call.

Injection of server-side data into loaded page
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
* ``client_data`` dict to be injected as JSON to HTML page, which is accessible then at client-side as
  ``App.clientData`` Javascript object, including optional JSON client-side viewmodels, executed when html page is
  loaded::

    <script language="JavaScript">
        App.conf = {{ client_conf|escapejs(True) }};
        App.clientData = {{ client_data|escapejs(True) }};
    </script>

* ``cilent_conf`` dict passed to be accessible at client-side (``App.conf`` Javascript object) with the following keys:

 * ``'csrfToken'`` - current CSRF token to be used with AJAX POST from Javascript;
 * ``'staticPath'`` - root static url path to be used with AJAX requests from Javascript;
 * ``'userId'`` - current user id, 0 for anonymous; used both in Jinja2 templates to detect authorized users and from
   Javascript mostly with AJAX requests;

Injection of Django url routes into loaded page
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
* ``App.conf.url`` - Python tuple from ``context_processors.TemplateContextProcessor.CLIENT_ROUTES`` defines selected
  list of Django url routes mapped to Javascript object to be used with AJAX requests from Javascript (to do not have
  hard-coded app urls in Javascript code). Since version 0.2.0, also supports url names with kwargs.

Contenttypes framework helpers
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
* ``ContentTypeLinker`` class to easily generate contenttypes framework links in Jinja2 templates::

    {% set ctl = ContentTypeLinker(object, 'content_type', 'object_id') %}
    {% if ctl.url is not none %}
        <a href="{{ ctl.url }}" title="{{ str(ctl.obj_type) }}" target="_blank">
    {% endif %}
        {{ ctl.description }}
    {% if ctl.url is not none %}
        </a>
    {% endif %}

Meta and formatting
~~~~~~~~~~~~~~~~~~~
.. highlight:: python

* ``get_verbose_name()`` allows to get verbose_name of Django model field, including related (foreign) and reverse
  related fields.
* Django functions to format html content: ``flatatt()`` / ``format_html()`` / ``force_text()``.
* Possibility to raise exceptions in Jinja2 templates via ``{{ raise('Error message') }}``

Advanced url resolution, both forward and reverse
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

* ``resolve_cbv()`` takes url_name and kwargs and returns a function view or a class-based view for these arguments,
  when available::

    resolve_cbv(url_name, view_kwargs)

* ``reverseq()`` allows to build reverse urls with optional query string specified as Python dict::

    reverseq('my_url_name', kwargs={'project_id': project.pk}, query={'type': 'approved'})

Miscelaneous
~~~~~~~~~~~~
* ``sdv_dbg()`` for optional template variable dump (debug).
* Context processor is inheritable which allows greater flexibility to implement your own custom features by
  overloading methods.

forms.py / formsets.js
----------------------
* ``BootstrapModelForm`` - Form with field classes stylized for Bootstrap 3
* ``DisplayModelMetaclass`` - Metaclass used to create read-only "forms", to display models as html tables.
* ``WidgetInstancesMixin`` - Provides model instances bound to ``ModelForm`` in field widgets. It helps to make custom
  ``DisplayText`` form widgets ``get_text_cb`` callbacks.
* ``set_knockout_template`` - Monkey-patching methods for formset to support knockout.js version of ``empty_form``. Allows
  to dynamically add / remove new forms to inline formsets, including third-party custom fields with inline Javascript
  (such as AJAX populated html selects, rich text edit fields).
* ``FormWithInlineFormsets`` - Layer on top of related form and it's many to one multiple formsets. GET / CREATE / UPDATE.
  Works both in function views and in class-based views (CBVs).
* ``SeparateInitialFormMixin`` - Mixed to ``BaseInlineFormset`` to use different form classes for already existing model
  objects and for newly added ones (empty_form). May be used with ``DisplayModelMetaclass`` to display existing forms as
  read-only, while making newly added ones editable.

middleware.py
-------------

* Access current request instance anywhere in form / formset / field widget code - but please do not abuse this feature
  by using request in models code which might be executed without HTTP request (eg. in the management commands)::

    from django_jinja_knockout.middleware import ContextMiddleware

    ContextMiddleware.get_request()

* Support optional client-side viewmodels injection from current user session.
* Automatic timezone detection and activation from browser (which should be faster than using maxmind geoip database).
* Views are secured by default with implicit definition of anonymous / inactive user allowed views, defined as
  ``url()`` extra kwargs per each view in ``urls.py``. Anonymous views require explicit permission::

    url(r'^signup/$', 'my_app.views.signup', name='signup', kwargs={'allow_anonymous': True})
* Optional checks for AJAX requests and / or specific Django permission::

    url(r'^check-project/$', 'my_app.views.check_project', name='check_project', kwargs={
        'ajax': True, 'permission_required': 'my_project.project_can_add'
    })
* View title is optionally defined as url kwargs ``'view_title'`` key value::

    url(r'^signup/$', 'my_app.views.signup', name='signup', kwargs={'view_title': 'Sign me up', 'allow_anonymous': True})

.. highlight:: jinja

* to be used in generic Jinja2 templates (one template per many views)::

    {{ request.view_title }}

* View kwargs are stored into ``request.view_kwargs`` to make these accessible in forms when needed.
* Middleware is inheritable which allows greater flexibility to implement your own extended features via overloaded
  methods.

models.py
---------
* ``ContentTypeLinker`` class to easily generate contenttypes framework links in Jinja2 templates.
* ``get_verbose_name()`` allows to get verbose_name of Django model field, including related (foreign) and reverse-related
  fields::

    {{ get_verbose_name(profile, 'user__username') }}

query.py
--------
`FilteredRawQuerySet`_ inherits Django ``RawQuerySet`` class whose instances are returned by Django model object manager
``.raw()`` calls.

It supports ``.filter()`` / ``.exclude()`` / ``.order_by()`` / ``values()`` / ``values_list()``
queryset methods and also SQL-level slicing which is much more efficient than Python slicing of ``RawQuerySet``.

These methods are required to use filtering / ordering capabilities of ``ListSortingView`` and ``KoGridView``
class-based views defined in `views.py`_.

See `FilteredRawQuerySet sample`_ in ``djk-sample`` project source code for a complete example of AJAX grid with
raw query which has ``LEFT JOIN`` statement.

tpl.py
------
Various formatting functions, primarily to be used in ``django.admin`` ``admin.ModelAdmin`` classes ``readonly_fields``,
Jinja2 templates and ``DisplayText`` widgets.

* ``limitstr()`` - cut string after specified length.
* ``repeat_insert()`` - separate string every nth character with specified separator characters.
* ``print_list()`` - print nested HTML list. Used to format HTML in JSON responses and in custom ``DisplayText``
  widgets.
* ``print_table()`` - print uniform 2D table (no colspan / rowspan yet).
* ``print_bs_labels()`` - print HTML list as Boostrap 3 labels.
* ``reverseq()`` - construct url with query parameters.
* Manipulation with css classes:

 * ``add_css_classes()`` - similar to client-side ``jQuery.addClass()``;
 * ``remove_css_classes()`` - similar to client-side ``jQuery.removeClass()``;
 * ``add_css_classes_to_dict()`` - optimized for usage as argument of ``django.forms.utils`` ``flatatt()``;
 * ``remove_css_classes_from_dict()`` - optimized for usage as argument of ``django.forms.utils`` ``flatatt()``;

* ``html_to_text()`` - convert HTML fragment with anchor links into plain text with text links. It's used in
  `utils/mail.py`_ ``SendmailQueue`` to convert HTML body of email message to text-only body.
* ``format_local_date()`` - output localized ``Date`` / ``DateTime``.

viewmodels.py
-------------
Server-side Python functions and classes to manipulate lists of client-side viewmodels. Mostly are used with AJAX JSON
responses and in ``app.js`` client-side response routing.

views.py
--------
.. highlight:: python

* ``auth_redirect()`` - authorization required response with redirect to login. Supports next' url query argument.
  Supports JSON viewmodel response.
* ``error_response()`` / ``exception_response()`` - wrappers around ``django.http.HttpResponseBadRequest`` to allow JSON
  viewmodel response in AJAX requests in case of error / exception occured.
* ``cbv_decorator()`` - may be used to check class-based views permissions.
* ``prepare_bs_navs()`` - used to highlight current url in Bootstrap 3 navbars.
* ``BsTabsMixin`` - automatic template context processor for CBV's, which uses ``prepare_bs_navs()`` function and
  ``bs_navs()`` jinja2 macro to navigate through the navbar list of visually grouped Django view links.
* ``FormWithInlineFormsetsMixin`` - CBV mixin with built-in support of ``django_jinja_knockout.forms``
  ``FormWithInlineFormsets``.
  There is one ``ModelForm`` and one or many related ``BaseInlineFormset``. ``ModelForm`` also is optional (can be
  ``None``). Also supports client-side addition and removal of inline forms via Knockout.js custom bindings. HTML
  rendering usually is performed with Bootstrap 3 Jinja2 ``bs_inline_formsets()`` macro.
* ``InlineCreateView`` - CBV view to create new models with one to many related models.
* ``InlineDetailView`` - CBV view to display or to update models with one to many related models. Suitable both for
  CREATE and for VIEW actions, last case via ``ModelForm`` with ``metaclass=DisplayModelMetaclass``.
* ``ListSortingView`` - ListView with built-in support of sorting and field filtering::

    from django_jinja_knockout.views import ListSortingView

    from .models import Club

    class ClubList(ListSortingView):

        model = Club
        allowed_sort_orders = '__all__'
        allowed_filter_fields = {
            'category': None,
        }
        grid_fields = [
            'title',
            'category',
            'foundation_date',
        ]


* ``ContextDataMixin`` - allows to inject pre-defined dict of ``extra_context_data`` into template context of
  class-based view.
* ``KoGridView`` - together with ``ko_grid.js`` allows to create AJAX powered django.admin-like grids with filtering,
  sorting, search, CRUD actions and custom actions. See `grids documentation`_ for more details.

widgets.py
----------
* ``OptionalWidget`` - A two-component ``MultiField``: a checkbox that indicates optional value and a field itself
  (``widget_class`` = ``Textarea`` by default). The field itself is enabled / disabled accrording to the checkbox state
  via client-side `$.optionalInput`_ plugin, implemented in `plugins.js`_::

    from django_jinja_knockout.widgets import OptionalWidget

    OptionalWidget(attrs={'class': 'autogrow vLargeTextField', 'cols': 40, 'rows': 2})

* ``DisplayText`` - Read-only widget for existing ``ModelForm`` bound objects. Assign to ``ModelForm.widgets`` or to
  ``ModelForm.fields.widget`` to make selected form fields displayed as read-only text.

  Use ``DisplayModelMetaclass`` from ``django_jinja_knockout.forms`` to set all field widgets of form as
  ``DisplayText``, making the whole form read-only.

  In last case the form will have special table rendering in Jinja2 `bs_field()`_ macro.

  Widget allows to specify custom formatting callback to display complex fields, including foreign relationships,
  pre-defined string mapping for scalar ``True`` / ``False`` / ``None`` and layout override for `bs_form()`_ /
  `bs_inline_formsets()`_ Jinja2 `macros`_. Note that it's possible to call these macros from Django language
  templates like this::

    {% jinja 'bs_form.htm' with _render_=1 form=form action=view_action opts=opts %}

utils/mail.py
-------------

class ``SendmailQueue``, which instance is available globally as ``EmailQueue``, allows to send multiple HTML
emails with attachments. In case sendmail error is occured, error message can be converted to form non-field errors with
``form`` named argument of ``.flush()`` method (works with AJAX and non-AJAX forms)::

    from django_jinja_knockout.utils.mail import EmailQueue

    EmailQueue.add(
        subject='Thank you for registration at our site!',
        html_body=body,
        to=destination_emails,
    ).flush(
        form=self.form
    )

When there is no form submitted or it's undesirable to add form's non-field error, ``request`` named argument of
``.flush()`` may be supplied instead. It also works with both AJAX and non-AJAX views. AJAX views would use client-side
`viewmodels`_, displaying error messages in BootstrapDialog window. Non-AJAX views would use Django messaging framework
to display sendmail errors::

    from django_jinja_knockout.utils.mail import EmailQueue

    EmailQueue.add(
        subject='Thank you for registration at our site!',
        html_body=body,
        to=destination_emails,
    ).flush(
        request=self.request
    )

utils/sdv.py
------------
Contains many helper functions internally used by django-jinja-knockout. Some of these might be useful in Django project
modules.

``get_choice_str()`` - Similar to Django model built-in magic method `get_FOO_display()`_ but does not require to have
instance of particular Django model object. For example::

    class Member(models.Model):

        # ... skipped ...
        role = models.IntegerField(choices=ROLES, default=ROLE_MEMBER, verbose_name='Member role')

    from .models import Member
    from django_jinja_knockout.utils import sdv

    # ... skipped ...
    role_str = sdv.get_choice_str(Member.ROLES, role_val)

``join_dict_values()`` - Some of Django models define `get_str_fields()`_ method which map model instance field values
to their formatted string values, similar to ``Model`` ``__str()__`` method, but for separate fields.

If these models have foreign keys pointing to another models which also have `get_str_fields()`_ defined,
``join_dict_values()`` is used to convert nested dict `get_str_fields()`_ to flat strings::

    class Member(models.Model):

        # ... skipped ...

        def get_str_fields(self):
            parts = OrderedDict([
                ('profile', self.profile.get_str_fields()),
                ('club', self.club.get_str_fields()),
                ('last_visit', format_local_date(timezone.localtime(self.last_visit))),
                ('plays', self.get_plays_display()),
                ('role', self.get_role_display()),
                ('is_endorsed', 'endorsed' if self.is_endorsed else 'unofficial')
            ])
            return parts

        def __str__(self):
            str_fields = self.get_str_fields()
            join_dict_values(' / ', str_fields, ['profile', 'club'])
            return ' › '.join(str_fields.values())

``dbg()`` - dumps ``value`` into text log file `'sdv_out.py3'` under ``name`` label. To setup log file path overwrite
``LOGPATH`` value in Django project ``settings.py`` like that::

    import os
    from django_jinja_knockout.utils import sdv

    # create log file inside active virtualenv path
    sdv.LOGPATH = [os.environ['VIRTUAL_ENV'], 'djk-sample', 'logs']

Then one may use it to log variables in Python code::

    from django_jinja_knockout.utils import sdv

    class Project(models.Model):

      # ... skipped ...

      def save(self, *args, **kwargs):
          sdv.dbg('self.pk', self.pk)
          # ... skipped ...

When Project.save() method will be executed, `'sdv_out.py3'` log file will contain lines like this::

    # /home/user/work/djk_sample/djk-sample/club-app/models.py::save()::251
    # self.pk
    9
