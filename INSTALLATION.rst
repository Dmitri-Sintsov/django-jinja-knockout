=============
Installation
=============

* `django-jinja-knockout` 0.2.0 supports Python 3.4 / 3.5, Django 1.8 / 1.9 / 1.10.
* Django template language is supported via including Jinja2 templates from DTL templates. Pure Jinja2 projects are
  supported as well.

.. _app.js: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/static/js/front/app.js
.. _ContextMiddleware: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/middleware.py
.. _djk_sample.ContextMiddleware: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/djk_sample/middleware.py
.. _djk_sample.TemplateContextProcessor: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/djk_sample/context_processors.py
.. _settings.py: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/djk_sample/settings.py
.. _TemplateContextProcessor: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/context_processors.py
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

One may use existing example of `settings.py`_ as the base to develop your own ``settings.py``.

settings.py
-----------

Pluggable applications
~~~~~~~~~~~~~~~~~~~~~~

``DJK_APPS`` tuple is the subset of ``INSTALLED_APPS`` tuple that defines project applications which views will be
processed by built-in `ContextMiddleware`_ class ``process_view()`` method via checking the result of
``is_our_module()`` method.

.. highlight:: python

To apply `django-jinja-knockout` `ContextMiddleware`_ to the views of project apps, define ``DJK_APPS`` tuple with the
list of Django project's applications like that::

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

``allauth`` support is not mandatory but optional; just remove the following apps in case you do not need allauth::

    # The Django sites framework is required for 'allauth'
    'django.contrib.sites',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'django_jinja_knockout._allauth',

Built-in allauth DTL templates are supported. In such case next module is not required::

    'django_jinja_knockout._allauth',

* It is possible to extend `django-jinja-knockout` `ContextMiddleware`_ to add new functionality. See
  `djk_sample.ContextMiddleware`_ code for example.

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
``context_processors.py`` (see below).

Define project context processor
--------------------------------

If you want to use built-in ``App.get()`` / ``App.post()`` functionality, which dispatches AJAX requests according to
Django ``urls.py`` url names, create ``context_processors.py`` in your main project application with the following
code::

    from django_jinja_knockout.context_processors import TemplateContextProcessor as BaseContextProcessor


    class TemplateContextProcessor(BaseContextProcessor):

        CLIENT_ROUTES = (
            # This route is injected into every page globally (not per view).
            # This is a good idea if some client-side route is frequently used.
            # Alternatively one can specify client route url names per view.
            # Second element of each tuple defines whether client-side route should be available to anonymous users.
            ('my_url_name', True),
        )


    def template_context_processor(HttpRequest=None):
        return TemplateContextProcessor(HttpRequest).get_context_data()

and register your context processor in ``settings.py``::

    'my_project.context_processors.template_context_processor'

instead of default one::

    'django_jinja_knockout.context_processors.template_context_processor'

.. highlight:: javascript

Then you will be able to perform the following shortcuts in your Javascript code::

    App.post('my_url_name', {'postvar1': 1, 'postvar2': 2});
    App.get('my_url_name');

where AJAX response will be treated as the list of ``viewmodels`` (see documentation section for detailed explanation)
and automatically routed by `app.js`_. Django exceptions and AJAX errors also are handled gracefully, displayed in
``BootstrapDialog`` window by default.

Since version 0.2.0, it is possible to specify client-side routes per view::

    def my_view(request):
        request.client_routes.extend([
            'my_url_name'
        ])

and per class-based view::

    class MyGrid(KoGridView):

        client_routes = [
            'my_grid_url_name'
        ]

* See `djk_sample.TemplateContextProcessor`_ source code for the example of extending `django-jinja-knockout`
  `TemplateContextProcessor`_.

Middleware
----------

.. highlight:: python

Install ``django_jinja_knockout.middleware`` into ``settings.py``::

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

    import django_jinja_knockout


To import only required names (for example)::

    from django_jinja_knockout.forms import (
        BootstrapModelForm, DisplayModelMetaclass, WidgetInstancesMixin,
        set_knockout_template, set_empty_template, FormWithInlineFormsets
    )

urls.py
-------

The example of `urls.py`_ for Jinja2 ``_allauth`` templates::

    # More pretty-looking but possibly not compatible with arbitrary allauth version:
    url(r'^accounts/', include('django_jinja_knockout._allauth.urls')),

The example of `urls.py`_ for DTL ``allauth`` templates::

    # Standard allauth DTL templates working together with Jinja2 templates via {% load jinja %}
    url(r'^accounts/', include('allauth.urls')),

Templates
---------

.. highlight:: jinja

Inherit your base template from ``jinja2/base_min.htm`` template::

    {% extends 'base_min.htm' %}

    {% block top_styles %}
    {# request.view_title is provided by urls.py and middleware.py #}
    <title>{{ request.view_title }}</title>
    {% endblock top_styles %}

    {% block mainmenu %}
        <li><a href=""</li>
    {% if client_conf.userId != 0 %}
        {# registered user allauth links #}
        <li><a href="{{ url('account_email') }}">{{ _('Change E-mail') }}</a></li>
        <li><a href="{{ url('account_logout') }}">{{ _('Sign Out') }}</a></li>
    {% else %}
        {# anonymous user allauth links #}
        <li><a href="{{ url('account_login') }}">{{ _('Sign In') }}</a></li>
        <li><a href="{{ url('account_signup') }}">{{ _('Sign Up') }}</a></li>
    {% endif %}
    {% endblock mainmenu %}

    {% block main %}

    {% endblock main %}

or look for included scripts in ``base_min.htm`` to develop your own Jinja2 base template from scratch, if you need a
completely different layout.
