.. :changelog:

History
-------

0.1.0
+++++

* To be released on PyPI.

0.2.0
+++++
* Django 1.8 / 1.9 / 1.10, Python 3.4 / 3.5 support.
* ``djk-sample`` demo / automated testing project.
* "django.admin-like" AJAX functionality implemented via ``KoGridView`` class-based view.
* ``$.inherit()`` Javascript prototype inheritance function now supports multi-level inheritance with nested
  ``._super._call()``.
* ``FilteredRawQuerySet`` supports Django raw querysets with ``.filter()`` / ``.exclude()`` / ``.order_by()`` /
  ``.values()`` / ``.values_list()`` and SQL level slicing.
* ``ForeignKeyGridWidget`` provides ``ForeignKeyRawIdWidget`` -like functionality via AJAX query / response in non-admin
  forms to select ModelForm foreign key values.
* Client-side generation of view urls with kwargs in Javascript client-side routes via ``App.routeUrl()``.
* Nested autocompiled underscore.js client-side templates for Javascript components, primarily used with Knockout.js,
  but is not limited to.
