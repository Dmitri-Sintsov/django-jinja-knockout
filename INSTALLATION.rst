.. _AjaxForm: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=AjaxForm&type=code
.. _app.js: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/static/djk/js/app.js
.. _apps.DjkAppConfig: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/apps.py
.. _club_app/templates: https://github.com/Dmitri-Sintsov/djk-sample/tree/master/club_app/templates
.. _content types framework: https://docs.djangoproject.com/en/dev/ref/contrib/contenttypes/
.. _context_processors.py: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/context_processors.py
.. _ContextMiddleware: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/middleware.py
.. _datatables: https://django-jinja-knockout.readthedocs.io/en/latest/datatables.html
.. _deno rollup: https://deno.land/x/drollup
.. _django-allauth: https://github.com/pennersr/django-allauth
.. _django_deno: https://github.com/Dmitri-Sintsov/django-deno
.. _djk_sample.ContextMiddleware: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/djk_sample/middleware.py
.. _djk_sample.TemplateContextProcessor: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/djk_sample/context_processors.py
.. _djk_ui: https://django-jinja-knockout.readthedocs.io/en/latest/djk_ui.html
.. _es6 modules: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
.. _.get_context_middleware(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?utf8=%E2%9C%93&q=get_context_middleware
.. _INSTALLED_APPS: https://docs.djangoproject.com/en/dev/ref/settings/#std:setting-INSTALLED_APPS
.. _jinja2/base_min.htm (bs3): https://github.com/Dmitri-Sintsov/djk-bootstrap3/blob/master/djk_ui/jinja2/base_min.htm
.. _jinja2/base_min.htm (bs4): https://github.com/Dmitri-Sintsov/djk-bootstrap4/blob/master/djk_ui/jinja2/base_min.htm
.. _jinja2/base_head.htm: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/base_head.htm
.. _jinja2/base_bottom_scripts.htm: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/base_bottom_scripts.htm
.. _bs_form(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/bs_form.htm
.. _bs_inline_formsets(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/bs_inline_formsets.htm
.. _grid.js: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/static/djk/js/grid.js
.. _PageContext: https://django-jinja-knockout.readthedocs.io/en/latest/context_processors.html#pagecontext-page-context
.. _page_context: https://django-jinja-knockout.readthedocs.io/en/latest/context_processors.html#pagecontext-page-context
.. _README: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/README.rst
.. _release: https://github.com/Dmitri-Sintsov/django-jinja-knockout/releases
.. _settings.py: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/djk_sample/settings.py
.. _settings.ADMINS: https://docs.djangoproject.com/en/dev/ref/settings/#std:setting-ADMINS
.. _SystemJS: https://github.com/systemjs/systemjs
.. _templates/base_min.html (bs3): https://github.com/Dmitri-Sintsov/djk-bootstrap3/blob/master/djk_ui/templates/base_min.html
.. _templates/base_min.html (bs4): https://github.com/Dmitri-Sintsov/djk-bootstrap4/blob/master/djk_ui/templates/base_min.html
.. _TemplateContextProcessor: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/context_processors.py
.. _terser: https://terser.org
.. _viewmodels: https://django-jinja-knockout.readthedocs.io/en/latest/viewmodels.html
.. _views: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/views/
.. _url.js: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/static/djk/js/url.js
.. _urls.py: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/djk_sample/urls.py

=============
Installation
=============

* See `README`_ for the list of the currently supported Python / Django versions (master / development version), or the
  ``README`` for the specific `release`_.
* Django template language is supported via including Jinja2 templates from DTL templates. Pure Jinja2 projects are
  supported as well.

Virtual environment
-------------------

.. highlight:: bash

Inside virtualenv of your Django project, install `django-jinja-knockout`::

    python3 -m pip install django-jinja-knockout

To install latest master from repository::

    python3 -m pip install --upgrade git+https://github.com/Dmitri-Sintsov/django-jinja-knockout.git

To install specific tag::

    python3 -m pip install --upgrade git+https://github.com/Dmitri-Sintsov/django-jinja-knockout.git@v2.0.0

settings.py
-----------

One may use existing example of `settings.py`_ as the base to develop your own ``settings.py``.

DJK_APPS
~~~~~~~~

``DJK_APPS`` list is the subset of `INSTALLED_APPS`_ list that defines project applications which views will be
processed by built-in `ContextMiddleware`_ class ``process_view()`` method via checking the result of
``is_our_module()`` method.

.. highlight:: python

To apply `django-jinja-knockout` `ContextMiddleware`_ to the views of project apps, define ``DJK_APPS`` list with the
list of Django project's own applications like that::

    DJK_APPS = (
        'djk_sample',
        'club_app',
        'event_app',
    )

It increases the compatibility with external apps which views do not require to be processed by `django-jinja-knockout`
`ContextMiddleware`_.

Add ``DJK_APPS`` (if there is any) and ``django_jinja_knockout`` to `INSTALLED_APPS`_ in ``settings.py``::

    OPTIONAL_APPS = []

    try:
        import django_deno
        # django_deno is an optional Javascript module bundler, not required to run in modern browsers
        OPTIONAL_APPS.append('django_deno')
    except ImportError:
        pass

    # Order of installed apps is important for Django Template loader to find 'djk_sample/templates/base.html'
    # before original allauth 'base.html' is found, when allauth DTL templates are used instead of built-in
    # 'django_jinja_knockout._allauth' Jinja2 templates, thus DJK_APPS are included before 'allauth'.
    #
    # For the same reason, djk_ui app is included before django_jinja_knockout, to make it possible to override
    # any of django_jinja_knockout template / macro.
        INSTALLED_APPS = [
            'django.contrib.admin',
            'django.contrib.auth',
            'django.contrib.contenttypes',
            'django.contrib.sessions',
            'django.contrib.messages',
            'django.contrib.staticfiles',
            # 'sites' is required by allauth
            'django.contrib.sites',
        ] + OPTIONAL_APPS + [
            'djk_ui',
            'django_jinja_knockout',
            'django_jinja_knockout._allauth',
        ] + DJK_APPS + [
            'allauth',
            'allauth.account',
            # Required for socialaccount template tag library despite we do not use social login
            'allauth.socialaccount',
        ]

`djk_ui`_ app provides pluggable support for Bootstrap 3 / Bootstrap 4.

`django_deno`_ may be included to ``OPTIONAL_APPS`` to provide `es6 modules`_ / `terser`_ / `SystemJS`_ support via
`deno rollup`_. See sample project `settings.py`_ for the example of actual `django_deno`_ configuration.

See :ref:`clientside_es6_module_loader` for more info.

`django-allauth`_ support is not mandatory but optional; just remove the following apps from `INSTALLED_APPS`_ in case
you do not need it::

    # The Django sites framework is required for 'allauth'
    'django.contrib.sites',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'django_deno`,
    'django_jinja_knockout._allauth',

Built-in allauth DTL templates are supported without any modification. In such case the next module may be removed
from the list of `INSTALLED_APPS`_ as well::

    'django_jinja_knockout._allauth',

* It is possible to extend `django-jinja-knockout` `ContextMiddleware`_ to add new functionality. See
  `djk_sample.ContextMiddleware`_ code for example.

.. _installation_djk_middleware:

DJK_MIDDLEWARE
~~~~~~~~~~~~~~

`apps.DjkAppConfig`_ class has `.get_context_middleware()`_ method which should be invoked to get extended middleware
class to be used by django-jinja-knockout code and across the project. In case one's project has a middleware extended
from django-jinja-knockout middleware, one should specify it import string as ``DJK_MIDDLEWARE`` variable value in
``settings.py`` like that::

    DJK_MIDDLEWARE = 'djk_sample.middleware.ContextMiddleware'

FILE_MAX_SIZE
~~~~~~~~~~~~~

This optional setting allows to specify maximal allowed file size to upload with `AjaxForm`_ class::

    FILE_UPLOAD_HANDLERS = ("django.core.files.uploadhandler.TemporaryFileUploadHandler",)
    FILE_MAX_SIZE = 100 * 1024 * 1024

LAYOUT_CLASSES
~~~~~~~~~~~~~~

This optional setting allows to override default Bootstrap grid layout classes for `bs_form()`_ and
`bs_inline_formsets()`_ Jinja2 macros used to display ``ModelForm`` and inline formsets in the `django-jinja-knockout`
code. The default value is specified in ``djk_ui`` app ``conf`` module, but can be overridden in `settings.py`_::

    LAYOUT_CLASSES = {
        '': {
            'label': 'col-md-4',
            'field': 'col-md-6',
        },
        'display': {
            'label': 'w-30 table-light',
            'field': 'w-100 table-default',
        },
    }

.. _installation_objects_per_page:

OBJECTS_PER_PAGE
~~~~~~~~~~~~~~~~
Allows to specify default limit for Django paginated querysets for ``ListSortingView`` / ``KoGridView`` (see `views`_
submodule)::

    # Pagination settings.
    OBJECTS_PER_PAGE = 3 if DEBUG else 10

USE_JS_TIMEZONE
~~~~~~~~~~~~~~~
Optional boolean value (by default is ``False``). When ``True``, `ContextMiddleware`_ class ``process_request()`` method
will autodetect Django timezone from current browser session timezone.

Javascript errors logger
~~~~~~~~~~~~~~~~~~~~~~~~
Since version 0.7.0 it's possible to setup Javascript logger which would either display Javascript errors in Bootstrap
dialog, or will report these via email to site admins whose emails are specified by `settings.ADMINS`_::

    ADMINS = [('John Smith', 'user@host.com'),]
    if DEBUG:
        # Javascript error will display Bootstrap dialog.
        JS_ERRORS_ALERT = True
    else:
        # Javascript error will be reported via ADMINS emails.
        JS_ERRORS_LOGGING = True

Context processors
~~~~~~~~~~~~~~~~~~

Add `django_jinja_knockout` `TemplateContextProcessor`_ to `settings.py`_::

    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    TEMPLATES = [
        {
            "BACKEND": "django.template.backends.jinja2.Jinja2",
            "APP_DIRS": True,
            "OPTIONS": {
                'environment': 'django_jinja_knockout.jinja2.environment',
                'context_processors': [
                    'django.template.context_processors.i18n',
                    'django_jinja_knockout.context_processors.template_context_processor'
                ]
            },
        },
        {
            'BACKEND': 'django.template.backends.django.DjangoTemplates',
            'DIRS': [],
            'APP_DIRS': True,
            'OPTIONS': {
                'context_processors': [
                    'django.template.context_processors.debug',
                    'django.template.context_processors.request',
                    'django.contrib.auth.context_processors.auth',
                    'django.contrib.messages.context_processors.messages',
                    # Next line is required only if project uses Django templates (DTL).
                    'django_jinja_knockout.context_processors.template_context_processor'
                ],
            },
        },
    ]

DJK_CLIENT_ROUTES
~~~~~~~~~~~~~~~~~

If you want to use built-in server-side to client-side global route mapping, use ``DJK_CLIENT_ROUTES`` settings::

    # List of global client routes that will be injected into every view (globally).
    # This is a good idea if some client-side route is frequently used by most of views.
    # Alternatively one can specify client route url names per view (see the documentation).
    # Second element of each tuple defines whether the client-side route should be available to anonymous users.
    DJK_CLIENT_ROUTES = {
        ('user_change', True),
        ('equipment_grid', True),
    }

.. _installation_context-processor:

Context processor
-----------------

Context processor makes possible to specify client-side routes per view::

    from django_jinja_knockout.views import page_context_decorator

    @page_context_decorator(client_routes={
        'blog_feed',
        'my_grid_url_name',
    })
    def my_view(request):
        return TemplateResponse(request, 'template.htm', {'data': 12})

and per class-based view::

    from django_jinja_knockout.views import PageContextMixin

    class MyView(PageContextMixin)

        client_routes = {
            'blog_feed',
            'my_grid_url_name',
        }

for ``urls.py`` like this::

    from django_jinja_knockout.urls import UrlPath
    from my_blog.views import feed_view
    # ...
    re_path(r'^blog-(?P<blog_id>\d+)/$', feed_view, name='blog_feed',
        kwargs={'ajax': True, 'permission_required': 'my_blog.add_feed'}),
    UrlPath(MyGrid)(
        name='my_grid_url_name',
        base='my-grid',
        kwargs={'view_title': 'My Sample Grid'}
    ),

to make the resolved url available in client-side scripts.

In such case defining `DJK_CLIENT_ROUTES`_ is not necessary, however one has to specify required client-side url names
in every view which includes Javascript template that accesses these url names (for example foreign key widgets of
`datatables`_ require resolved url names of their view classes).

.. highlight:: javascript

The current url generated for ``'blog_feed'`` url name will be available at client-side Javascript as::

    import { Url } from '../../djk/js/url.js';

    Url('blog_feed', {'blog_id': 1});

One will be able to call Django view via AJAX request in your Javascript code like this::

    import { AppGet, AppPost } from '../../djk/js/url.js';

    AppPost('blog_feed', {'postvar1': 1, 'postvar2': 2}, {
        kwargs: {'blog_id': 1}
    });
    AppGet('blog_feed', {'getvar1': 1}, {
        kwargs: {'blog_id': 1}
    });

where the AJAX response will be treated as the list of `viewmodels`_ and will be automatically routed by `url.js`_ to
appropriate viewmodel handler. Django exceptions and AJAX errors are handled gracefully, displayed in
``BootstrapDialog`` window by default.

Extending context processor
~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. highlight:: Python

Extending context processor is useful when templates should receive additional context data by default::

    from django_jinja_knockout.context_processors import TemplateContextProcessor as BaseContextProcessor
    from my_project.tpl import format_currency, static_hash

    class TemplateContextProcessor(BaseContextProcessor):

        def get_context_data(self):
            context_data = super().get_context_data()
            # Add two custom function to template context.
            context_data.update({
                'format_currency': format_currency,
                'static_hash': static_hash,
            })
            return context_data

* See `djk_sample.TemplateContextProcessor`_ source code for the trivial example of extending `django-jinja-knockout`
  `TemplateContextProcessor`_.

.. _installation_djk_page_context_cls:

DJK_PAGE_CONTEXT_CLS
~~~~~~~~~~~~~~~~~~~~
`DJK_PAGE_CONTEXT_CLS`_ setting allows to override default `PageContext`_ class::

    DJK_PAGE_CONTEXT_CLS = 'djk_sample.context_processors.PageContext'

That makes possible to add custom client configuration to `page_context`_ instance::

    from django.conf import settings
    from django_jinja_knockout.context_processors import PageContext as BasePageContext

    class PageContext(BasePageContext):

        def get_client_conf(self):
            client_conf = super().get_client_conf()
            client_conf.update({
                # v2.1.0 - enable built-in custom tags (by default is off)
                'compatTransformTags': True,
                'email_host': settings.EMAIL_HOST,
                'userName': '' if self.request.user.id == 0 else self.request.user.username,
            })
            return client_conf

.. highlight:: Javascript

which will be available in Javascript as::

    import { AppConf } from '../../djk/js/conf.js';

    // used by djk_ui ui.js
    AppConf('compatTransformTags')
    AppConf('email_host')
    AppConf('userName')

.. highlight:: python

Note that client conf is added globally, while the client data are added per view::

    from django_jinja_knockout.views import create_page_context

    def my_view(request, **kwargs):
        page_context = create_page_context(request=request)
        page_context.update_client_data({'isVerifiedUser': True})

.. highlight:: Javascript

to be queried later in Javascript::

    import { AppClientData } from '../../djk/js/conf.js';

    AppClientData('isVerifiedUser')

Middleware
----------

Key functionality of ``django-jinja-knockout`` middleware is:

.. highlight:: jinja

* Setting current Django timezone via browser current timezone.
* Getting current request in non-view functions and methods where Django provides no instance of request available.
* Checking ``DJK_APPS`` applications views for the permissions defined as values of kwargs argument keys in `urls.py`_
  ``re_path()`` calls:

 * ``'allow_anonymous' key`` - ``True`` when view is allowed to anonymous user (``False`` by default).
 * ``'allow_inactive' key`` - ``True`` when view is allowed to inactive user (``False`` by default).
 * ``'permission_required' key`` - value is the name of Django app / model permission string required for this view to
   be called.

All of the keys are optional but some have restricted default values.

.. highlight:: python

Install ``django_jinja_knockout.middleware`` into `settings.py`_::

    MIDDLEWARE_CLASSES = (
        'django.contrib.sessions.middleware.SessionMiddleware',
        'django.middleware.common.CommonMiddleware',
        'django.middleware.csrf.CsrfViewMiddleware',
        'django.contrib.auth.middleware.AuthenticationMiddleware',
        'django.contrib.auth.middleware.SessionAuthenticationMiddleware',
        'django.contrib.messages.middleware.MessageMiddleware',
        'django.middleware.clickjacking.XFrameOptionsMiddleware',
        'django.middleware.security.SecurityMiddleware',
        'django_jinja_knockout.middleware.ContextMiddleware',
    )

Then to use it in a project::

    from django_jinja_knockout.middleware import ContextMiddleware

For example to get current request in non-view functions and methods, one may use::

    ContextMiddleware.get_request()

and to get current request user::

    ContextMiddleware.get_request().user

* Do not forget that request is mocked when running in console, for example in management jobs. It is possible to
  override the middleware class for custom mocking.

Extending middleware
~~~~~~~~~~~~~~~~~~~~

It's possible to extend built-in `ContextMiddleware`_. In such case `DJK_MIDDLEWARE`_ string in `settings.py`_ should
contain full name of the extended class. See `djk_sample.ContextMiddleware`_ for the example of extending middleware to
enable logging of Django models performed actions via `content types framework`_.

urls.py
-------

The example of `urls.py`_ for Jinja2 ``_allauth`` templates::

    # More pretty-looking but possibly not compatible with arbitrary allauth version:
    re_path(r'^accounts/', include('django_jinja_knockout._allauth.urls')),

The example of `urls.py`_ for DTL ``allauth`` templates::

    # Standard allauth DTL templates working together with Jinja2 templates via {% load jinja %}
    re_path(r'^accounts/', include('allauth.urls')),

Note that ``accounts`` urls are not processed by the default `DJK_MIDDLEWARE`_ thus do not require ``is_anonymous`` or
``permission_required`` kwargs keys to be defined.

The example of `DJK_MIDDLEWARE`_ view `urls.py`_ with the view title value and with permission checking (anonymous /
inactive users are not allowed by default)::

    from django_jinja_knockout.urls import UrlPath
    UrlPath(EquipmentGrid)(
        name='equipment_grid',
        kwargs={
            'view_title': 'Grid with the available equipment',
            'permission_required': 'club_app.change_manufacturer'
        }
    ),

Templates
---------

.. highlight:: jinja

Integration of django-jinja-knockout into existing Django / Bootstrap project
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

If your project base template uses ``Jinja2`` templating language, there are the following possibilities:

* Extend your ``base.htm`` template from `jinja2/base_min.htm (bs3)`_  / `jinja2/base_min.htm (bs4)`_ template.
* Include styles from `jinja2/base_head.htm`_ and scripts from `jinja2/base_bottom_scripts.htm`_. These are required to
  run client-side scripts like `app.js`_ and `grid.js`_.

If your project base template uses Django Template Language (``DTL``), there are the following possibilities:

* Extend your ``base.html`` template from `templates/base_min.html (bs3)`_ / `templates/base_min.html (bs4)`_ template.
* To ensure that `page_context`_ is always available in DTL template::

    {% load page_context %}
    {% init_page_context %}

* Include styles from `jinja2/base_head.htm`_ and scripts from `jinja2/base_bottom_scripts.htm`_ via
  ``{% load jinja %}`` template tag library to your ``DTL`` template::

    {% load jinja %}
    {% jinja 'base_head.htm' %}
    {% if messages %}
        {% jinja 'base_messages.htm' %}
    {% endif %}
    {% jinja 'base_bottom_scripts.htm' %}

Do not forget that Jinja2 does not support extending included templates.

Template engines can be mixed with inclusion of Jinja2 templates from DTL templates like this::

    {% jinja 'bs_navs.htm' with _render_=1 navs=main_navs %}
    {% jinja 'bs_inline_formsets.htm' with _render_=1 related_form=form formsets=formsets action=view.get_form_action_url opts=view.get_bs_form_opts %}
    {% jinja 'bs_list.htm' with _render_=1 view=view object_list=object_list is_paginated=is_paginated page_obj=page_obj %}
    {% jinja 'ko_grid.htm' with _render_=1 grid_options=club_grid_options %}
    {% jinja 'ko_grid_body.htm' with _render_=1 %}

See `club_app/templates`_ for full-size examples of including Jinja2 templates from DTL templates.

