=============
Installation
=============

Inside virtualenv of your Django 1.8 project, install `django-jinja-knockout`::

    python3 -m pip install django-jinja-knockout

To install latest master from repository::

    pip3 install --upgrade git+https://github.com/Dmitri-Sintsov/django-jinja-knockout.git

To install specific commit::

    pip3 install --upgrade git+https://github.com/Dmitri-Sintsov/django-jinja-knockout.git

Add django_jinja_knockout to INSTALLED_APPS in ``settings.py``::

    INSTALLED_APPS = (
        'django.contrib.admin',
        'django.contrib.auth',
        'django.contrib.contenttypes',
        'django.contrib.humanize',
        'django.contrib.sessions',
        'django.contrib.messages',
        'django.contrib.staticfiles',
        ...
        'django_jinja_knockout',
    )

If you want to use built-in allauth support, also add::

    INSTALLED_APPS = (
        ...
        # The Django sites framework is required for 'allauth'
        'django.contrib.sites',
        'allauth',
        'allauth.account',
        'allauth.socialaccount',
        'django_jinja_knockout',
        'django_jinja_knockout._allauth',
    )

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
