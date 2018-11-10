============
utils/sdv.py
============

Contains helper functions internally used by django-jinja-knockout. Some of these might be useful in Django project
modules.

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
