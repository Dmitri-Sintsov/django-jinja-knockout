=============
Installation
=============

Virtual environment
-------------------

.. highlight:: bash

Inside virtualenv of your Django 1.8 project, install `django-jinja-knockout`::

    python3 -m pip install django-jinja-knockout

To install latest master from repository::

    python3 -m pip install --upgrade git+https://github.com/Dmitri-Sintsov/django-jinja-knockout.git

To install specific commit::

    python3 -m pip install --upgrade git+https://github.com/Dmitri-Sintsov/django-jinja-knockout.git

Pluggable applications
----------------------

.. highlight:: python

Add django_jinja_knockout to INSTALLED_APPS in ``settings.py``::

    INSTALLED_APPS = (
        'django.contrib.admin',
        'django.contrib.auth',
        'django.contrib.contenttypes',
        'django.contrib.humanize',
        'django.contrib.sessions',
        'django.contrib.messages',
        'django.contrib.staticfiles',
        # ...
        'django_jinja_knockout',
    )

If you want to use built-in allauth support, also add::

    INSTALLED_APPS = (
        # ...
        # The Django sites framework is required for 'allauth'
        'django.contrib.sites',
        'allauth',
        'allauth.account',
        'allauth.socialaccount',
        'django_jinja_knockout',
        'django_jinja_knockout._allauth',
    )

Context processors
------------------

Add django_jinja_knockout template context processor to ``settings.py``::

    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    TEMPLATES = [
        {
            "BACKEND": "django_jinja.backend.Jinja2",
            "APP_DIRS": True,
            "OPTIONS": {
                "match_extension": ".htm",
                "app_dirname": "jinja2",
                'context_processors': [
                    # `allauth` needs this from django.
                    'django.template.context_processors.request',
                    # Required for 'django_jinja_knockout' templates to work.
                    'django_jinja_knockout.context_processors.template_context_processor',
                ]
            },
            'DIRS': [
                os.path.join(BASE_DIR, 'my_project', 'templates'),
            ]
        },
        {
            'BACKEND': 'django.template.backends.django.DjangoTemplates',
            'DIRS': [],
            'APP_DIRS': True,
            'OPTIONS': {
                'debug': DEBUG,
                'context_processors': [
                    'django.template.context_processors.debug',
                    'django.template.context_processors.request',
                    'django.contrib.auth.context_processors.auth',
                    'django.contrib.messages.context_processors.messages',
                ],
            },
        },
    ]

or, if you want to use built-in server-side to client-side route mapping, create your own project
``context_processors.py`` (see below).

Define project context processor
--------------------------------

If you want to use built-in App.get() / App.post() functionality, which dispatches AJAX requests according to Django
``urls.py`` url names, create ``context_processors.py`` in your main project application with the following code::

    from django_jinja_knockout.context_processors import TemplateContextProcessor as BaseContextProcessor


    class TemplateContextProcessor(BaseContextProcessor):

        CLIENT_ROUTES = (
            # Second element of each tuple defines whether client-side route should be available to anonymous users.
            ('my_url_name', True),
        )


    def template_context_processor(HttpRequest=None):
        return TemplateContextProcessor(HttpRequest).get_context_data()

and register your context processor in ``settings.py`` instead of default::

    'django_jinja_knockout.context_processors.template_context_processor'

.. highlight:: javascript

Then you will be able to perform the following shortcuts in your Javascript code::

    App.post('my_url_name', {'postvar1': 1, 'postvar2': 2});
    App.get('my_url_name');

where AJAX response will be treated as the list of ``viewmodels`` (see section for detailed explanation) and
automatically routed by ``app.js``. No usual jQuery response callback is needed! Django exceptions and AJAX errors also
are handled gracefully, displayed in ``BootstrapDialog`` window by default.

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
