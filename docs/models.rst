.. _contenttypes framework: https://docs.djangoproject.com/en/dev/ref/contrib/contenttypes/
.. _field lookups: https://docs.djangoproject.com/en/dev/ref/models/querysets/#field-lookups
.. _file_exists(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=file_exists
.. _get_app_label_model(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=get_app_label_model
.. _get_content_object(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=get_content_object
.. _get_meta(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=get_meta
.. _get_object_description(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=get_object_description
.. _get_related_field(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=get_related_field
.. _get_related_field_val(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=get_related_field_val
.. _get_users_with_permission(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=get_users_with_permission
.. _get_verbose_name(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=get_verbose_name
.. _Model.__str()__: https://docs.djangoproject.com/en/dev/ref/models/instances/#str
.. _Model.get_str_fields(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=get_str_fields
.. _model_values(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=model_values
.. _natural key: https://docs.djangoproject.com/en/dev/topics/serialization/#topics-serialization-natural-keys
.. _spanned relationships: https://docs.djangoproject.com/en/dev/topics/db/queries/#lookups-that-span-relationships

======
Models
======

This module contains the functions / classes to get information about Django models or to manipulate them.

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

* `get_object_description()`_ - returns the possibly nested list / dict of django model fields.
  Uses `Model.get_str_fields()`_, when available, otherwise fallback to `Model.__str()__`_. See :ref:`get_str_fields()`
  for more info.

* `get_app_label_model()`_ - parses dot-separated name of app_label / model (`natural key`_) as returned by
  `contenttypes framework`_. Can be used to parse request content type argument like this::

    app_label, model = get_app_label_model(self.request_get('model', ''))

* `get_content_object()`_ - returns content type / content object via `contenttypes framework`_ with any valid
  combination of arguments: ``object_id``, ``content_type_id``, ``app_label``, ``model``. For example, to get the Model
  instance from the request::

    app_label, model = get_app_label_model(self.request_get('model', ''))
    object_id = self.request_get('content_object_id', None)
    content_type, content_object = get_content_object(object_id=object_id, app_label=app_label, model=model)
