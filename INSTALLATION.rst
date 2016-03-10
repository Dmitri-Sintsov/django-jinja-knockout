=============
Installation
=============

Inside virtualenv of your Django 1.8 project, install `django-jinja-knockout`::

    python3 -m pip install django-jinja-knockout

Then use it in a project::

    import django_jinja_knockout

or to import only required names, for example::

    from django_jinja_knockout.forms import (
        BootstrapModelForm, DisplayModelMetaclass, WidgetInstancesMixin,
        set_knockout_template, set_empty_template, FormWithInlineFormsets
    )
