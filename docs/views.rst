.. _ActionList: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/event_app/views.py
.. _ActionsView: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=ActionsView
.. _ajax_refresh: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=ajax_refresh
.. _BaseFilter: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?q=BaseFilter&type=code
.. _BaseFilterView: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=BaseFilterView&type=code
.. _bs_inline_formsets(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/bs_inline_formsets.htm
.. _bs_list: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/bs_list.htm
.. _bs_pagination: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/bs_pagination.htm
.. _ChoicesFilter: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?q=ChoicesFilter&type=code
.. _component_class: https://github.com/Dmitri-Sintsov/djk-sample/search?q=component_class&type=code
.. _empty_form: https://docs.djangoproject.com/en/dev/topics/forms/formsets/#empty-form
.. _FoldingPaginationMixin: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=FoldingPaginationMixin
.. _.get_main_navs(): https://github.com/Dmitri-Sintsov/djk-sample/search?l=Python&q=get_main_navs
.. _.get_success_url(): https://docs.djangoproject.com/en/dev/ref/class-based-views/mixins-editing/#django.views.generic.edit.FormMixin.get_success_url
.. _GridActionsMixin: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=GridActionsMixin
.. _InlineFormRenderer: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=inlineformrenderer
.. _ioc_field_filter: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?q=ioc_field_filter&type=code
.. _ko_grid_body.htm: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/ko_grid_body.htm
.. _KoGridView: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=kogridview
.. _ListView: https://docs.djangoproject.com/en/dev/ref/class-based-views/generic-display/#listview
.. _ModelFormActionsView: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=ModelFormActionsView
.. _NavsList: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=NavsList
.. _RangeFilter: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?q=RangeFilter&type=code
.. _settings.py: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/djk_sample/settings.py
.. _set_knockout_template: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=set_knockout_template
.. _ViewmodelView: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=ViewmodelView

==============
Built-in views
==============

Inheritance hierarchy
---------------------
Version 1.0.0:

* ``PageContextMixin(TemplateResponseMixin, ContextMixin, View):`` - provides :ref:`PageContext (page_context)`;
* ``ViewmodelView(TemplateResponseMixin, ContextMixin, View)`` - render component templates and process viewmodels
  response (see :doc:`viewmodels`);

    * ``FormatTitleMixin(PageContextMixin)`` - customizes `View title`_;
    * ``BsTabsMixin(PageContextMixin)`` - `BsTabsMixin`_;
    * ``FormViewmodelsMixin(ViewmodelView)`` - forms and forms fields AJAX viewmodel response;
    * ``BaseFilterView(PageContextMixin)`` - model queryset filtering / ordering base view, used by both
      `ListSortingView`_ and AJAX `Datatables`_;

    * ``ActionsView(FormatTitleMixin, ViewmodelView)`` - generic actions for viewmodels (:ref:`viewmodels_ajax_actions`);
    * ``ModelFormActionsView(ActionsView, FormViewmodelsMixin)`` - AJAX actions to display / edit Django ModelForm /
      inline formsets;

        * ``GridActionsMixin(ModelFormActionsView)`` - AJAX actions to display / process ModelForm datatable (grid);

            * ``KoGridView(BaseFilterView, GridActionsMixin)`` - includes all the actions and functionality from the
              above classes and adds common code base for paginated :doc:`datatables`;
            * ``KoGridRelationView(KoGridView)`` - used by BaseGridWidget, see :ref:`widgets_foreignkeygridwidget`;

Views kwargs
------------

The built-in middleware is applied only to the views which belong to modules (Django apps) registered in project
``settings`` module ``DJK_APPS`` variable like this::

    DJK_APPS = (
        'my_app',
    )

    INSTALLED_APPS = (
        'django.contrib.admin',
        'django.contrib.auth',
        'django.contrib.contenttypes',
        'django.contrib.sessions',
        'django.contrib.messages',
        'django.contrib.staticfiles',
        'django.contrib.sites',
        'django_jinja',
        'django_jinja.contrib._humanize',
        'djk_ui',
        'django_jinja_knockout',
    ) + DJK_APPS

See ``djk-sample`` `settings.py`_ for the complete example.

See also :ref:`middleware_installation`, :ref:`middleware_security` for the description of additional permission check
view kwargs.

.. _views_view_title:

View title
~~~~~~~~~~
View title is optionally defined as url kwargs ``'view_title'`` key value::

    from my_app.views import signup
    # ...
    url(r'^signup/$', signup, name='signup', kwargs={'view_title': 'Sign me up', 'allow_anonymous': True})

.. highlight:: jinja

to be used in generic Jinja2 templates (v0.8.x or older)::

    {{ request.resolver_match.view_title }}

or (v1.0.0 or newer), which uses :ref:`PageContext (page_context)`::

    {{ page_context.get_view_title() }}

Django view kwargs are originally available in ``request.resolver_match.kwargs`` attribute to use in forms / templates,
when needed.

.. _views_formwithinlineformsetsmixin:

FormWithInlineFormsetsMixin
---------------------------

.. highlight:: python

The base class for the set of class-based views that create / edit the related form with the inline formsets with
built-in support of ``django_jinja_knockout.forms`` module ``FormWithInlineFormsets`` class.

It supports both non-AJAX and AJAX form submission and validation. AJAX validation and AJAX success action is performed
with built-in extensible :doc:`viewmodels`. By default AJAX supports class-based view `.get_success_url()`_ automatic
client-side redirect on success which can be replaced to another AJAX viewmodel handler via overriding this method in
derived view class.

Setting class attribute `ajax_refresh`_ value to ``True`` causes the successful AJAX submission of the form with the
inline formsets to refresh the form HTML with just saved values instead of `.get_success_url()`_ redirect to another url.
This is useful when the additional client-side processing is required, or when the form is the part of some component,
like :ref:`macros_bs_tabs` tab.

Zero or one related form is supported and zero / one / many of inline formsets. Adding / removing inline forms is
supported via Knockout.js custom bindings with XSS protection, which are generated via `set_knockout_template`_ function
that uses `InlineFormRenderer`_ with formset `empty_form`_. HTML rendering usually is performed with Jinja2
`bs_inline_formsets()`_ macro.

The following views inherit this class:

* ``InlineCreateView`` - CBV view to create new models with one to many related models.
* ``InlineCrudView`` - CBV view to create / edit models with one to many related models.
* ``InlineDetailView`` - CBV view to display or to update models with one to many related models. Suitable both for
  CREATE and for VIEW actions, last case via ``ModelForm`` with ``metaclass=DisplayModelMetaclass``.

.. _views_bstabsmixin:

BsTabsMixin
-----------
* ``BsTabsMixin`` - automatic template context processor for CBV's, which uses ``prepare_bs_navs()`` function and
  :ref:`macros_bs_navs` jinja2 macro to navigate through the navbar list of visually grouped Django view links.
* ``prepare_bs_navs()`` - highlight current url of Bootstrap navbar. It's possible to override the highlighted navbar
  link by specifying navs[]['attrs']['class'] = 'active' value.

To implement server-side tabs navigation, one should define class inherited from `BsTabsMixin`_ with custom
`.get_main_navs()`_ method of this class. For the example::

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
            'manufacturer_fk_widget',
            'profile_fk_widget'
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

``main_navs`` may be the instance of `NavsList`_ type, which holds ``props`` dict attribute, allowing to pass extra data
to Jinja2 template which then would call :ref:`macros_bs_navs` Jinja2 macro. That allows to set the navbar menu CSS
styles dynamically via `NavsList`_ ``props``.

.. _views_listsortingview:

ListSortingView
---------------
`ListSortingView`_ is a `ListView`_ with built-in support of sorting and field filtering.

Version 1.1.0 implements standard Django ``range`` / ``date`` / ``datetime`` filter fields, which could be extended by
specifying custom ``template`` / `component_class`_ arguments of ``allowed_filter_fields`` dict items, see the sample
`ActionList`_::


    from django_jinja_knockout.views import ListSortingView

    from .models import Action


    class ActionList(ListSortingView):
        # Enabled always visible paginator links because there could be many pages of actions, potentially.
        always_visible_links = True
        model = Action
        grid_fields = [
            [
                'performer',
                'performer__is_superuser',
                'date',
            ],
            'action_type',
            'content_object'
        ]
        allowed_sort_orders = [
            'performer',
            'date',
            'action_type',
        ]

        def get_allowed_filter_fields(self):
            allowed_filter_fields = {
                # Override default templates for filter fields:
                'action_type': {'template': 'bs_navs.htm'},
                # Specify custom client-side Javascript component class to extend it's functionality:
                'id': {
                    'component_class': 'RangeFilter',
                },
                'date': None,
                # Generate widget choices for contenttypes framework:
                'content_type': self.get_contenttype_filter(
                    ('club_app', 'club'),
                    ('club_app', 'equipment'),
                    ('club_app', 'member'),
                ),
            }
            return allowed_filter_fields

See :ref:`clientside_global_ioc` how to register custom Javascript ``component_class``.

It's possible to specify ``allowed_filter_fields`` widget ``choices``, ``template`` name and extra options at once::

    allowed_filter_fields = {
        'club': {
            'choices': [(club.pk, club.title) for club in Club.objects.filter(category=Club.CATEGORY_PROFESSIONAL)],
            'multiple_choices': False,
            'component_class': 'CustomChoicesFilter',
            # should generate client-side component which uses specified component_class:
            'template': 'custom_choices_widget.htm',
        },
    }

It's also possible to override values of filter template kwargs or to add extra template kwargs with ``template_kwargs``
option::

    allowed_filter_fields = {
        'content_type': self.get_contenttype_filter(
            'template': 'bs_dropdown.htm',
            'choices':
                ('club_app', 'club'),
                ('club_app', 'equipment'),
                ('club_app', 'member'),
            'template_kwargs': {
                'menu_attrs': {
                    'class': 'dropdown-menu dropdown-menu-left'
                }
            },
        ),
    }

* Some options, such as ``template`` / `component_class`_ are applicable to any filter, inherited from `BaseFilter`_.
* ``choices`` / ``multiple_choices`` options are applicable only to `ChoicesFilter`_.
* See `ChoicesFilter`_  / `RangeFilter`_ for the examples of widget.
* See :ref:`clientside_components` how to create client-side components.
* ``KoGridView`` :doc:`datatables` uses limited subset of filters, because it has it's widgets generated by
  `ko_grid_body.htm`_ macro. See `ioc_field_filter`_ implementations.

`BaseFilterView`_ interface (``grid_fields`` / ``allowed_sort_orders`` / ``allowed_filter_fields``) is
inherited by both `ListSortingView`_ and by AJAX-based ``KoGridView`` (:doc:`datatables`), which allows to switch
between traditional full page server-rendered HTML views and dynamic AJAX views just via changing their parent class
name.

* `FoldingPaginationMixin`_ - `ListView`_ / `ListSortingView`_ mixin that enables advanced pagination in
  `bs_pagination`_ / `bs_list`_ Jinja2 macros.

Viewmodels views and actions views
----------------------------------
* `ViewmodelView`_ - base view; GET request usually generates html template, POST - returns AJAX viewmodels. It
  is the base class for the following built-in classes:

* `ActionsView`_ - implements AJAX actions router and their viewmodels responses. Actions allow to perform different
  AJAX POST requests to the same view. The responses are the AJAX viewmodels.
* `ModelFormActionsView`_ - implements AJAX actions specific to Django ModelForm / inline formsets handling: rendering
  form / validating / saving. It is also the base class for grids (datatables) actions, because the editing of datatables
  includes form editing via `GridActionsMixin`_.

For introduction to viewmodels, see :doc:`viewmodels`.

For more detailed explanation of these views see :ref:`viewmodels_ajax_actions`.

Datatables
----------

* `KoGridView`_ - together with ``grid.js`` allows to create AJAX powered django.admin-like datatables with filtering,
  sorting, search, CRUD actions and custom actions. See :doc:`datatables` for more details.

Useful methods / classes of the views module
--------------------------------------------

* ``auth_redirect()`` - authorization required response with redirect to login. Supports 'next' url query argument.
  Supports JSON viewmodel response.
* ``cbv_decorator()`` - may be used to check class-based views permissions.
* ``ContextDataMixin`` - allows to inject pre-defined dict of ``extra_context_data`` into template context of
  class-based view.
