.. _installation: https://django-jinja-knockout.readthedocs.io/en/latest/installation.html

===================
Management commands
===================

djk_seed
--------

Implements optional ``djk_seed`` Django management command which may be used to seed initial data into managed models
database tables after the migrations are complete. To enable model data seed after the migration, define ``seed`` method
of the model like this::

    class Specialization(models.Model):
        BUILTIN_SPECIALIZATIONS = (
            ('Administrator', False),
            ('Manager', True),
            ('Contractor', True),
        )

        @classmethod
        def seed(cls, recreate=False):
            if recreate or cls.objects.count() == 0:
                # Setup default  list (only once).
                for name, is_anon in cls.BUILTIN_SPECIALIZATIONS:
                    cls.objects.update_or_create(name=name, defaults={
                        'is_builtin': True,
                        'is_anon': is_anon
                    })

then add app which has ``Specialization`` model into settings.DJK_APPS list. See `installation`_ for more info
about ``DJK_APPS`` list.

.. highlight:: bash

After that run the console command::

    ./manage.py djk_seed

``djk_seed`` management command has ``--help`` option which describes possible use cases. For example it may create
models content types for the selected Django apps, not running any post-migration seed::

    ./manage.py djk_seed --create-content-types --skip-seeds

This is often an pre-requisite to have contenttypes framework running correctly.
