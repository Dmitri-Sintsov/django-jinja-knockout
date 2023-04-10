.. _aggregate: https://docs.djangoproject.com/en/dev/topics/db/aggregation/#generating-aggregates-over-a-queryset
.. _bulk_create_future: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?q=bulk_create_future&type=code
.. _field lookups: https://docs.djangoproject.com/en/dev/ref/models/querysets/#field-lookups
.. _FilteredRawQuerySet sample: https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=FilteredRawQuerySet
.. _ListSortingView: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=class+listsortingview
.. _KoGridView: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=class+kogridview
.. _spanned relationships: https://docs.djangoproject.com/en/dev/topics/db/queries/#lookups-that-span-relationships


========
query.py
========

FilteredRawQuerySet
-------------------

.. highlight:: python

``FilteredRawQuerySet`` inherits Django ``RawQuerySet`` class whose instances are returned by Django model object manager
``.raw()`` calls.

It supports ``.filter()`` / ``.exclude()`` / ``.order_by()`` / ``values()`` / ``values_list()``
queryset methods and also SQL-level slicing which is much more efficient than Python slicing of ``RawQuerySet``.

These methods are used by filtering / ordering code in `ListSortingView`_ and `KoGridView`_ class-based views.

See `FilteredRawQuerySet sample`_ in ``djk-sample`` project source code for a complete example of AJAX grid with
raw query which has ``LEFT JOIN`` statement.

Since version 0.4.0 it supports args with Q objects via ``relation_map`` argument::

    raw_qs = Profile.objects.raw(
        'SELECT club_app_profile.*, club_app_member.is_endorsed, '
        'auth_user.username AS user__username, '
        'CONCAT_WS(\' \', auth_user.last_name, auth_user.first_name) AS fio '
        'FROM club_app_profile '
        'LEFT JOIN club_app_member ON club_app_profile.user_id = club_app_member.profile_id AND '
        'club_app_member.project_id=%s AND club_app_member.role=%s '
        'JOIN auth_user ON auth_user.id = club_app_profile.user_id ',
        params=[self.project.pk, 'watch'],
    )
    fqs = FilteredRawQuerySet.clone_raw_queryset(
        raw_qs=raw_qs, relation_map={'is_endorsed': 'member'}
    )

ListQuerySet
------------
``ListQuerySet`` implements large part of Django queryset functionality for Python lists of Django model instances.
Such lists are returned by Django queryset ``.prefetch_related()`` method.

This allows to have the same logic of processing queries with both ``.prefetch_related()`` applied results and without
them. For example, imagine one have two querysets::

    from django.db import models
    from django.db.models import Prefetch
    from django_jinja_knockout.query import ListQuerySet

    def process_related():
        qs1 = Project.objects.all()[:10]
        qs2 = Project.objects.all()[:10].prefetch_related(
            Prefetch(
                'projectmember_set',
                to_attr='projectmember_list'
            )
        )
        (obj.process_members() for obj in qs1)
        (obj.process_members() for obj in qs2)

    class Project(models.Model):

        # ... skipped ...

        def process_members(self):
            # Detect Prefetch().
            if hasattr(self, 'projectmember_list'):
                qs = ListQuerySet(self.projectmember_list)
            else:
                qs = self.projectmember_set
            # ... Do .filter() / .order_by() / slice operation with qs
            qs_subset = qs.filter(is_approved=False)
            # ... Do some more operations with qs_subset or it's members.
            for obj in qs_subset:
                obj.approve()

    class ProjectMember(models.Model):

        project = models.ForeignKey(Project, verbose_name='Project')
        is_approved = models.BooleanField(default=False, verbose_name='Approved member')
        # ... skipped ...

        def approve(self):
            self.is_approved = True

* Version 0.3.0 implemented ``.filter()`` / ``.exclude()`` / slicing / ``.order_by()`` / ``.first()`` / ``.values()`` /
  ``.values_list()`` methods. Many but not all of the `field lookups`_ are supported. Feel free to submit a pull request
  if you need more functionality.
* Version 0.8.0 implemented `spanned relationships`_ for ``.order_by()`` method.
* Version 0.8.1 implemented ``|`` and ``+`` operators for `ListQuerySet`_. Note that the operation does not ensure the
  uniqueness of the resulting queryset. In case unique rows are required, call ``.distinct('pk')`` on the result.
* Version 2.2.0 implemented basic support of ``.delete()`` method (with signals) / ``.get()`` method and the most common
  `aggregate`_ functions: ``Count``, ``Min``, ``Max``, ``Sum``.

FutureQuerySet
--------------
Aims to provide backward-compatible fallback methods of QuerySet.

Currently has implemented `bulk_create_future`_ method, which applies ``update_conflicts`` arguments of ``bulk_create``
only for Django 4.2 or newer version.
