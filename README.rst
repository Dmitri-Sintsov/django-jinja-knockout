=====================
django-jinja-knockout
=====================

.. image:: https://badge.fury.io/py/django-jinja-knockout.png
    :target: https://badge.fury.io/py/django-jinja-knockout

Key features
------------

* Bootstrap / Jinja2 / Knockout.js integration into Django projects.
* Dynamic adding / removing of inline formsets with Knockout.js, protected from XSS.
* Knockout.js powered AJAX django.admin-like grids (paginated tables) with sorting / filters and custom actions.
* ``ForeignKeyGridWidget`` provides ``ForeignKeyRawIdWidget``-like functionality to select ``ModelForm`` foreign key
  field value via AJAX query / response.

Overview
--------

Templating languages are my favorite topic in programming. I love semantically organic way of HTML templating in
Knockout.js that uses html5 "data-bind" JSON-like attributes instead of semantically alien double braces, which
conflicts almost every server-side templating language out there (including Jinja2).

When developing with Django, I felt a lack of very powerful server-side templating when used built-in DTL templates.
So I switched to Jinja2, thank to Django 1.8+ built-in support of this templating engine and to great project
https://github.com/niwinz/django-jinja
which simplifies Jinja2 integration.

So, basically in this project two great templating engines (client-side https://github.com/knockout/knockout and
server-side https://github.com/mitsuhiko/jinja2) meet together. That allows to write complex dynamic HTML code with less
effort, cleaner look and easily readable. Both also are very fast, Knockout.js templates being one of the fastest at
client-side, while Jinja2 estimated to be faster few times than built-in DTL templates, and is more powerful.

When thinking of Angluar.js, not only I dislike curly braces in templates but also I believe that using such large
framework for non-SPA applications is an overkill. And Django primary usage are non-SPA classical Web applications,
which aren't "outdated" in any way - because such applications are much better indexable by web crawlers and Python is
better language than Javascript in general and server-side has less glitches than browsers.

Most of client-side scripts included into this redistributable app are server-side agnostic and are not tied much to
Django, except for client-side localization. In fact, significant parts of that client-side code also were used in large
Laravel project. They are included for developer's convenience. Also my personal feeling is, that Django itself lacks
a bit heavier support of client-side Javascript out-of-box. Knockout.js would be great inclusion for ``empty_form``
handling and in ``django.admin``, considering it's small size.

However, some of server-side functionality, like AJAX form validation and viewmodels manipulation is either useless or
will not work without these scripts.

Only AJAX response parts and DOM manipulation (eg. Knockout.js processing of ``formset.empty_form``) are tied to bundled
client-side scripts.

Major changes (version 0.2.0)
-----------------------------
``$.inherit()`` Javascript prototype inheritance function now supports multi-level inheritance with nested ``.super``
calls without having to specify parent class prototype property implicitely in descendant class instances, with newly
introduced ``$.SuperChain`` class.

"django.admin-like" AJAX functionality was implemented via ``KoGridView`` CBV at server-side with corresponding
Knockout.js templates and Javascript classes at client-side. Besides providing standard CRUD actions and filters, it
allows to implement arbitrary actions in descendant classes and quickly design django.admin-like user interfaces in
non-admin views. AJAX calls also saves some HTTP traffic, reducing bandwitch and making the UI more responsive.

New ``ForeignKeyGridWidget`` was developed which provides ``ForeignKeyRawIdWidget``-like functionality in non-admin
``ModelForm`` classes to select foreign key fields value via AJAX query / response.

Support of auto-instantiating Javascript classes with binding these to selected DOM nodes with 'component' css class via
``App.Components`` class.

Support of auto-compiling / auto-loading client-side underscore.js templates via ``App.compileTemplate`` /
``App.domTemplate`` / ``App.loadTemplates``. One of usage examples is possibility of loading modal body from
underscore.js template in ``App.Dialog``.

Support of client-side generation of view urls with kwargs in client-side routes via updated ``context_processors.py``
and client-side ``App.routeUrl()`` Javascript function.

``tpl.resolve_cbv()`` allows to resolve view class via url name and it's kwargs.

Numerous bug fixes.

Documentation
-------------

The full documentation is at https://django-jinja-knockout.readthedocs.org.

Quick notes:

.. Next links are github relative links. Do not process these via sphinx as it does not follow them correctly.
.. _Credits: AUTHORS.rst
.. _contribute: CONTRIBUTING.rst
.. _History: HISTORY.rst
.. _Installation: INSTALLATION.rst
.. _Introduction: QUICKSTART.rst

* Installation_
* Introduction_
* How to contribute_
* History_
* Credits_

Cookiecutter Tools Used in Making This Package
----------------------------------------------

*  cookiecutter
*  cookiecutter-djangopackage
