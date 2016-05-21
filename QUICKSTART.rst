===========
Quickstart
===========

Key features overview

app.js / tooltips.js
--------------------
* Implements client-side helper classes for Twitter Bootstrap 3.
* Implements client-side response routing:

 * Separates AJAX calls from their callback processing, allowing to specify AJAX routes in button html5 data
   attributes without defining DOM event handler and implicit callback.
 * Allows to write more modular Javascript code.
 * Client-side view models can also be executed from Javascript code directly.
 * Possibility to optionally inject client-side view models into html pages, executing these onload.
 * Possibility to execute client-side viewmodels from current user session (persistent onload).
 * ``App.viewHandlers`` - predefined standard response routing viewmodels to display BootstrapDialogs and to manipulate
   DOM.
 * ``App.ajaxButton`` - automation of button click event AJAX POST handling for Django.
 * ``App.ajaxForm`` - Django form AJAX POST submission with validation errors display via response client-side viewmodels.
   By default requires no more than ``is_ajax=True`` argument of ``bs_form()`` / ``bs_inline_formsets()`` Jinja2 macros.
   The whole process of server-side to client-side validation errors mapping is performed by
   ``FormWithInlineFormsetsMixin.form_valid()`` / ``form_invalid()`` methods, defined in ``django_jinja_knockout.views``.
   Also supports class-based view ``get_success_url()`` automatic client-side redirect on success.
   Supports multiple Django POST routes for the same AJAX form via multiple ``input[type="submit"]`` buttons in the
   generated form html body.

* ``App.Dialog`` BootstrapDialog wrapper.
* ``App.get()`` / ``App.post()`` automate execution of AJAX POST handling for Django and allow to export named Django
  urls like ``url(name='my_url_name')`` to be used in client-side code directly.
* Client initialization is separated from ``$(document).ready()`` initialization, because client initialization also
  might be performed for dynamically added HTML DOM content (from AJAX response or via Knockout.js templates).
  For example, custom ``'formset:added'`` jQuery event automatically supports client initialization (field classes /
  field event handlers) when new form is added to inline formset dynamically.
  ``$(document).ready()`` event handler uses it's own hook system for plugins, to do not interfere with external scripts
  code.

plugins.js
----------
Set of jQuery plugins.

* ``$.inherit`` - Meta inheritance.
  Copies parent object ``prototype`` methods into ``instance`` of pseudo-child.
  Multi-inheritance is possible via calling ``$.inherit`` multiple times with
  different ``superName`` value.
* ``$.autogrow`` plugin to automatically expand text lines of textarea elements;
* ``$.linkPreview`` plugin to preview outer links in secured html5 iframes;
* ``$.scroller`` plugin - AJAX driven infinite vertical scroller;

.. highlight:: html

These jQuery plugins have their Knockout.js bindings in ``app.js``, simplifying their usage in client-side scripts:

* ``ko.bindingHandlers.autogrow``::

    <textarea data-bind="autogrow: {rows: 4}"></textarea>
* ``ko.bindingHandlers.linkPreview``::

    <div data-bind="html: text, linkPreview"></div>
* ``ko.bindingHandlers.scroller``::

    <div class="rows" data-bind="scroller: {top: 'loadPreviousRows', bottom: 'loadNextRows'}">

admin.py
--------
* ``ProtectMixin`` - allow only some model instances to be deleted in django.admin.
* ``get_admin_url`` - make readonly foreignkey field to be rendered as link to target model change view.

context_processors.py
---------------------
Context processor adds many useful functions and classes into Jinja2 template context, allowing to write more powerful
and more flexible Jinja2 templates.

* Functions to manipulate css classes in Jinja2 templates: ``add_css_classes()`` / ``add_css_classes_to_dict()``.
* ``client_data`` dict to be injected as JSON to HTML page, which is accessible then at client-side as
  ``App.clientData`` Javascript object, including optional JSON client-side viewmodels, executed when html page is
  loaded::

    <script language="JavaScript">
        App.conf = {{ client_conf|escapejs(True) }};
        App.clientData = {{ client_data|escapejs(True) }};
    </script>

* ``cilent_conf`` dict passed to be accessible at client-side (``App.conf`` Javascript object) with the following keys:

 * ``'csrfToken'`` - current CSRF token to be used with AJAX POST from Javascript;
 * ``'staticPath'`` - root static url path to be used with AJAX requests from Javascript;
 * ``'userId'`` - current user id, 0 for anonymous; used both in Jinja2 templates to detect authorized users and from
   Javascript mostly with AJAX requests;
 * ``'url'`` - Python dict mapped to Javascript object with the selected list of url routes to be used with AJAX
   requests from Javascript (to do not have hard-coded app urls in Javascript code);

* ``ContentTypeLinker`` class to easily generate contenttypes framework links in Jinja2 templates::

    {% set ctl = ContentTypeLinker(object, 'content_type', 'object_id') %}
    {% if ctl.url is not none %}
        <a href="{{ ctl.url }}" title="{{ str(ctl.obj_type) }}" target="_blank">
    {% endif %}
        {{ ctl.description }}
    {% if ctl.url is not none %}
        </a>
    {% endif %}

* ``get_verbose_name()`` allows to get verbose_name of Django model field, including related (foreign) and reverse-related
  fields.
* Django functions to format html content: ``flat_att()`` / ``format_html()`` / ``force_text()``.
* Possibility to raise exceptions in Jinja2 templates via ``{{ raise('Error message') }}``
* ``reverseq()`` allows to build reverse urls with optional query string specified as Python dict::

    reverseq('my_url_name', kwargs={'project_id': project.pk}, query={'type': 'approved'})
* ``sdv_dbg()`` for optional template variable dump (debug).
* Context processor is inheritable which allows greater flexibility to implement your own custom features by
  overloading methods.

forms.py / formsets.js
----------------------
* ``BootstrapModelForm`` - Form with field classes stylized for Bootstrap 3
* ``DisplayModelMetaclass`` - Metaclass used to create read-only "forms", to display models as html tables.
* ``WidgetInstancesMixin`` - Provides model instances bound to ``ModelForm`` in field widgets. It helps to make custom
  ``DisplayText`` form widgets ``get_text_cb`` callbacks.
* ``set_knockout_template`` - Monkey-patching methods for formset to support knockout.js version of ``empty_form``. Allows
  to dynamically add / remove new forms to inline formsets, including third-party custom fields with inline Javascript
  (such as AJAX populated html selects, rich text edit fields).
* ``FormWithInlineFormsets`` - Layer on top of related form and it's many to one multiple formsets. GET / CREATE / UPDATE.
  Works both in function views and in class-based views (CBVs).
* ``SeparateInitialFormMixin`` - Mixed to ``BaseInlineFormset`` to use different form classes for already existing model
  objects and for newly added ones (empty_form). May be used with ``DisplayModelMetaclass`` to display existing forms as
  read-only, while making newly added ones editable.

middleware.py
-------------

.. highlight:: python

* Access current request instance anywhere in form / formset / field widget code - but please do not abuse this feature
  by using request in models code which might be executed without HTTP request (eg. in the management commands)::

    from django_jinja_knockout.middleware import ContextMiddleware

    ContextMiddleware.get_request()

* Support optional client-side viewmodels injection from current user session.
* Automatic timezone detection and activation from browser (which should be faster than using maxmind geoip database).
* Views are secured by default with implicit definition of anonymous / inactive user allowed views, defined as
  ``url()`` extra kwargs per each view in ``urls.py``. Anonymous views require explicit permission::

    url(r'^signup/$', 'my_app.views.signup', name='signup', kwargs={'allow_anonymous': True})
* Optional checks for AJAX requests and / or specific Django permission::

    url(r'^check-project/$', 'my_app.views.check_project', name='check_project', kwargs={
        'ajax': True, 'permission_required': 'my_project.project_can_add'
    })
* View title is optionally defined as url kwargs ``'view_title'`` key value::

    url(r'^signup/$', 'my_app.views.signup', name='signup', kwargs={'view_title': 'Sign me up', 'allow_anonymous': True})

.. highlight:: jinja

* to be used in generic Jinja2 templates (one template per many views)::

    {{ request.view_title }}

* View kwargs are stored into ``request.view_kwargs`` to make these accessible in forms when needed.
* Middleware is inheritable which allows greater flexibility to implement your own extended features via overloaded
  methods.

models.py
---------
* ``ContentTypeLinker`` class to easily generate contenttypes framework links in Jinja2 templates.
* ``get_verbose_name()`` allows to get verbose_name of Django model field, including related (foreign) and reverse-related
  fields::

    {{ get_verbose_name(profile, 'user__username') }}

tpl.py
------
Various formatting functions, primarily to be used in ``django.admin`` ``admin.ModelAdmin`` classes ``readonly_fields``,
Jinja2 templates and ``DisplayText`` widgets.

* ``limitstr()`` - cut string after specified length.
* ``repeat_insert()`` - separate string every nth character with specified separator characters.
* ``print_list()`` - print nested HTML list. Used to format HTML in JSON responses and in custom ``DisplayText``
  widgets.
* ``print_table()`` - print uniform 2D table (no colspan / rowspan yet).
* ``print_bs_labels()`` - print HTML list as Boostrap 3 labels.
* ``reverseq()`` - construct url with query parameters.
* Manipulation with css classes:

 * ``add_css_classes()`` - similar to client-side ``jQuery.addClass()``;
 * ``remove_css_classes()`` - similar to client-side ``jQuery.removeClass()``;
 * ``add_css_classes_to_dict()`` - optimized for usage as argument of ``django.forms.utils.flatatt``;
 * ``remove_css_classes_from_dict()`` - optimized for usage as argument of ``django.forms.utils.flatatt``;

* ``html_to_text()`` - convert HTML fragment with anchor links into plain text with text links. It's used in
  ``utils.mail.SendmailQueue`` to convert HTML body of email message to text-only body.
* ``format_local_date()`` - output localized ``Date`` / ``DateTime``.

viewmodels.py
-------------
Server-side Python functions and classes to manipulate lists of client-side viewmodels. Mostly are used with AJAX JSON
responses and in ``app.js`` client-side response routing.

views.py
--------
.. highlight:: python

* ``auth_redirect()`` - authorization required response with redirect to login. Supports next' url query argument.
  Supports JSON viewmodel response.
* ``error_response()`` / ``exception_response()`` - wrappers around ``django.http.HttpResponseBadRequest`` to allow JSON
  viewmodel response in AJAX requests in case of error / exception occured.
* ``cbv_decorator()`` - may be used to check class-based views permissions.
* ``prepare_bs_navs()`` - used to highlight current url in Bootstrap 3 navbars.
* ``BsTabsMixin`` - automatic template context processor for CBV's, which uses ``prepare_bs_navs()`` function and
  ``bs_navs()`` jinja2 macro to navigate through the navbar list of visually grouped Django view links.
* ``FormWithInlineFormsetsMixin`` - CBV mixin with built-in support of ``django_jinja_knockout.forms``
  ``FormWithInlineFormsets``.
  There is one ``ModelForm`` and one or many related ``BaseInlineFormset``. ``ModelForm`` also is optional (can be
  ``None``). Also supports client-side addition and removal of inline forms via Knockout.js custom bindings. HTML
  rendering usually is performed with Bootstrap 3 Jinja2 ``bs_inline_formsets()`` macro.
* ``InlineCreateView`` - CBV view to create new models with one to many related models.
* ``InlineDetailView`` - CBV view to display or to update models with one to many related models. Suitable both for
  CREATE and for VIEW actions, last case via ``ModelForm`` with ``metaclass=DisplayModelMetaclass``.
* ``ListSortingView`` - ListView with built-in support of sorting and field filtering::

    from django_jinja_knockout.views import ContextDataMixin, ListSortingView

    from my_app.models import UserFile

    class UserFiles(ContextDataMixin, ListSortingView):

        model = UserFile
        template_name = 'files_list.htm'
        context_object_name = 'files'
        extra_context_data = {
            'filesizeformat': filesizeformat,
        }
        allowed_sort_orders = [
            'category',
            'basename',
            'latest_date',
            # Multiple key sorting.
            ['latest_date', 'basename',]
        ]
        allowed_filter_fields = {
            'category': UserFile.CATEGORIES
        }

* ``ContextDataMixin`` - allows to inject pre-defined dict of ``extra_context_data`` into template context of CBV.

widgets.py
----------
* ``OptionalWidget`` - A two-component ``MultiField``: a checkbox that indicates optional value and a field itself
  (``widget_class=Textarea`` by default) which is toggled via client-side ``plugins.js`` ``jQuery.optionalInput``
  plugin, when the checkbox is unchecked::

    from django_jinja_knockout.widgets import OptionalWidget

    OptionalWidget(attrs={'class': 'autogrow vLargeTextField', 'cols': 40, 'rows': 2})

* ``DisplayText`` - Read-only widget for existing ``ModelForm`` bound objects. Assign to ``ModelForm.widgets`` or to
  ``ModelForm.fields.widget`` to make selected form fields displayed as read-only text.
  Use ``DisplayModelMetaclass`` from ``django_jinja_knockout.forms`` to set all field widgets of form as
  ``DisplayText``, making the whole form read-only.
  In last case form will have special table rendering in Jinja2 ``bs_field()`` macro.
  Widget allows to specify custom formatting callback to display complex fields, including foreign relationships,
  pre-defined string mapping for scalar ``True`` / ``False`` / ``None`` and layout override for ``bs_form()`` /
  ``bs_inline_formsets()`` macros.

utils/mail.py
-------------

``class SendmailQueue``, which instance is available globally as ``EmailQueue``, may be used to send multiple HTML
emails with attachments. In case sendmail error is occured, error message might be transferred to form non-field
errors (works both with AJAX and non-AJAX forms)::

    from django_jinja_knockout.utils.mail import EmailQueue

    EmailQueue.add(
        subject='Thank you for registration at our site!',
        html_body=body,
        to=destination_emails,
    ).flush(
        form=self.form
    )

When there is no form or it 's undesirable to add form's non-field error, ``request`` kwarg may be supplied.
It also works both with AJAX and non-AJAX views. AJAX views use client-side viewmodels, displaying error messages in
BootstrapDialog window (AJAX views). Non-AJAX views use Django messaging framework to display sendmail errors::

    from django_jinja_knockout.utils.mail import EmailQueue

    EmailQueue.add(
        subject='Thank you for registration at our site!',
        html_body=body,
        to=destination_emails,
    ).flush(
        request=self.request
    )
