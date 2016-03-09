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

 * It separates AJAX calls from their callback processing, allowing to specify AJAX routes in button html5 data
   attributes without implicit callback.
 * It allows to write more modular Javascript code.
 * Client-side view models can also be executed from Javascript code directly.
 * Possibility to optionally inject view models into html pages, executing these onload.
 * Possibility to execute viewmodels from current user session (also onload).

Admin
~~~~~
* Allow only some model instances to be deleted in django.admin.
* Make readonly foreignkey field to be rendered as link to target model change view.

Context processors
~~~~~~~~~~~~~~~~~~
Context processor adds many useful functions and classes into Jinja2 template context, allowing to write more powerful
and more flexible Jinja2 templates.

* Functions to manipulate css classes in Jinja2 templates.
* Client data to be injected as JSON which is processed then at client-side as response view models
 (client-side response routing).
* Client configuration passed to be accessible at client-side (in Javascript app):

 * `'csrfToken'` - current CSRF token to be used with AJAX POST from Javascript;
 * `'staticPath'` - root static url path to be used with AJAX requests from Javascript;
 * `'userId'` - current user id, 0 for anonymous; used both in templates to detect authorized users and from Javascript
   mostly with AJAX requests;
 * `'url'` - Python dict mapped to Javascript object with the selected list of url routes to be used with AJAX
   requests from Javascript;

* ContentTypeLinker class to easily generate contenttypes framework links in Jinja2 templates.
* get_verbose_name() allows to get verbose_name of Django model field, including related (foreign) and reverse-related
  fields.
* Django functions to format html content: flat_att() / format_html() / force_text().
* Possibility to raise exceptions in Jinja2 templates via `{{ raise('Error message') }}`
* reverseq() allows to build reverse urls with optional query string specified as Python dict.
* sdv_dbg() for optional template variables dump (debug).
* Context processor is inheritable which allows greater flexibility to implement your own custom features by
  overloading methods.

Middleware
~~~~~~~~~~
* Access current request anywhere in form / formset / field widget code - but please do not abuse this feature by
  using request in models code which might be executed without HTTP request (eg. in the management commands)::

    ContextMiddleware.get_request()

* Support optional client-side viewmodels injection from current user session.
* Automatic timezone detection and activation from browser (which should be faster than using maxmind geoip database).
* Secured views permissions with optional checks for AJAX requests, required checks for anonymous / inactive access /
  Django permission, defined as django.conf.urls.url() extra kwargs per view.
  Anonymous views require explicit permission::

    url(r'^signup/$', 'my_app.views.signup', name='signup', kwargs={'allow_anonymous': True})
* View title is optionally defined as url kwargs key to be used in generic templates (one template per many views).
* View kwargs are stored into request.view_kwargs to access these in forms when needed.
* Middleware is inheritable which allows greater flexibility to implement your own extended features via overloaded
  methods.


Cookiecutter Tools Used in Making This Package
----------------------------------------------

*  cookiecutter
*  cookiecutter-djangopackage
