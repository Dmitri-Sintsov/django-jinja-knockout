.. _clientside: https://django-jinja-knockout.readthedocs.io/en/latest/clientside.html
.. _datatables: https://django-jinja-knockout.readthedocs.io/en/latest/datatables.html
.. _forms: https://django-jinja-knockout.readthedocs.io/en/latest/forms.html
.. _get_FOO_display(): https://docs.djangoproject.com/en/dev/ref/models/instances/#django.db.models.Model.get_FOO_display
.. _installation: https://django-jinja-knockout.readthedocs.io/en/latest/installation.html
.. _middleware: https://django-jinja-knockout.readthedocs.io/en/latest/middleware.html
.. _pretetch_related: https://docs.djangoproject.com/en/dev/ref/models/querysets/#prefetch-related
.. _query.py: https://django-jinja-knockout.readthedocs.io/en/latest/query.html
.. _viewmodels: https://django-jinja-knockout.readthedocs.io/en/latest/viewmodels.html
.. _views: https://django-jinja-knockout.readthedocs.io/en/latest/views.html

Key features overview
---------------------

Datatables
----------

The packages includes server-side (Python) and client-side (Javascript) code to quickly create easy to use datatables
with standard / custom actions, including adding, editing, deleting for Django models. See the `datatables`_ for more
info.

Client-side
-----------

There are lots of client-side Javascript included into the package. See the `clientside`_ for more info.

admin.py
--------
* ``DjkAdminMixin`` - optionally inject css / scripts into django.admin to support widgets.OptionalInput.
* ``ProtectMixin`` - allow only some model instances to be deleted in django.admin.
* ``get_admin_url`` - make readonly foreignkey field to be rendered as link to the target model admin change view.
* ``get_model_change_link`` - generates the link to django admin model edit page.

forms.py / formsets.js
----------------------
See `forms`_ for the detailed explanation.

* ``BootstrapModelForm`` - Form with field classes stylized for Bootstrap 3. Since version 0.4.0 it also always has
  ``request`` attribute for convenience to be used in ``clean()`` method and so on.
* ``DisplayModelMetaclass`` - Metaclass used to create read-only "forms", to display models as html tables.
* ``WidgetInstancesMixin`` - Provides model instances bound to ``ModelForm`` in field widgets. It helps to make custom
  ``get_text_fn`` / ``get_text_method`` callbacks for ``DisplayText`` form widgets .
* ``set_knockout_template`` - Monkey-patching methods for formset to support knockout.js version of ``empty_form``. Allows
  to dynamically add / remove new forms to inline formsets, including third-party custom fields with inline Javascript
  (such as AJAX populated html selects, rich text edit fields).
* ``FormWithInlineFormsets`` - Layer on top of related form and it's many to one multiple formsets. GET / CREATE / UPDATE.
  Works both in function views and in class-based views (CBVs).
* ``SeparateInitialFormMixin`` - Mixed to ``BaseInlineFormset`` to use different form classes for already existing model
  objects and for newly added ones (empty_form). May be used with ``DisplayModelMetaclass`` to display existing forms as
  read-only, while making newly added ones editable.
* ``CustomFullClean`` / ``StripWhilespaceMixin`` mixins for Django forms.


management/commands/djk_seed.py
-------------------------------
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

middleware.py
-------------

See `middleware`_.

models.py
---------

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

query.py
--------
* Allows to create raw Django querysets with filter methods such as filter() / order_by() / count().
* Allows to convert Python lists to Django-like querysets, which is useful to filter the data received via
  `pretetch_related`_ Django ORM reverse relation query.

It makes possible to use raw SQL queries and Python lists as the arguments of datatable / filtered lists / paginators.
See `query.py`_ for more info.

serializers.py
--------------
Nested serializer for Django model instances with localization / internationalisation.

tpl.py
------
Renderer class for recursive object context rendering. See `forms`_ for more info. Various formatting functions.

viewmodels.py
-------------
Server-side Python functions and classes to manipulate lists of client-side viewmodels. Mostly are used with AJAX JSON
responses and in ``app.js`` client-side response routing. Read `viewmodels`_ documentation for more info.

views submodule
---------------
See `views`_ for the detailed explanation.
