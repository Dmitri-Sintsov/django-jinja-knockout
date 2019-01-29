.. _field lookups: https://docs.djangoproject.com/en/dev/ref/models/querysets/#field-lookups
.. _file_exists(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=file_exists
.. _get_meta(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=get_meta
.. _get_related_field(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=get_related_field
.. _get_related_field_val(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=get_related_field_val
.. _get_users_with_permission(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=get_users_with_permission
.. _get_verbose_name(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=get_verbose_name
.. _model_values(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=model_values
.. _spanned relationships: https://docs.djangoproject.com/en/dev/topics/db/queries/#lookups-that-span-relationships

======
Models
======

This module contains the functions / classes to manipulate Django models.

.. highlight:: python

* `get_users_with_permission()`_ - return the queryset of all users who have specified permission string, including
  all three possible sources of such users (user permissions, group permissions and superusers).
* Next functions allow to use parts of queryset functionality on single Django model object instances, supporting
  `spanned relationships`_ `without` the `field lookups`_:

  * `get_related_field_val()`_ / `get_related_field()`_ get related field properties from the supplied model instance
    via ``fieldname`` argument string.
  * `model_values()`_ - get the dict of model fields name / value pairs like queryset ``.values()`` for the single model
    instance supplied.

* `get_meta()`_ / `get_verbose_name()`_ - get meta property of Django model field, including `spanned relationships`_
  with the related (foreign) and reverse-related fields::

    get_verbose_name(profile, 'user__username')
    get_meta(profile, 'verbose_name_plural', 'user__username')

* `file_exists()`_ - checks whether Diango file field object exists in the related filesystem.
