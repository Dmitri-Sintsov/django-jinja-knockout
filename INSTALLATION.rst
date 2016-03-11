=============
Installation
=============

Inside virtualenv of your Django 1.8 project, install `django-jinja-knockout`::

    python3 -m pip install django-jinja-knockout

To install latest master from repository::

    pip3 install --upgrade git+https://github.com/Dmitri-Sintsov/django-jinja-knockout.git

To install specific commit::

    pip3 install --upgrade git+https://github.com/Dmitri-Sintsov/django-jinja-knockout.git

Then use it in a project::

    import django_jinja_knockout

To import only required names (for example)::

    from django_jinja_knockout.forms import (
        BootstrapModelForm, DisplayModelMetaclass, WidgetInstancesMixin,
        set_knockout_template, set_empty_template, FormWithInlineFormsets
    )
