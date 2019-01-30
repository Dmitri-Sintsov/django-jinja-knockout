=====================
django-jinja-knockout
=====================

.. _Bootstrap 3: https://github.com/Dmitri-Sintsov/djk-bootstrap3
.. _Bootstrap 4: https://github.com/Dmitri-Sintsov/djk-bootstrap4
.. _celery: http://www.celeryproject.org/
.. _custom tags: https://django-jinja-knockout.readthedocs.io/en/latest/clientside.html#clientside-custom-tags
.. _Knockout.js: http://knockoutjs.com/
.. _Jinja2: http://jinja.pocoo.org/docs/dev/
.. _django-jinja-knockout python localization: https://poeditor.com/join/project/9hqQrFEdDM
.. _django-jinja-knockout javascript localization: https://poeditor.com/join/project/049HWzP3eb
.. _Nested components: https://django-jinja-knockout.readthedocs.io/en/latest/clientside.html#clientside-nested-components
.. _Nested serializer: https://django-jinja-knockout.readthedocs.io/en/latest/usage.html#quickstart-serializers
.. _prefetch_related(): https://docs.djangoproject.com/en/dev/ref/models/querysets/#django.db.models.Prefetch
.. _Renderer: https://django-jinja-knockout.readthedocs.io/en/latest/tpl.html#tpl-renderer
.. _reverseq(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=reverseq&type=&utf8=%E2%9C%93
.. _sample project: https://github.com/Dmitri-Sintsov/djk-sample
.. _Sparse components: https://django-jinja-knockout.readthedocs.io/en/latest/clientside.html#clientside-sparse-components
.. _template attributes merging: https://django-jinja-knockout.readthedocs.io/en/latest/clientside.html#clientside-attributes-merging
.. _underscore.js templates: http://django-jinja-knockout.readthedocs.io/en/latest/quickstart.html#underscore-js-templates
.. _viewmodels: https://django-jinja-knockout.readthedocs.io/en/latest/viewmodels.html

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

.. image:: https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif
   :alt: Donate to support further development
   :target: https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=EWVQRCWPUE652&source=url

Screenshot of the `sample project`_:

.. image:: https://raw.githubusercontent.com/wiki/Dmitri-Sintsov/djk-sample/djk_edit_inline.png
   :width: 740px

More screenshots with descriptions are available at: https://github.com/Dmitri-Sintsov/djk-sample/wiki

Documentation (in development): https://django-jinja-knockout.readthedocs.org/

* Django 1.8, 1.9, 1.10, 1.11, 2.0, 2.1 support. Python 3.5 / 3.6 / 3.7 support.

Please contribute to the localization of the project:

* `django-jinja-knockout python localization`_
* `django-jinja-knockout javascript localization`_

Localization:

* Chinese: ``goldmonkey``
* Dutch: ``Melvyn Sopacua``
* Polish: ``pawelkoston``
* Spanish: ``Julio Cesar Cabrera Cabrera``

Key features
------------

* AJAX based django.admin-like paginated datatables (grids) with sorting / filters and custom actions.
* Integrates Jinja2 into existing Django templates (DTL).
* `Bootstrap 3`_ / `Bootstrap 4`_ / `Jinja2`_ / `Knockout.js`_ for Django projects.
* No deep knowledge of Knockout.js is required: it has ready working components.
* Dynamic adding / removing of inline formsets with Knockout.js, protected from XSS.
* Default template renderers for Django forms / related forms / inline formsets with the possibility to override these
  to customize the visual layout.
* ``ForeignKeyGridWidget`` provides ``ForeignKeyRawIdWidget``-like functionality to select ``ModelForm`` foreign key
  field value via AJAX query / response.
* Django raw queries with ``filter()`` / ``exclude()`` / ``order()`` / ``values()`` / ``values_list()`` and SQL slicing
  support via ``FilteredRawQuerySet``, suitable for usage in ``ListView`` / ``ListSortingView`` / ``KoGridView`` derived
  classes.
* ``ListQuerySet`` to query Python lists, including ``prefetch_related()`` results.
* Jinja2 templates can be integrated into existing Django templates via custom template library tag::

    {% extends 'base_min.html' %}
    {% load jinja %}
    {% load static %}

    {% block main %}
    {% jinja 'bs_list.htm' with _render_=1 view=view object_list=object_list is_paginated=is_paginated page_obj=page_obj %}
    {% endblock main %}

Overview
--------

Templating languages are my favorite topic in programming. I love semantically organic way of HTML templating in
Knockout.js that uses html5 "data-bind" JSON-like attributes instead of semantically alien double braces, which
conflicts to almost every server-side templating language (including DTL and Jinja2).

When developing with Django, I felt a lack of more powerful server-side templating when used built-in DTL templates.
So I switched to Jinja2, thank to Django 1.8+ built-in support of this templating engine and to great project
https://github.com/niwinz/django-jinja which simplifies Jinja2 integration. I took further step, providing DTL tag
library to include Jinja2 templates into DTL templates.

In this project two great templating engines (client-side https://github.com/knockout/knockout and server-side
https://github.com/mitsuhiko/jinja2) meet together. That allows to write complex dynamic HTML code with less
effort, cleaner look and easily readable. Both also are very fast, Knockout.js templates being one of the fastest at
client-side, while Jinja2 estimated to be faster few times than built-in DTL templates, and is more powerful.

When thinking of Angluar.js, not only I dislike curly braces in templates but also I believe that using such large
framework for non-SPA applications is an overkill. Django primary usage are non-SPA classical Web applications, which
aren't "outdated" in any way - because such applications are much better indexable by web crawlers and Python is better
language than Javascript in general, and server-side has less glitches than browsers.

My personal feeling is that Django itself lacks a bit heavier support of client-side Javascript out-of-box. Knockout.js
would be great inclusion for ``empty_form`` handling and in ``django.admin``, considering it's small size.

AJAX form validation, AJAX `viewmodels`_ response routing and Knockout.js processing of ``formset.empty_form`` are
implemented via bundled client-side scripts.

Major changes (version 0.8.0)
-----------------------------
`Bootstrap 4`_ / `Bootstrap 3`_ support.

Default rendering layouts for fields / forms / related forms / inline formsets, which can be customized via providing
custom template or via inheriting the `Renderer`_ class.

Underscore.js templates support `template attributes merging`_ and `custom tags`_.

`Nested components`_ and `Sparse components`_ at the client-side.

`Nested serializer`_.

Major changes (version 0.7.0)
-----------------------------
Datatables now have new type of action ``'pagination'``. There are two built-in actions of this type implemented:
``'rows_per_page'`` and ``'switch_highlight'``.

Datatables support compound columns for better utilization of the display space. That allows to display more data
columns, including foreign relations at the screen.

Datatables ``glyphicon`` actions are rendered in the single column of datatable, instead of each action per column for
better utilization of the display space.

Static assets are moved to '/djk' subdirectory, minimizing the risk of conflicts with third party assets.

Updated to latest versions of Knockout.js / jQuery / Bootstrap 3 (should also work with not-too-old ones).

`viewmodels`_ AJAX response routing is rewritten as ``App.ViewModelRouter`` class with default instance
``App.vmRouter``. It now supports binding viewmodel handlers to Javascript class instances methods.

Optional built-in Javascript error logger.

``App.NestedList`` internally used by ``App.renderNestedList`` for greater flexibility of client-side Javascript nested
lists rendering. ``App.NestedList`` now supports ordered maps via ``_.ODict`` instances.

Ajax forms submitting is refactored into ``App.AjaxForm`` class, while setting up the ajax forms is performed by
``App.AjaxForms``, for better flexibility.

``App.readyInstances`` introduced for global client-side IoC, available in custom user scripts as well.

Knockout.js method subscription / unsubscription is placed into ``App.ko.Subscriber`` mixin class. ``focus`` binding
is implemented for Knockout.js.

Request mock-up when running without web server is greatly improved. That enables reverse resolving of FQN urls in
console management commands and in background celery tasks via `reverseq()`_ calls when sites framework is correctly
set up.

``ast_eval`` templage tag.

Headless Chrome Selenium webdriver support (phantom.js is deprecated).

Major changes (version 0.6.0)
-----------------------------
AJAX actions are rewritten as server-side ``ActionsView`` class and client-side counterpart ``App.Actions``. It is now
used as foundation for most of AJAX code, including grid datatables and new ``App.EditForm`` / ``App.EditInline``
client-side components.

New widget ``widgets.PrefillWidget`` to select pre-filled text from the list of supplied values.

Selective skipping of ``DisplayText`` field widget rendering.

Basic version of ``ViewmodelValidator`` for AJAX submitted forms.

Major changes (version 0.5.0)
-----------------------------
Rewritten recursive underscore.js template processor, see `underscore.js templates`_.

Displaying verbose field names in grid rows, grid row actions and in ``ForeignKeyGridWidget`` placeholder.

Clean-up of client-side components code.

Better support for datatable grids that use RAW queries with ``LEFT JOIN``, which may have multiple rows with the same
``pkVal`` equal to ``null``.

Improvements in Selenium automation testing: better handling of automation commands, more of commands implemented,
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
datatable grids.

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
