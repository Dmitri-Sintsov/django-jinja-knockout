.. _field lookups: https://docs.djangoproject.com/en/dev/ref/models/querysets/#field-lookups
.. _FilteredRawQuerySet sample: https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=FilteredRawQuerySet
.. _ListSortingView: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=class+listsortingview
.. _KoGridView: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=class+kogridview


========
query.py
========

FilteredRawQuerySet
-------------------

``FilteredRawQuerySet`` inherits Django ``RawQuerySet`` class whose instances are returned by Django model object manager
``.raw()`` calls.

It supports ``.filter()`` / ``.exclude()`` / ``.order_by()`` / ``values()`` / ``values_list()``
queryset methods and also SQL-level slicing which is much more efficient than Python slicing of ``RawQuerySet``.

These methods are used by filtering / ordering code in `ListSortingView`_ and `KoGridView`_ class-based views.

See `FilteredRawQuerySet sample`_ in ``djk-sample`` project source code for a complete example of AJAX grid with
raw query which has ``LEFT JOIN`` statement.

Since version 0.4.0 it supports args with Q objects.

ListQuerySet
------------
``ListQuerySet`` implements large part of Django queryset functionality for Python lists of Django model instances.
Such lists are returned by Django queryset ``.prefetch_related()`` method.

.. highlight:: python

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

Version 0.3.0 implements ``.filter()`` / ``.exclude()`` / slicing / ``.order_by()`` / ``.first()`` / ``.values()`` /
``.values_list()`` methods. Many but not all of the `field lookups`_ are supported. Feel free to submit a pull request
if you need more functionality.

Version 0.8.0 implemented spanned relationships for ``.order_by()`` method.
