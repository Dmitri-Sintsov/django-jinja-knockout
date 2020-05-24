.. _get_choice_str(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=get_choice_str
.. _get_FOO_display(): https://docs.djangoproject.com/en/dev/ref/models/instances/#django.db.models.Model.get_FOO_display
.. _nested_update(): https://github.com/Dmitri-Sintsov/djk-sample/search?l=Python&q=nested_update

============
utils/sdv.py
============

Contains helper functions internally used by django-jinja-knockout. Some of these might be useful in Django project
modules.

Class / model helpers
---------------------
* ``get_object_members()``
* ``get_class_that_defined_method()``
* ``extend_instance()`` - allows to dynamically add mixin class to class instance. Can be used to dynamically add
  different :ref:`views_BsTabsMixin` ancestors to create context-aware navbar menus.
* ``FuncArgs`` - class which instance may hold args / kwargs which then may be applied to the specified method.
* ``get_str_type()`` - get string of type for the specified object.
* `get_choice_str()`_ - Similar to Django model built-in magic method `get_FOO_display()`_ but does not require to have
  an instance of particular Django model object.

For example::

    class Member(models.Model):

        # ... skipped ...
        role = models.IntegerField(choices=ROLES, default=ROLE_MEMBER, verbose_name='Member role')

    from .models import Member
    from django_jinja_knockout.models import get_choice_str

    # ... skipped ...
    role_str = sdv.get_choice_str(Member.ROLES, role_val)

Debug logging
-------------

``dbg()`` - dumps ``value`` into text log file `'sdv_out.py3'` under ``name`` label. To setup log file path specify the
``LOGPATH`` value in Django project ``settings.py`` like that::

    import os
    from django_jinja_knockout.utils import sdv

    # create log file inside active virtualenv path
    sdv.LOGPATH = [os.environ['VIRTUAL_ENV'], 'djk-sample', 'logs']

Then one may use it to log variables in Python code::

    from django_jinja_knockout.utils import sdv

    class Project(models.Model):

      # ... skipped ...

      def save(self, *args, **kwargs):
          sdv.dbg('self.pk', self.pk)
          # ... skipped ...

When Project.save() method will be executed, `'sdv_out.py3'` log file will contain lines like this::

    # /home/user/work/djk_sample/djk-sample/club-app/models.py::save()::251
    # self.pk
    9

Where ``9`` was the value of ``self.pk``.

Iteration
---------
* ``reverse_enumerate()``
* ``iter_enumerate()`` - enumerates both dicts, lists and tuples of lists (dict-like structures with repeated keys) in
  unified way.
* ``yield_ordered()`` - ordered enumeration of dicts (Python 3.6+) / OrderedDict / lists.

Nested data structures access
-----------------------------
* ``get_nested()`` / ``set_nested()`` / ``nested_values()`` for nested data with mixed lists / dicts.
* `nested_update()`_ recursive update of Python dict. Used in :doc:`datatables` extended classes to update ``super()``
  ``.get_actions()`` action dict.

String helpers
--------------
* ``str_to_numeric`` - convert string to numeric value, when possible.
