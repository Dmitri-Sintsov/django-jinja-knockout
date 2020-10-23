=====================
django-jinja-knockout
=====================

.. _App.renderValue: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?q=App.renderValue&unscoped_q=App.renderValue
.. _App.renderNestedList: https://django-jinja-knockout.readthedocs.io/en/latest/datatables.html#nested-verbose-field-names
.. _Bootstrap 3: https://github.com/Dmitri-Sintsov/djk-bootstrap3
.. _Bootstrap 4: https://github.com/Dmitri-Sintsov/djk-bootstrap4
.. _data-bind: https://knockoutjs.com/documentation/binding-syntax.html
.. _datatables: https://django-jinja-knockout.readthedocs.io/en/latest/datatables.html
.. _django-jinja-knockout python localization: https://poeditor.com/join/project/9hqQrFEdDM
.. _django-jinja-knockout javascript localization: https://poeditor.com/join/project/049HWzP3eb
.. _empty_form: https://docs.djangoproject.com/en/dev/topics/forms/formsets/#empty-form
.. _FilteredRawQuerySet: https://django-jinja-knockout.readthedocs.io/en/latest/query.html#filteredrawqueryset
.. _ForeignKeyGridWidget: https://django-jinja-knockout.readthedocs.io/en/latest/widgets.html#foreignkeygridwidget
.. _ForeignKeyRawIdWidget: https://github.com/django/django/search?l=Python&q=ForeignKeyRawIdWidget
.. _Jinja2: http://jinja.pocoo.org/docs/dev/
.. _Knockout.js: http://knockoutjs.com/
.. _ListView: https://docs.djangoproject.com/en/dev/ref/class-based-views/generic-display/#listview
.. _ListSortingView: https://django-jinja-knockout.readthedocs.io/en/latest/views.html#listsortingview
.. _KoGridView: https://django-jinja-knockout.readthedocs.io/en/latest/datatables.html
.. _ListQuerySet: https://django-jinja-knockout.readthedocs.io/en/latest/query.html#listqueryset
.. _many to many relationships: https://docs.djangoproject.com/en/dev/topics/db/examples/many_to_many/
.. _ModelForm: https://docs.djangoproject.com/en/dev/topics/forms/modelforms/#modelform
.. _MultipleKeyGridWidget: https://django-jinja-knockout.readthedocs.io/en/latest/datatables.html#multiplekeygridwidget
.. _Nested components: https://django-jinja-knockout.readthedocs.io/en/latest/clientside.html#clientside-nested-components
.. _PageContext: https://django-jinja-knockout.readthedocs.io/en/latest/context_processors.html#pagecontext-page-context
.. _prefetch_related(): https://docs.djangoproject.com/en/dev/ref/models/querysets/#django.db.models.Prefetch
.. _sample project: https://github.com/Dmitri-Sintsov/djk-sample
.. _TemplateResponse: https://docs.djangoproject.com/en/dev/ref/template-response/
.. _UrlPath: https://github.com/Dmitri-Sintsov/djk-sample/search?l=Python&q=UrlPath
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

* Supports Django 2.2 LTS, 3.0, 3.1; Python 3.5 / 3.6 / 3.7 / 3.8.

Please contribute to the localization of the project:

* `django-jinja-knockout python localization`_
* `django-jinja-knockout javascript localization`_

Localization:

* Chinese: ``goldmonkey``
* Dutch: ``Melvyn Sopacua``
* Polish: ``pawelkoston``
* Spanish: ``Julio Cesar Cabrera Cabrera``, kiwnix@9f38e48c5ce33cb641473559f994dd9a18f5722d

Key features
------------

* AJAX based django.admin-like paginated `datatables`_ (grids) with sorting / filters and custom actions.
* Integrates Jinja2 into existing Django templates (DTL).
* `Bootstrap 3`_ / `Bootstrap 4`_ / `Jinja2`_ / `Knockout.js`_ for Django projects.
* No deep knowledge of Knockout.js is required: it has ready working components.
* Dynamic adding / removing of inline formsets with Knockout.js, protected from XSS.
* Default template renderers for Django forms / related forms / inline formsets with the possibility to override these
  to customize the visual layout.
* `ForeignKeyGridWidget`_ provides `ForeignKeyRawIdWidget`_-like functionality to select `ModelForm`_ foreign key
  field value via AJAX query / response.
* Django raw queries with ``filter()`` / ``exclude()`` / ``order()`` / ``values()`` / ``values_list()`` and SQL slicing
  support via `FilteredRawQuerySet`_, suitable for usage in `ListView`_ / `ListSortingView`_ / `KoGridView`_ derived
  classes.
* `ListQuerySet`_ to query Python lists, including `prefetch_related()`_ results.
* Jinja2 templates can be integrated into existing Django templates via custom template library tag::

    {% extends 'base_min.html' %}
    {% load jinja %}
    {% load static %}

    {% block main %}
    {% jinja 'bs_list.htm' with _render_=1 view=view object_list=object_list is_paginated=is_paginated page_obj=page_obj %}
    {% endblock main %}

Overview
--------

Knockout.js uses unobtrusive `data-bind`_ HTML attributes with JSON-like values with causes no conflict to server-side
double braces template syntax of DTL / Jinja2: no need to escape templates.

Combining client-side Knockout.js templates and server-side Jinja2 templates allows to write more powerful and compact
template code.

Jinja2 is faster and is more powerful than built-in DTL templates. Jinja2 templates may be called from DTL templates
by using custom template tag library ``{% load jinja %}``.

Uses
----

* https://github.com/knockout/knockout
* https://github.com/mitsuhiko/jinja2
* Provides DTL tag library to include Jinja2 templates into DTL templates.
* Knockout.js is used to provide `datatables`_ and for XSS-safe `empty_form`_ handling.
* AJAX form validation, AJAX `viewmodels`_ response routing are implemented via bundled client-side scripts.

It's not a pure SPA framework, but a mixed approach of server-side pages with embedded AJAX content and client-side
scripts. Although it may be used for SPA as well. Classical Web applications aren't "outdated" in any way - because such
applications are much better indexable by web crawlers, Python is better language than Javascript in general, also
server-side has less glitches than browsers.

Version 1.1.0
-------------
RangeFilter / DateFilter / DateTimeFilter `ListSortingView`_ filters for numeric / DateField / DateTimeField Django
model fields.

Version 1.0.0
-------------
Django 3.1 / Bootstrap 4.5 / Knockout 3.5 support.

`MultipleKeyGridWidget`_ allows to edit `many to many relationships`_ for Django models.

`PageContext`_ replaces ``TemplateContext`` class with cleaner way to inject view title / client data / client routes /
custom scripts to templates via `TemplateResponse`_.

`App.renderValue`_ supports jQuery elements / nested arrays / objects / strings HTML rendering. `App.renderNestedList`_
supports optional unwrapping of single top DOM node.

Improved Bootstrap popovers support with jQuery ``.getPopoverTip()`` / ``.getVisiblePopovers()`` / ``.closeVisiblePopovers()``
plugins.

Support for `Nested components`_ in formsets.js (`empty_form`_) ``'anonymous_template'`` Knockout binding.

* `UrlPath`_ class supports automatic ``re_path()`` generation with positional named keyword arguments.


.. _History: HISTORY.rst

.. _Changes: CHANGES.rst

Documentation
-------------

The full documentation is at https://django-jinja-knockout.readthedocs.org.

.. github relative links
.. see setup.py

Quick notes
-----------

.. Next links are github relative links. Do not process these via sphinx as it does not follow them correctly.
.. _Credits: AUTHORS.rst
.. _contribute: CONTRIBUTING.rst
.. _Changes: CHANGES.rst
.. _History: HISTORY.rst
.. _Installation: INSTALLATION.rst
.. _Introduction: QUICKSTART.rst

* Installation_
* Introduction_
* How to contribute_
* History_
* Changes_
* Credits_

Cookiecutter Tools Used in Making This Package
----------------------------------------------

*  cookiecutter
*  cookiecutter-djangopackage
