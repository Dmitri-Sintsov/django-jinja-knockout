.. _bs_inline_formsets(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/bs_inline_formsets.htm
.. _.get_main_navs(): https://github.com/Dmitri-Sintsov/djk-sample/search?l=Python&q=get_main_navs
.. _KoGridView: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=class+kogridview

Views kwargs
~~~~~~~~~~~~

Views are secured by the middleware with urls that deny access to anonymous / inactive users by default. Anonymous views
require explicit permission defined as ``url()`` extra kwargs per each view in ``urls.py``::

    from my_app.views import signup
    # ...
    url(r'^signup/$', signup, name='signup', kwargs={'allow_anonymous': True})

Optional checks for AJAX requests and / or specific Django permission::

    from my_app.views import check_project
    # ...
    url(r'^check-project/$', check_project, name='check_project', kwargs={
        'ajax': True, 'permission_required': 'my_app.project_can_add'
    })

View title is optionally defined as url kwargs ``'view_title'`` key value::

    from my_app.views import signup
    # ...
    url(r'^signup/$', signup, name='signup', kwargs={'view_title': 'Sign me up', 'allow_anonymous': True})

.. highlight:: jinja

to be used in generic Jinja2 templates (one template per many views)::

    {{ request.view_title }}

View kwargs are stored into ``request.view_kwargs`` to make these accessible in forms / templates when needed.

* ``auth_redirect()`` - authorization required response with redirect to login. Supports 'next' url query argument.
  Supports JSON viewmodel response.
* ``error_response()`` / ``exception_response()`` - wrappers around ``django.http.HttpResponseBadRequest`` to allow JSON
  viewmodel response in AJAX requests in case of error / exception occured.
* ``cbv_decorator()`` - may be used to check class-based views permissions.
* ``ContextDataMixin`` - allows to inject pre-defined dict of ``extra_context_data`` into template context of
  class-based view.

FormWithInlineFormsetsMixin
~~~~~~~~~~~~~~~~~~~~~~~~~~~
The base class for the set of class-based views that create / edit the related form with the inline formsets with
built-in support of ``django_jinja_knockout.forms`` module ``FormWithInlineFormsets`` class.

Zero or one related form is supported and zero / one / many of inline formsets. Adding / removing inlie forms is
supported via Knockout.js custom bindings with XSS protection. HTML rendering usually is performed with Bootstrap 3
Jinja2 `bs_inline_formsets()`_ macro.

The following views inherit this class:

* ``InlineCreateView`` - CBV view to create new models with one to many related models.
* ``InlineCrudView`` - CBV view to create / edit models with one to many related models.
* ``InlineDetailView`` - CBV view to display or to update models with one to many related models. Suitable both for
  CREATE and for VIEW actions, last case via ``ModelForm`` with ``metaclass=DisplayModelMetaclass``.

.. _quickstart_bstabsmixin:

BsTabsMixin
~~~~~~~~~~~
* ``BsTabsMixin`` - automatic template context processor for CBV's, which uses ``prepare_bs_navs()`` function and
  ``bs_navs()`` jinja2 macro to navigate through the navbar list of visually grouped Django view links.
* ``prepare_bs_navs()`` - used to highlight current url in Bootstrap 3 navbars.

To implement server-side tabs navigation, one should define the class inherited from :ref:`quickstart_bstabsmixin`
and to define custom `.get_main_navs()`_ method of this class. For the example::

    class ClubNavsMixin(BsTabsMixin):

        def get_main_navs(self, request, object_id=None):
            main_navs = [
                {'url': reverse('club_list'), 'text': 'List of clubs'},
                {'url': reverse('club_create'), 'text': 'Create new club'}
            ]
            if object_id is not None:
                main_navs.extend([
                    {
                        'url': reverse('club_detail', kwargs={'club_id': object_id}),
                        'text': format_html('View "{}"', self.object.title)
                    },
                    {
                        'url': reverse('club_update', kwargs={'club_id': object_id}),
                        'text': format_html('Edit "{}"', self.object.title)
                    }
                ])
            return main_navs

Then every class which uses the tabs should inherit (mix) from ClubNavsMixin::

    class ClubEditMixin(ClubNavsMixin):

        client_routes = {
            'manufacturer_fk_widget_grid',
            'profile_fk_widget_grid'
        }
        template_name = 'club_edit.htm'
        form_with_inline_formsets = ClubFormWithInlineFormsets


    class ClubCreate(ClubEditMixin, InlineCreateView):

        def get_bs_form_opts(self):
            return {
                'class': 'club',
                'title': 'Create sport club',
                'submit_text': 'Save sport club'
            }

        def get_success_url(self):
            return reverse('club_detail', kwargs={'club_id': self.object.pk})

.. _quickstart_listsortingview:

ListSortingView
~~~~~~~~~~~~~~~
* `ListSortingView`_ - ``ListView`` with built-in support of sorting and field filtering::

    from django_jinja_knockout.views import ListSortingView

    from .models import Club

    class ClubList(ListSortingView):

        model = Club
        allowed_sort_orders = '__all__'
        allowed_filter_fields = {
            # None value will autodetect field filter choices, when possible.
            'category': None,
        }
        grid_fields = [
            'title',
            'category',
            'foundation_date',
        ]

* ``FoldingPaginationMixin`` - ``ListView`` / `ListSortingView`_ mixin that enables advanced pagination in
  ``bs_pagination()`` / ``bs_list()`` Jinja2 macros.

* `KoGridView`_ - together with ``grid.js`` allows to create AJAX powered django.admin-like datatables with filtering,
  sorting, search, CRUD actions and custom actions. See :doc:`grids` for more details.
