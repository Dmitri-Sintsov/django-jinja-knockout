=============
Installation
=============

* `django-jinja-knockout` 0.2.0 supports Python 3.4 / 3.5, Django 1.8 / 1.9 / 1.10.
* Django template language is supported via including Jinja2 templates from DTL templates. Pure Jinja2 projects are
  supported as well.

.. _app.js: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/static/js/front/app.js
.. _club_app/templates: https://github.com/Dmitri-Sintsov/djk-sample/tree/master/club_app/templates
.. _content types framework: https://docs.djangoproject.com/en/dev/ref/contrib/contenttypes/
.. _context_processors.py: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/context_processors.py
.. _ContextMiddleware: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/middleware.py
.. _django-allauth: https://github.com/pennersr/django-allauth
.. _djk_sample.ContextMiddleware: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/djk_sample/middleware.py
.. _djk_sample.TemplateContextProcessor: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/djk_sample/context_processors.py
.. _grids: https://django-jinja-knockout.readthedocs.io/en/latest/grids.html
.. _jinja2/base_min.htm: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/base_min.htm
.. _jinja2/base_head.htm: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/base_head.htm
.. _jinja2/base_bottom_scripts.htm: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/base_bottom_scripts.htm
.. _bs_form(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/bs_form.htm
.. _bs_inline_formsets(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/bs_inline_formsets.htm
.. _ko_grid.js: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/static/js/front/ko_grid.js
.. _settings.py: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/djk_sample/settings.py
.. _templates/base_min.html: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/templates/base_min.html
.. _TemplateContextProcessor: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/context_processors.py
.. _viewmodels: https://django-jinja-knockout.readthedocs.io/en/latest/viewmodels.html
.. _views.py: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/views.py
.. _urls.py: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/djk_sample/urls.py

Virtual environment
-------------------

.. highlight:: bash

Inside virtualenv of your Django 1.8 / 1.9 / 1.10 project, install `django-jinja-knockout`::

    python3 -m pip install django-jinja-knockout

To install latest master from repository::

    python3 -m pip install --upgrade git+https://github.com/Dmitri-Sintsov/django-jinja-knockout.git

To install specific commit::

    python3 -m pip install --upgrade git+https://github.com/Dmitri-Sintsov/django-jinja-knockout.git@c97a696b1ee40c5a795cc821e7b05ff35e394288


settings.py
-----------

One may use existing example of `settings.py`_ as the base to develop your own ``settings.py``.

DJK_APPS
~~~~~~~~

``DJK_APPS`` tuple is the subset of ``INSTALLED_APPS`` tuple that defines project applications which views will be
processed by built-in `ContextMiddleware`_ class ``process_view()`` method via checking the result of
``is_our_module()`` method.

.. highlight:: python

To apply `django-jinja-knockout` `ContextMiddleware`_ to the views of project apps, define ``DJK_APPS`` tuple with the
list of Django project's own applications like that::

    DJK_APPS = (
        'djk_sample',
        'club_app',
        'event_app',
    )

It increases the compatibility with external apps which views do not require to be processed by `django-jinja-knockout`
`ContextMiddleware`_.

Add ``DJK_APPS`` (if there is any) and ``django_jinja_knockout`` to ``INSTALLED_APPS`` in ``settings.py``::

    # Order of installed apps is important for Django Template loader to find 'djk_sample/templates/base.html'
    # before original allauth 'base.html' is found, when allauth DTL templates are used instead of built-in
    # 'django_jinja_knockout._allauth' Jinja2 templates, thus DJK_APPS are included before 'allauth'.
    INSTALLED_APPS = (
        'django.contrib.admin',
        'django.contrib.auth',
        'django.contrib.contenttypes',
        'django.contrib.sessions',
        'django.contrib.messages',
        'django.contrib.staticfiles',
        # 'sites' is required by allauth
        'django.contrib.sites',
        'django_jinja',
        'django_jinja.contrib._humanize',
        'django_jinja_knockout',
        'django_jinja_knockout._allauth',
    ) + DJK_APPS + \
    (
        'allauth',
        'allauth.account',
        # Required for socialaccount template tag library despite we do not use social login
        'allauth.socialaccount',
    )

`django-allauth`_ support is not mandatory but optional; just remove the following apps from ``INSTALLED_APPS`` in case
you do not need it::

    # The Django sites framework is required for 'allauth'
    'django.contrib.sites',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'django_jinja_knockout._allauth',

Built-in allauth DTL templates are supported without any modification. In such case next module is not required::

    'django_jinja_knockout._allauth',

* It is possible to extend `django-jinja-knockout` `ContextMiddleware`_ to add new functionality. See
  `djk_sample.ContextMiddleware`_ code for example.

FILE_MAX_SIZE
~~~~~~~~~~~~~

This optional setting allows to specify maximal allowed file size to upload with `app.js`_ ``App.AjaxForm()`` class::

    FILE_UPLOAD_HANDLERS = ("django.core.files.uploadhandler.TemporaryFileUploadHandler",)
    FILE_MAX_SIZE = 100 * 1024 * 1024

LAYOUT_CLASSES
~~~~~~~~~~~~~~

This optional setting allows to override default Bootstrap 3 grid layout classes for `bs_form()`_ and
`bs_inline_formsets()`_ Jinja2 macros used to display ``ModelForm`` and inline formsets in the `django-jinja-knockout`
code. The default value is specified in `context_processors.py`_ but can be overriden in `settings.py`_::

    LAYOUT_CLASSES = {'label': 'col-md-3', 'field': 'col-md-7'}

OBJECTS_PER_PAGE
~~~~~~~~~~~~~~~~
Allows to specify default limit for Django paginated querysets for ``ListSortingView`` / ``KoGridView`` (see `views.py`_
code)::

    # Pagination settings.
    OBJECTS_PER_PAGE = 3 if DEBUG else 10

USE_JS_TIMEZONE
~~~~~~~~~~~~~~~
Optional boolean value (by default is ``False``). When ``True``, `ContextMiddleware`_ class ``process_request()`` method
will autodetect Django timezone from current browser session timezone.

Context processors
~~~~~~~~~~~~~~~~~~

Add `django_jinja_knockout` `TemplateContextProcessor`_ to `settings.py`_::

    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    TEMPLATES = [
        {
            "BACKEND": "django_jinja.backend.Jinja2",
            "APP_DIRS": True,
            "OPTIONS": {
                "match_extension": ".htm",
                "app_dirname": "jinja2",
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

If you want to use built-in server-side to client-side global route mapping, create your own project
``context_processors.py`` (see `Extending context processor`_).

Context processor
-----------------

Since version 0.2.0, it is possible to specify client-side routes per view::

    def feed_view(request):
        request.client_routes.extend([
            'blog_feed'
        ])

and per class-based view::

    class MyGrid(KoGridView):

        client_routes = [
            'my_grid_url_name'
        ]

In such case extending built-in `TemplateContextProcessor`_ is not necessary, but one has to specity required
client-side url names in every view which includes Javascript that accesses these url names (for example foreign key
widgets of `grids`_).

Extending context processor
~~~~~~~~~~~~~~~~~~~~~~~~~~~

If you want to use `global` client-side url name mapping available in `app.js`_, which dispatches AJAX requests
according to Django ``urls.py`` urls, create ``context_processors.py`` in your main project application with the
following code::

    from django_jinja_knockout.context_processors import TemplateContextProcessor as BaseContextProcessor


    class TemplateContextProcessor(BaseContextProcessor):

        CLIENT_ROUTES = (
            # This route is injected into every page globally (not per view).
            # This is a good idea if some client-side route is frequently used.
            # Alternatively one can specify client route url names per view.
            # Second element of each tuple defines whether client-side route should be available to anonymous users.
            ('blog_feed', True),
        )


    def template_context_processor(HttpRequest=None):
        return TemplateContextProcessor(HttpRequest).get_context_data()

while ``urls.py`` has url name defined as::

    url(r'^blog-(?P<blog_id>\d+)/$', 'my_blog.views.feed_view', name='blog_feed',
        kwargs={'ajax': True, 'permission_required': 'my_blog.add_feed'}),

and register your context processor in ``settings.py`` as the value of ``TEMPLATES`` list item nested dictionary keys
``['OPTIONS']`` ``['context_processors']``::

    'my_project.context_processors.template_context_processor'

instead of default one::

    'django_jinja_knockout.context_processors.template_context_processor'

.. highlight:: javascript

Then current url generated for ``'blog_feed'`` url name will be available at client-side Javascript as::

    App.routeUrl('blog_feed', {'blog_id': 1});

You will be able to call Django view via AJAX request in your Javascript code like this::

    App.post('blog_feed', {'postvar1': 1, 'postvar2': 2}, {
        kwargs: {'blog_id': 1}
    });
    App.get('blog_feed', {'getvar1': 1}, {
        kwargs: {'blog_id': 1}
    });

where AJAX response will be treated as the list of `viewmodels`_ and will be automatically routed by `app.js`_ to
appropriate viewmodel handler. Django exceptions and AJAX errors also are handled gracefully, displayed in
``BootstrapDialog`` window by default.

.. highlight:: python

Extending context processor is also useful when templates should receive additional arguments by default::

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

* See `djk_sample.TemplateContextProcessor`_ source code for the example of extending `django-jinja-knockout`
  `TemplateContextProcessor`_ to define Django ``url_name`` as client-side route, to make it accessible in client-side
  Javascript from any view.

Middleware
----------

Key functionality of `django-jinja-knockout` middleware is:

.. highlight:: jinja

* AJAX file upload via iframe emulation support for jQuery.ajaxForm() plugin for IE9.
* Setting current Django timezone via browser current timezone.
* Getting current request in non-view functions and methods where no instance of request is available.
* Checking ``DJK_APPS`` applications views for the permissions defined as values of kwargs argument keys in `urls.py`_
  ``url()`` calls:

 * ``'ajax' key`` - ``True`` when view is required to be processed in AJAX request, ``False`` - required to be non-AJAX;

   Otherwise the view is allowed to be processed both as AJAX and non-AJAX, which is used by `grids`_ ``KoGridView``
   to process HTTP GET as Jinja2 template view, while HTTP POST is routed to AJAX methods of the same view.
 * ``'allow_anonymous' key`` - ``True`` when view is allowed to anonymous user (``False`` by default).
 * ``'allow_inactive' key`` - ``True`` when view is allowed to inactive user (``False`` by default).
 * ``'permission_required' key`` - value is the name of Django app / model permission required for this view to be
   called.
 * ``'view_title' key`` - string value of view verbose name, that is displayed by default in `jinja2/base_head.htm`_ as::

    {% if request.view_title %}
        <title>{{ request.view_title }}</title>
    {% endif %}

All of the keys are optional but some have mandatory restricted default values.

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

Then use it in a project::

    from django_jinja_knockout.middleware import ContextMiddleware

For example to get current request in non-view functions and methods, one may use::

    ContextMiddleware.get_request()

and to get current request user::

    ContextMiddleware.get_request().user

* Do not forget that request might be unavailable when running in console, for example in management jobs.

Extending middleware
~~~~~~~~~~~~~~~~~~~~

It's possible to extend built-in `ContextMiddleware`_. In such case ``MIDDLEWARE_CLASSES`` in `settings.py`_ should
contain full name of the extended class. See `djk_sample.ContextMiddleware`_ for the example of extending middleware to
enable logging of Django model performed actions via `content types framework`_.

urls.py
-------

The example of `urls.py`_ for Jinja2 ``_allauth`` templates::

    # More pretty-looking but possibly not compatible with arbitrary allauth version:
    url(r'^accounts/', include('django_jinja_knockout._allauth.urls')),

The example of `urls.py`_ for DTL ``allauth`` templates::

    # Standard allauth DTL templates working together with Jinja2 templates via {% load jinja %}
    url(r'^accounts/', include('allauth.urls')),

The example of `urls.py`_ with view title and permission checking::

    url(r'^equipment-grid(?P<action>/?\w*)/$', EquipmentGrid.as_view(), name='equipment_grid', kwargs={
        'view_title': 'Grid with the available equipment',
        'ajax': True,
        'permission_required': 'club_app.change_manufacturer'
    }),

Templates
---------

.. highlight:: jinja

If your project base template uses Jinja2 templating language:

* Extend your ``base.htm`` template from `jinja2/base_min.htm`_ template
* Or, include `jinja2/base_head.htm`_ styles and `jinja2/base_bottom_scripts.htm`_ scripts required to run client-side of
  `django-jinja-knockout` scripts like `app.js`_ and `ko_grid.js`_ to build up completely different page layout.

If your project base template uses Djanto Template Language (DTL):

* Extend your ``base.html`` template from `templates/base_min.html`_ template
* Or, include `jinja2/base_head.htm`_ styles and `jinja2/base_bottom_scripts.htm`_ scripts via ``{% load jinja %}``
  template tag library::

    {% load jinja %}
    {% jinja 'base_head.htm' %}
    {% if messages %}
        {% jinja 'base_messages.htm' %}
    {% endif %}
    {% jinja 'base_bottom_scripts.htm' %}

Do not forget that Jinja2 does not support extending included templates.

Template engines can be mixed with inclusion of Jinja2 templates from DTL templates like this::

    {% jinja 'bs_navs.htm' with _render_=1 navs=main_navs %}
    {% jinja 'bs_inline_formsets.htm' with _render_=1 related_form=form formsets=formsets action=view.get_form_action_url html=view.get_bs_form_opts %}
    {% jinja 'bs_list.htm' with _render_=1 view=view object_list=object_list is_paginated=is_paginated page_obj=page_obj %}
    {% jinja 'ko_grid.htm' with _render_=1 grid_options=club_grid_options %}
    {% jinja 'ko_grid_body.htm' with _render_=1 %}

See `club_app/templates`_ for full-size examples of including Jinja2 templates from DTL templates.
