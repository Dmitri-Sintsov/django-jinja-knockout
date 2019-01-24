.. _get_FOO_display(): https://docs.djangoproject.com/en/dev/ref/models/instances/#django.db.models.Model.get_FOO_display

======
Models
======

This module contains the functions / classes to manipluate Django models.

.. highlight:: python

* ``ContentTypeLinker`` class to simplify generation of contenttypes framework object links.
* ``get_users_with_permission()`` - return the queryset of all users who have specified permission string, including
  all three possible sources of such users (user permissions, group permissions and superusers).
* Next functions allow to use parts of queryset functionality on single Django model object instances:

  * ``get_related_field_val()`` / ``get_related_field()`` support quering of related field properties from supplied
    model instance via specified string with double underscore-separated names, just like in Django querysets.
  * ``model_values()`` - get the dict of model fields name / value pairs like queryset ``values()`` for one model
    instance supplied.

* ``get_meta()`` / ``get_verbose_name()`` - get meta property of Django model field by query string, including related
  (foreign) and reverse-related fields::

    get_verbose_name(profile, 'user__username')
    get_meta(profile, 'verbose_name_plural', 'user__username')

* ``get_choice_str()`` - Similar to Django model built-in magic method `get_FOO_display()`_ but does not require to have
  an instance of particular Django model object. For example::

    class Member(models.Model):

        # ... skipped ...
        role = models.IntegerField(choices=ROLES, default=ROLE_MEMBER, verbose_name='Member role')

    from .models import Member
    from django_jinja_knockout.models import get_choice_str

    # ... skipped ...
    role_str = sdv.get_choice_str(Member.ROLES, role_val)

* ``file_exists()`` - checks whether Diango file field object exists in the filesystem.
