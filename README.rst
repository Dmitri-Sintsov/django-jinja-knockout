=====================
django-jinja-knockout
=====================

.. _celery: http://www.celeryproject.org/
.. _Knockout.js: http://knockoutjs.com/
.. _Jinja2: http://jinja.pocoo.org/docs/dev/
.. _Bootstrap 3: http://getbootstrap.com/
.. _django-jinja-knockout python localization: https://poeditor.com/join/project/9hqQrFEdDM
.. _django-jinja-knockout javascript localization: https://poeditor.com/join/project/049HWzP3eb
.. _sample application: https://github.com/Dmitri-Sintsov/djk-sample
.. _prefetch_related(): https://docs.djangoproject.com/en/dev/ref/models/querysets/#django.db.models.Prefetch
.. _underscore.js templates: http://django-jinja-knockout.readthedocs.io/en/latest/quickstart.html#underscore-js-templates

.. image:: https://badge.fury.io/py/django-jinja-knockout.png
   :alt: PyPI package
   :target: https://badge.fury.io/py/django-jinja-knockout

.. image:: https://circleci.com/gh/Dmitri-Sintsov/django-jinja-knockout.svg?style=shield
    :target: https://circleci.com/gh/Dmitri-Sintsov/django-jinja-knockout

.. image:: https://img.shields.io/travis/Dmitri-Sintsov/django-jinja-knockout.svg?style=flat
    :target: https://travis-ci.org/Dmitri-Sintsov/django-jinja-knockout

.. image:: http://www.icoph.org/img/ic-youtube.png
    :alt: Watch selenium tests recorded videos.
    :target: https://www.youtube.com/channel/UCZTrByxVSXdyW0z3e3qjTsQ

.. image:: https://badges.gitter.im/django-jinja-knockout/Lobby.svg
   :alt: Join the chat at https://gitter.im/django-jinja-knockout/Lobby
   :target: https://gitter.im/django-jinja-knockout/Lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge

Screenshot of `sample application`_:

.. image:: https://raw.githubusercontent.com/wiki/Dmitri-Sintsov/djk-sample/djk_edit_inline.png
   :width: 740px

More screenshots with descriptions are available at: https://github.com/Dmitri-Sintsov/djk-sample/wiki

Documentation (in development): https://django-jinja-knockout.readthedocs.org/

Please contribute to the localization of the project:

* `django-jinja-knockout python localization`_
* `django-jinja-knockout javascript localization`_

Localization contributors:

* Dutch: ``Melvyn Sopacua``
* Polish: ``pawelkoston``

Key features
------------

* Django 1.8, 1.9, 1.10, 1.11 support. Python 3.4 / 3.5 / 3.6 support.
* `Supports existing Django templates (DTL).`
* `Bootstrap 3`_ / `Jinja2`_ / `Knockout.js`_ integration into Django projects.
* No deep knowledge of Knockout.js is required: it has ready working components.
* Dynamic adding / removing of inline formsets with Knockout.js, protected from XSS.
* Django raw queries with ``filter()`` / ``exclude()`` / ``order()`` / ``values()`` / ``values_list()`` and SQL slicing
  support via ``FilteredRawQuerySet``, suitable for usage in ``ListView`` / ``ListSortingView`` / ``KoGridView`` derived
  classes.
* Knockout.js powered AJAX django.admin-like grids (paginated tables) with sorting / filters and custom actions.
* ``ForeignKeyGridWidget`` provides ``ForeignKeyRawIdWidget``-like functionality to select ``ModelForm`` foreign key
  field value via AJAX query / response.
* Jinja2 templates can be integrated into existing Django templates via custom
  template library tag::

    {% extends 'base_min.html' %}
    {% load jinja %}
    {% load staticfiles %}

    {% block main %}
    {% jinja 'bs_list.htm' with _render_=1 view=view object_list=object_list is_paginated=is_paginated page_obj=page_obj %}
    {% endblock main %}

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

Major changes (version 0.5.0)
-----------------------------
Rewritten recursive underscore.js template processor, see `underscore.js templates`_.

Displaying verbose field names in grid rows, grid row actions and in ``ForeignKeyGridWidget`` placeholder.

Clean-up of client-side components code.

Better support for grids that use RAW queries with ``LEFT JOIN``, which may have multiple rows with the same ``pkVal``
=== ``null``.

Improvenemtns in Selenium automation testing: better handling of automation commands, more of commands implemented,
much larger test coverage.

* Numerous bugfixes, including related field queries support in ``FilteredRawQuerySet``.

Major changes (version 0.4.0)
-----------------------------
Large improvements in Selenium testing support: additional commands are implemented, auto-retry on DOM timeout, fixtures
loading / saving which allows to skip already debugged parts of tests, saving developer's time.

``ContextMiddleware`` supports request mocking and request-time storage.

``FilteredRawQuerySet`` supports Q expressions (Q objects) with relation mapping.

``BaseFilterView`` / ``KoGridView`` - basic support for Q expressions (currently is used for ``None`` value of field
filter), support for ``in`` query for ``choice`` filter value via the list of values.

Even better support of optional Django model ``get_str_fields()`` method in ``DisplayText`` widget and in Knockout.js
grids.

Various bugfixes.

Minor changes (version 0.4.1)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Implemented ``multiple_choices``: ``True`` option of the field filter ``type`` ``choices`` in ``ListSortingView``.
That allows to perform ``in`` field lookups for the selected field filter.

Large monolithic ``views.py`` split into smaller parts with symbols exported via module ``__init__.py`` for the
convenience and compatibility.

Alternative breadcrumbs layout of field filters widgets.

Bugfixes and security fixes in query / views modules.

Major changes (version 0.3.0)
-----------------------------

Auto-configuration of nested foreign key filter fields in ``KoGridView`` / ``ForeignKeyGridWidget``.

``FilteredRawQuerySet`` now supports more precise ``.count()`` method.

``ListQuerySet`` supports significant part of Django queryset functionality for the lists of Django model instances,
returned by `prefetch_related()`_.

Bootstrap tabs generation macro ``bs_tabs()`` with client-side support of switching tabs when window.location.hash
value changes.

``SendmailQueue`` functionality can be extended via injecting ioc class - for example to send email in the background
via `celery`_ task.

Major changes (version 0.2.0)
-----------------------------
``$.inherit()`` Javascript prototype inheritance function now supports multi-level inheritance with nested ``.super``
calls without having to specify parent class prototype property implicitely in descendant class instances, with newly
introduced ``$.SuperChain`` class.

"django.admin-like" AJAX functionality was implemented via ``KoGridView`` class-based view (CBV) at server-side with
corresponding Knockout.js templates and Javascript classes at client-side. Besides providing standard CRUD actions and
filters, it allows to implement arbitrary actions in descendant classes and quickly design django.admin-like user
interfaces in non-admin views. AJAX calls also minimize server HTTP traffic, reducing network bandwitch and making the
UI more responsive.

New ``ForeignKeyGridWidget`` was developed which provides ``ForeignKeyRawIdWidget``-like functionality in non-admin
``ModelForm`` classes to select foreign key fields value via AJAX query / response.

Support of auto-instantiating Javascript classes with binding these to selected DOM nodes with 'component' css class via
``App.Components`` class.

Support of auto-compiling / auto-loading client-side underscore.js templates via ``App.compileTemplate`` /
``App.domTemplate`` / ``App.loadTemplates``. One of usage examples is the possibility of loading modal body from
underscore.js template in ``App.Dialog``.

Support of client-side generation of view urls with kwargs for client-side url names via updated ``context_processors.py``
and client-side ``App.routeUrl()`` Javascript function.

``tpl.resolve_cbv()`` allows to resolve view class via url name and it's kwargs.

Django templates (DTL) and Jinja2 templates now can be mixed using shared Jinja2 template code via ``{% load jinja %}``
template library ``jinja`` template tags, which performs ``include`` for Jinja2 template with current context::

    {% extends 'base_min.html' %}
    {% load jinja %}
    {% load staticfiles %}

    {% block main %}
    {% jinja 'bs_list.htm' with _render_=1 view=view object_list=object_list is_paginated=is_paginated page_obj=page_obj %}
    {% endblock main %}

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
