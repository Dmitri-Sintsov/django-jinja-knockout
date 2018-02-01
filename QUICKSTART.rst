===========
Quickstart
===========

.. _$.optionalInput: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?utf8=%E2%9C%93&q=optionalinput
.. _App.globalIoc: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=app.globalioc&type=&utf8=%E2%9C%93
.. _App.GridDialog: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=App.GridDialog&utf8=%E2%9C%93
.. _App.Tpl: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=App.Tpl&utf8=%E2%9C%93
.. _App.vmRouter: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=App.vmRouter&type=&utf8=%E2%9C%93
.. _bs_field(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/bs_field.htm
.. _bs_form(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/bs_form.htm
.. _bs_inline_formsets(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/bs_inline_formsets.htm
.. _Celery: https://github.com/celery/celery
.. _data-component-class: https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=data-component-class
.. _DisplayText sample: https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=get_text_method&type=
.. _field lookups: https://docs.djangoproject.com/en/dev/ref/models/querysets/#field-lookups
.. _get_FOO_display(): https://docs.djangoproject.com/en/dev/ref/models/instances/#django.db.models.Model.get_FOO_display
.. _get_str_fields(): https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=get_str_fields
.. _grids documentation: https://django-jinja-knockout.readthedocs.io/en/latest/grids.html
.. _FilteredRawQuerySet sample: https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=FilteredRawQuerySet
.. _ko_grid(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/ko_grid.htm
.. _ko_grid_body(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/ko_grid_body.htm
.. _ListQuerySet: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=listqueryset&type=&utf8=%E2%9C%93
.. _macros: https://django-jinja-knockout.readthedocs.io/en/latest/macros.html
.. _plugins.js: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/static/js/front/plugins.js
.. _PrefillWidget: https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=PrefillWidget&type=
.. _site: https://docs.djangoproject.com/en/dev/ref/contrib/sites/
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
* `App.vmRouter`_ - predefined built-in AJAX response viewmodels router to perform standard client-side actions, such as
  displaying BootstrapDialogs, manipulate DOM content, graceful AJAX errors handling. It can be used to define new
  viewmodel handlers.

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

.. _quickstart_underscore_js_templates:

Underscore.js templates
~~~~~~~~~~~~~~~~~~~~~~~
Underscore.js templates may be autoloaded as ``App.Dialog`` modal body content. Also they are used in conjunction
with Knockout.js templates to generate components, for example AJAX grids (Django datatables).

Since version 0.5.0 template processor was rewritten as `App.Tpl`_ class. It made possible to extend or to replace
template processor class by altering `App.globalIoc`_ factory ``['App.Tpl']`` key. Such custom template processor class
could override one of (sub)templates loading methods ``expandTemplate()`` or ``compileTemplate()``.

In the underscore.js template execution context, the instance of `App.Tpl`_ class is available as ``self`` variable.
Thus calling `App.Tpl`_ class ``.get('varname')`` method is performed as ``self.get('varname')``. See `ko_grid_body()`_
templates for the example of ``self.get`` method usage.

Internally template processor is used for optional client-side overriding of default grid templates, supported via
`App.Tpl`_ constructor ``options.templates`` argument.

* ``App.compileTemplate`` provides singleton factory for compiled underscore.js templates from ``<script>`` tag with
  specified DOM id ``tplId``.
* ``App.Tpl.domTemplate`` converts template with specified DOM id and template arguments into jQuery DOM subtee.
* ``App.Tpl.loadTemplates`` recursively loads existing underscore.js templates by their DOM id into DOM nodes with html5
  ``data-template-id`` attributes for specified ``$selector``.
* ``App.bindTemplates`` - templates class factory used by ``App.initClient`` autoinitialization of DOM nodes.

The following html5 data attributes are used by `App.Tpl`_ template processor:

* ``data-template-id`` - destination DOM node which will be replaced by expanded underscore.js template with specified
  template id. Attribute can be applied recursively.
* ``data-template-class`` - optional override of default `App.Tpl`_ template processor class. Allows to process
  different underscore.js templates with different template processor classes.
* ``data-template-args`` - optional values of current template processor instance ``.extendData()`` method argument.
  This value will be appended to ``.data`` property of template processor instance. The values stored in ``.data``
  property are used to control template execution flow via ``self.get()`` method calls in template source code.
* ``data-template-args-nesting`` - optionally disables appending of ``.data`` property of the parent template processor
  instance to ``.data`` property of current nested child template processor instance.
* ``data-template-options`` - optional value of template processor class constructor ``options`` argument, which
  may have the following keys:

    * ``.data`` - used by `App.Tpl`_ class ``.get()`` method to control template execution flow.
    * ``.templates`` - key map of template ids to optionally substitute template names.

Components
~~~~~~~~~~
``App.Components`` class allows to automatically instantiate Javascript classes by their string path specified in
element's ``data-component-class`` html5 attribute and bind these to that element. It is used to provide Knockout.js
``App.ko.Grid`` component auto-loading / auto-binding, but is not limited to that.

.. highlight:: html

Since version 0.3.0, components can be also instantiated via browser event in addition to default document 'ready' event
instantiating. That allows to bind component classes to button click, for example::

    <button class="component" data-event="click"
        data-component-class="App.GridDialog"
        data-component-options='{"filterOptions": {"pageRoute": "club_member_grid"}}'>
        Click to see project list
    </button>

Would create an instance of ``App.GridDialog`` class with ``data-component-options`` value passed as constructor
argument when target button is clicked.

.. highlight:: jinja

JSON string value of ``data-component-options`` attribute can be nested object with many parameter values, so usually it
is generated in Jinja2 macro, such as `ko_grid()`_::

    <div{{ json_flatatt(wrapper_dom_attrs) }} data-component-options='{{ _grid_options|escapejs(True) }}'>
    <a name="{{ fragment_name }}"></a>
        <div{{ json_flatatt(_template_dom_attrs) }}>
        </div>
    </div>

.. highlight:: javascript

Version 0.3.0 also brings control over component binding and re-using. By default, current component instance is re-used
when the same event is fired. To have component re-instantiated, one should save target element in component instance
like this::

    MyComponent.runComponent = function(elem) {
        this.componentElement = elem;
        // Run your initialization code here ...
        this.doStuff();
    };

Then in your component shutdown code call ``App.components`` instance ``.unbind()`` / ``.add()`` methods::

    MyComponent.onHide = function() {
        // Run your shutdown code ...
        this.doShutdown();
        // Detect component, so it will work without component instantiation too.
        if (this.componentElement !== null) {
            // Unbind component.
            var desc = App.components.unbind(this.componentElement);
            if (typeof desc.event !== 'undefined') {
                // Re-bind component to the same element with the same event.
                App.components.add(this.componentElement, desc.event);
            }
        }
    };

See `App.GridDialog`_ code for the example of built-in component, which allows to fire AJAX grids via click events.

Because ``App.GridDialog`` class constructor may have many options, including dynamically-generated ones, it's
preferrable to generate ``data-component-options`` JSON string value in Python / Jinja2 code.

Search for `data-component-class`_ in djk-sample code for the examples of both document ready and button click
component binding.

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

    <div class="rows" data-bind="scroller: {top: 'loadPreviousRows', bottom: 'loadNextRows'}"></div>

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
* ``BootstrapModelForm`` - Form with field classes stylized for Bootstrap 3. Since version 0.4.0 it also always has
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


management/commands/djk_seed.py
-------------------------------
Implements optional ``djk_seed`` Django management command which may be used to seed initial data into managed models
database tables after the migrations are complete. To enable model data seed after the migration, define ``seed`` method
of the model like this::

    class Specialization(models.Model):
        BUILTIN_SPECIALIZATIONS = (
            ('Administrator', False),
            ('Manager', True),
            ('Contractor', True),
        )

        @classmethod
        def seed(cls, recreate=False):
            if recreate or cls.objects.count() == 0:
                # Setup default  list (only once).
                for name, is_anon in cls.BUILTIN_SPECIALIZATIONS:
                    cls.objects.update_or_create(name=name, defaults={
                        'is_builtin': True,
                        'is_anon': is_anon
                    })

then add app which has ``Specialization`` model into settings.DJK_APPS list. See :doc:`installation` for more info
about ``DJK_APPS`` list.

.. highlight:: bash

After that run the console command::

    ./manage.py djk_seed

``djk_seed`` management command has ``--help`` option which describes possible use cases. For example it may create
models content types for the selected Django apps, not running any post-migration seed::

    ./manage.py djk_seed --create-content-types --skip-seeds

This is often an pre-requisite to have contenttypes framework running correctly.

middleware.py
-------------
.. highlight:: python

Get currently used middleware class::

    from django_jinja_knockout.apps import DjkAppConfig

    ContextMiddleware = DjkAppConfig.get_context_middleware()

* Middleware is extendable (inheritable), which allows to implement your own features via overloaded methods. That's why
  ``DjkAppConfig`` is used to resolve ``ContextMiddleware`` class instead of direct import. Such way extended
  ``ContextMiddleware`` class specified via ``settings.DJK_MIDDLEWARE`` will be used instead of original version.
* Direct import from ``django_jinja_knockout.middleware`` or from ``my_project.middleware`` is possible but is not
  encouraged as wrong version of middleware may be used.

Access to current HTTP request instance anywhere in form / formset / field widget code::

    request = ContextMiddleware.get_request()

* Real HTTP request instance will be loaded when running as web server.
* Fake request will be created when running in console (for example in the management commands). Fake request HTTP GET /
  POST arguments can be initialized via ``ContextMiddleware`` class ``.mock_request()`` method, before calling
  ``.get_request()``.

Support optional client-side `viewmodels`_ injection from current user session.

Automatic timezone detection and activation from browser (which should be faster than using maxmind geoip database).
Also since version 0.3.0 it's possible to get timezone name string from current browser http request to use in
the application (for example to pass it to celery task)::

    ContextMiddleware.get_request_timezone()

Views kwargs
~~~~~~~~~~~~

Views are secured with urls that deny access to anonymous / inactive users by default. Anonymous views require explicit
permission defined as ``url()`` extra kwargs per each view in ``urls.py``::

    from my_app.views import signup
    # ...
    url(r'^signup/$', signup, name='signup', kwargs={'allow_anonymous': True})

Optional checks for AJAX requests and / or specific Django permission::

    from my_app.views import check_project
    # ...
    url(r'^check-project/$', check_project, name='check_project', kwargs={
        'ajax': True, 'permission_required': 'my_app.project_can_add'
    })

View title is optionally defined as url kwargs ``'view_title'`` key value::

    from my_app.views import signup
    # ...
    url(r'^signup/$', signup, name='signup', kwargs={'view_title': 'Sign me up', 'allow_anonymous': True})

.. highlight:: jinja

to be used in generic Jinja2 templates (one template per many views)::

    {{ request.view_title }}

View kwargs are stored into ``request.view_kwargs`` to make these accessible in forms / templates when needed.

.. highlight:: python

Request mock-up
~~~~~~~~~~~~~~~

Since version 0.7.0 it is possivble to mock-up requests in console mode (management commands) to resolve reverse URLs
fully qualified names like this::

    from django_jinja_knockout.apps import DjkAppConfig
    request = DjkAppConfig.get_context_middleware().get_request()
    from django_jinja_knockout.tpl import reverseq
    # Will return fully-qualified URL for the specified route with query string appended:
    reverseq('profile_detail', kwargs={'profile_id': 1}, request=request, query={'users': [1,2,3]})

By default domain name is taken from current configured Django `site`_. Otherwise either ``settings``. ``DOMAIN_NAME``
or ``settings``. ``ALLOWED_HOSTS`` should be set to autodetect current domain name.

Mini-router
~~~~~~~~~~~

Since version 0.7.0 inherited middleware classes (see :ref:`installation_djk_middleware` settings) support built-in mini
router, which could be used to implement CBV-like logic in middleware class itself, either via string match or via
regexp::

    class ContextMiddleware(RouterMiddleware):

        routes_str = {
            '/-djk-js-error-/': 'log_js_error',
        }
        routes_re = [
            # (r'^/-djk-js-(?P<action>/?\w*)-/', 'log_js_error'),
        ]

        def log_js_error(self):
            from .log import send_admin_mail_delay
            vms = vm_list()
            # ... skipped ...
            return JsonResponse(vms)


models.py
---------

.. highlight:: python

* ``ContentTypeLinker`` class to simplify generation of contenttypes framework object links.
* ``get_users_with_permission()`` - return the queryset of all users who have specified permission string, including
  all three possible sources of such users (user permissions, group permissions and superusers).
* Next functions allow to use parts of queryset functionality on single Django model object instances:

  * ``get_related_field_val()`` / ``get_related_field()`` support quering of related field properties from supplied
    model instance via specified string with double underscore-separated names, just like in Django querysets.
  * ``model_values()`` - get the dict of model fields name / value pairs like queryset ``values()`` for one model
    instance supplied.

* ``get_meta()`` / ``get_verbose_name()`` - get meta property of Django model field by query string, including related
  (foreign) and reverse-related fields::

    get_verbose_name(profile, 'user__username')
    get_meta(profile, 'verbose_name_plural', 'user__username')

* ``get_choice_str()`` - Similar to Django model built-in magic method `get_FOO_display()`_ but does not require to have
  instance of particular Django model object. For example::

    class Member(models.Model):

        # ... skipped ...
        role = models.IntegerField(choices=ROLES, default=ROLE_MEMBER, verbose_name='Member role')

    from .models import Member
    from django_jinja_knockout.models import get_choice_str

    # ... skipped ...
    role_str = sdv.get_choice_str(Member.ROLES, role_val)

* ``file_exists()`` - checks whether Diango file field object exists in the filesystem.

query.py
--------

FilteredRawQuerySet
~~~~~~~~~~~~~~~~~~~

``FilteredRawQuerySet`` inherits Django ``RawQuerySet`` class whose instances are returned by Django model object manager
``.raw()`` calls.

It supports ``.filter()`` / ``.exclude()`` / ``.order_by()`` / ``values()`` / ``values_list()``
queryset methods and also SQL-level slicing which is much more efficient than Python slicing of ``RawQuerySet``.

These methods are used by filtering / ordering code in ``ListSortingView`` and ``KoGridView`` class-based views.

See `FilteredRawQuerySet sample`_ in ``djk-sample`` project source code for a complete example of AJAX grid with
raw query which has ``LEFT JOIN`` statement.

Since version 0.4.0 it supports args with Q objects.

ListQuerySet
~~~~~~~~~~~~
``ListQuerySet`` implements large part of Django queryset functionality for Python lists of Django model instances.
Such lists are returned by Django queryset ``.prefetch_related()`` method.

.. highlight:: python

This allows to have the same logic of processing queries with both ``.prefetch_related()`` applied results and without
them. For example, imagine one have two querysets::

    from django.db import models
    from django.db.models import Prefetch
    from django_jinja_knockout.query import ListQuerySet

    def process_related():
        qs1 = Project.objects.all()[:10]
        qs2 = Project.objects.all()[:10].prefetch_related(
            Prefetch(
                'projectmember_set',
                to_attr='projectmember_list'
            )
        )
        (obj.process_members() for obj in qs1)
        (obj.process_members() for obj in qs2)

    class Project(models.Model):

        # ... skipped ...

        def process_members(self):
            # Detect Prefetch().
            if hasattr(self, 'projectmember_list'):
                qs = ListQuerySet(self.projectmember_list)
            else:
                qs = self.projectmember_set
            # ... Do .filter() / .order_by() / slice operation with qs
            qs_subset = qs.filter(is_approved=False)
            # ... Do some more operations with qs_subset or it's members.
            for obj in qs_subset:
                obj.approve()

    class ProjectMember(models.Model):

        project = models.ForeignKey(Project, verbose_name='Project')
        is_approved = models.BooleanField(default=False, verbose_name='Approved member')
        # ... skipped ...

        def approve(self):
            self.is_approved = True

Version 0.3.0 implements ``.filter()`` / ``.exclude()`` / slicing / ``.order_by()`` / ``.first()`` / ``.values()`` /
``.values_list()`` methods. Many but not all of the `field lookups`_ are supported. Feel free to submit a pull request
if you need more functionality.

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
* ``reverseq()`` - construct url with query parameters from url name. Since version 0.4.0, when request instance is
  supplied, absolute url will be returned.

* Manipulation with css classes:

 * ``add_css_classes()`` - similar to client-side ``jQuery.addClass()``;
 * ``remove_css_classes()`` - similar to client-side ``jQuery.removeClass()``;
 * ``add_css_classes_to_dict()`` - optimized for usage as argument of ``django.forms.utils`` ``flatatt()``;
 * ``remove_css_classes_from_dict()`` - optimized for usage as argument of ``django.forms.utils`` ``flatatt()``;

* ``html_to_text()`` - convert HTML fragment with anchor links into plain text with text links. It's used in
  `utils/mail.py`_ ``SendmailQueue`` to convert HTML body of email message to text-only body.
* ``format_local_date()`` - output localized ``Date`` / ``DateTime``.

* ``str_dict()`` - Django models could define `get_str_fields()`_ method which maps model instance field values to their
  formatted string values, similar to ``Model`` ``__str()__`` method, but for each or to some selected separate fields.

  If these models have foreign keys pointing to another models which also have `get_str_fields()`_ defined,
  ``str_dict()`` can be used to convert nested dict `get_str_fields()`_ values to flat strings in ``__str__()`` method::

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
            # Will flatten 'profile' and 'club' str_fields dict keys values
            # and convert the whole str_fields dict values into str.
            str_fields = self.get_str_fields()
            return str_dict(str_fields)

Internally ``str_dict()`` uses lower level ``flatten_dict()`` function which is defined in the same source file.

viewmodels.py
-------------
Server-side Python functions and classes to manipulate lists of client-side viewmodels. Mostly are used with AJAX JSON
responses and in ``app.js`` client-side response routing.

views submodule
---------------
.. highlight:: python

* ``auth_redirect()`` - authorization required response with redirect to login. Supports next' url query argument.
  Supports JSON viewmodel response.
* ``error_response()`` / ``exception_response()`` - wrappers around ``django.http.HttpResponseBadRequest`` to allow JSON
  viewmodel response in AJAX requests in case of error / exception occured.
* ``cbv_decorator()`` - may be used to check class-based views permissions.
* ``prepare_bs_navs()`` - used to highlight current url in Bootstrap 3 navbars.
* ``BsTabsMixin`` - automatic template context processor for CBV's, which uses ``prepare_bs_navs()`` function and
  ``bs_navs()`` jinja2 macro to navigate through the navbar list of visually grouped Django view links.
* ``FoldingPaginationMixin`` - ``ListView`` / ``ListSortingView`` mixin that enables advanced pagination in
  ``bs_pagination()`` / ``bs_list()`` Jinja2 macros.
* ``FormWithInlineFormsetsMixin`` - CBV mixin with built-in support of ``django_jinja_knockout.forms``
  ``FormWithInlineFormsets``.
  There is one ``ModelForm`` and one or many related ``BaseInlineFormset``. ``ModelForm`` also is optional (can be
  ``None``). Also supports client-side addition and removal of inline forms via Knockout.js custom bindings. HTML
  rendering usually is performed with Bootstrap 3 Jinja2 ``bs_inline_formsets()`` macro.
* ``InlineCreateView`` - CBV view to create new models with one to many related models.
* ``InlineDetailView`` - CBV view to display or to update models with one to many related models. Suitable both for
  CREATE and for VIEW actions, last case via ``ModelForm`` with ``metaclass=DisplayModelMetaclass``.
* ``ListSortingView`` - ``ListView`` with built-in support of sorting and field filtering::

    from django_jinja_knockout.views import ListSortingView

    from .models import Club

    class ClubList(ListSortingView):

        model = Club
        allowed_sort_orders = '__all__'
        allowed_filter_fields = {
            # None value will autodetect field filter choices, when possible.
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

  See ``DisplayText`` widget customization of widget html output via ``get_text_method()`` see `DisplayText sample`_.

* ``PrefillWidget`` - Django form input field which supports both free text and quick filling of input text value from
  the list of prefilled choices. Since version 0.6.0, `ListQuerySet`_ has ``prefill_choices()`` method, which allows to
  generate choices lsists for ``PrefillWidget`` initial values like this::

    from django_jinja_knockout.widgets import PrefillWidget
    from django_jinja_knockout.query import ListQuerySet

    # ...

    self.related_members_qs = ListQuerySet(
        Member.objects.filter(
            club__id=self.request.view_kwargs.get('club_id', None)
        )
    )
    if self.related_members_qs.count() > 1 and isinstance(form, MemberForm):
        # Replace standard Django CharField widget to PrefillWidget with incorporated standard field widget:
        form.fields['note'].widget = PrefillWidget(
            data_widget=form.fields['note'].widget,
            choices=self.related_members_qs.prefill_choices('note')
        )
        # Replace one more field widget to PrefillWidget:
        form.fields['name'].widget = PrefillWidget(
            data_widget=form.fields['name'].widget,
            choices=self.related_members_qs.prefill_choices('name')
        )

See ``djk-sample`` project for the sample of `PrefillWidget`_ usage with inline formsets. It is also simpler to use the
widget in single ModelForm without inline formsets.

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

Since version 0.3.0, ``SendmailQueue`` class functionality could be extended by injecting ioc class. It allows to use
database backend or non-SQL store to process emails in background, for example as `Celery`_ task. ``SendmailQueue``
class ``.add()`` and ``.flush()`` methods could be overriden in ``self.ioc`` and new methods can be added as well.

``uncaught_exception_email`` function can be used to monkey patch Django exception ``BaseHandler`` to use
``SendmailQueue`` to send the uncaught exception reports to selected email addresses.

Here is the example of extending ``EmailQueue`` instance of ``SendmailQueue`` via custom ioc class (``EmailQueueIoc``)
and monkey patching Django exception ``BaseHandler``. This code should be placed in the project's ``apps.py``::

    class MyAppConfig(AppConfig):
        name = 'my_app'
        verbose_name = "Verbose name of my application"

        def ready(self):
            from django_jinja_knockout.utils.mail import EmailQueue
            # EmailQueueIoc should have custom .add() and / or .flush() methods implemented.
            # Original .add() / .flush() methods may be called via ._add() / ._flush().
            from my_app.tasks import EmailQueueIoc

            EmailQueueIoc(EmailQueue)

            # Save uncaught exception handler.
            BaseHandler.original_handle_uncaught_exception = BaseHandler.handle_uncaught_exception
            # Override uncaught exception handler.
            BaseHandler.handle_uncaught_exception = uncaught_exception_email
            BaseHandler.developers_emails = ['user@host.org']
            BaseHandler.uncaught_exception_subject = 'Django exception stack trace for my project'

``my_app.tasks.py``::

    class EmailQueueIoc:

        def __init__(self, email_queue):
            self.queue = email_queue
            self.instances = []
            # Maximum count of messages to send in one batch.
            self.batch_limit = 10
            self.max_total_errors = 3
            email_queue.set_ioc(self)

        def add(self, **kwargs):
            # Insert your code here.
            # Call original _add():
            return self.queue._add(**kwargs)

        def flush(self, **kwargs):
            # Insert your code here.
            # Call original _flush():
            return self.queue._flush(**kwargs)

        def celery_task():
            # Insert your code here.

    @app.task
    def email_send_batch():
        EmailQueue.celery_task()

utils/sdv.py
------------
Contains helper functions internally used by django-jinja-knockout. Some of these might be useful in Django project
modules.

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

Where ``9`` is the value of ``self.pk``.
