.. _Class-Based views: https://docs.djangoproject.com/en/dev/topics/class-based-views/
.. _re_path: https://docs.djangoproject.com/en/dev/ref/urls/#re-path
.. _UrlPath: https://github.com/Dmitri-Sintsov/djk-sample/search?l=Python&q=urlpath

=======
urls.py
=======

.. highlight:: python

Since the version 1.0.0, auto-generation of Django `re_path`_ `Class-Based views`_ urls is supported via `UrlPath`_
class::

    from django_jinja_knockout.urls import UrlPath

* ``action`` class-based view kwarg is used with :ref:`viewmodels_ajax_actions`.

Here are some examples of `UrlPath`_ calls and their equivalent via `re_path`_.

Simplest example
----------------

view.action_kwarg = None
~~~~~~~~~~~~~~~~~~~~~~~~

UrlPath::

    UrlPath(ClubCreate)(name='club_create'),

is equivalent to re_path::

    re_path(r'^club-create/$', ClubCreate.as_view(), name='club_create'),

ActionsView / KoGridView (view.action_kwarg = 'action')
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
UrlPath::

    UrlPath(MyActionsView)(name='actions_view'),

is equivalent to re_path::

    re_path(r'^actions-view(?P<action>/?\w*)/$', MyActionsView.as_view(), name='actions_view'),

Extra kwargs for view_title and permissions checking
----------------------------------------------------
UrlPath::

    UrlPath(EquipmentGrid)(
        name='equipment_grid',
        kwargs={
            'view_title': 'Grid with the available equipment',
            'permission_required': 'club_app.change_manufacturer'
        }
    ),

is equivalent to re_path::

    re_path(r'^equipment-grid(?P<action>/?\w*)/$', EquipmentGrid.as_view(),
        name='equipment_grid', kwargs={
            'view_title': 'Grid with the available equipment',
            'permission_required': 'club_app.change_manufacturer'
        }),


Override url base path
----------------------
UrlPath::

    UrlPath(MyActionsView)(
        name='actions_view_url_name',
        base='my-actions-view',
        kwargs={'view_title': 'Sample ActionsView'}
    ),

is equivalent to re_path::

    re_path(r'^my-actions-view(?P<action>/?\w*)/$', MyActionsView.as_view(),
        name='actions_view_url_name',
        kwargs={'view_title': 'Sample ActionsView'}),

Extra view named kwarg
----------------------

view.action_kwarg = None
~~~~~~~~~~~~~~~~~~~~~~~~
UrlPath::

    UrlPath(ClubDetail)(
        name='club_detail',
        args=['club_id'],
        kwargs={'view_title': '{}'}
    ),

is equivalent to re_path::

    re_path(r'^club-detail-(?P<club_id>\d+)/$', ClubDetail.as_view(),
        name='club_detail', kwargs={'view_title': '{}'}),

ActionsView / KoGridView (view.action_kwarg = 'action')
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
UrlPath::

    UrlPath(ClubMemberGrid)(
        name='club_member_grid',
        args=['club_id'],
        kwargs={'view_title': '"{}" members'}
    ),

is equivalent to re_path::

    re_path(r'^club-member-grid-(?P<club_id>\w*)(?P<action>/?\w*)/$', ClubMemberGrid.as_view(),
        name='club_member_grid',
        kwargs={'view_title': '"{}" members'}),

Change view named kwargs order
------------------------------
UrlPath::

    UrlPath(MyActionsView)(
        name='actions_view',
        args=['action', 'club_id'],
        kwargs={
            'view_title': 'Club actions',
        }
    ),

is equivalent to re_path::

    re_path(r'^actions-view(?P<action>/?\w*)-(?P<club_id>\d+)/$', name='actions_view', kwargs={
            'view_title': 'Club actions',
        }),

UrlPath::

    UrlPath(ClubGrid)(
        name='club_grid',
        base='clubs',
        args=['club_id', 'type'],
        kwargs={'view_title': 'Club list',
                'permission_required': 'club_app.view_club'}
    ),

is equivalent to re_path::

    re_path(r'^clubs-(?P<club_id>\d+)-(?P<type>\w*)(?P<action>/?\w*)/$', name='club_grid',
            kwargs={'view_title': 'Club list',
            'permission_required': 'club_app.view_club'}),

* For introduction to viewmodels, see :doc:`viewmodels`.
