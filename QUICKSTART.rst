===========
Quickstart
===========

.. _$.optionalInput: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?utf8=%E2%9C%93&q=optionalinput
.. _bs_field(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/bs_field.htm
.. _Celery: https://github.com/celery/celery
.. _DisplayText sample: https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=get_text_method&type=
.. _field lookups: https://docs.djangoproject.com/en/dev/ref/models/querysets/#field-lookups
.. _get_FOO_display(): https://docs.djangoproject.com/en/dev/ref/models/instances/#django.db.models.Model.get_FOO_display
.. _get_str_fields(): https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=get_str_fields
.. _FilteredRawQuerySet sample: https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=FilteredRawQuerySet
.. _ListQuerySet: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=listqueryset&type=&utf8=%E2%9C%93
.. _ListSortingView: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=class+listsortingview
.. _KoGridView: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=class+kogridview
.. _plugins.js: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/static/djk/js/plugins.js
.. _PrefillWidget: https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=PrefillWidget&type=
.. _site: https://docs.djangoproject.com/en/dev/ref/contrib/sites/

Key features overview

Client-side
-----------

There are lots of client-side Javascript included into the package that automates many of the functionality. See the
:doc:`clientside` for more info.

admin.py
--------
* ``ProtectMixin`` - allow only some model instances to be deleted in django.admin.
* ``get_admin_url`` - make readonly foreignkey field to be rendered as link to the target model admin change view.

context_processors.py
---------------------
Context processor adds many useful functions and classes into Jinja2 template context, allowing to write more powerful
and more flexible Jinja2 templates.

Functions to manipulate css classes in Jinja2 templates
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

* ``add_css_classes()`` - similar to jQuery ``$.addClass()`` function;
* ``has_css_classes()`` - similar to jQuery ``$.hasClass()`` function;
* ``remove_css_classes()`` - similar to jQuery ``$.removeClass()`` function;

Next are the methods that alter 'class' key value of the supplied HTML attrs dict, which is then passed to Django
``flatatt()`` call / ``tpl.json_flatatt()`` call:

* ``add_css_classes_to_dict()``
* ``has_css_classes_in_dict()``
* ``remove_css_classes_from_dict()``

Injection of server-side data into loaded page
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
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

Injection of Django url routes into loaded page
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
* ``App.conf.url`` - JSON-ified Python set from ``context_processors.TemplateContextProcessor`` module ``CLIENT_ROUTES``
  variable that defines selected list of Django url routes mapped to Javascript object to be used with AJAX requests
  from Javascript. It allows not to have hard-coded app urls in Javascript code. Since version 0.2.0, it supports url
  names with kwargs.

  Read :doc:`viewmodels` documentation how to add custom client-side urls (``client_routes``) per view.

Contenttypes framework helpers
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
.. highlight:: jinja

* ``ContentTypeLinker`` class to easily generate contenttypes framework links in Jinja2 templates::

    {% set ctl = ContentTypeLinker(object, 'content_type', 'object_id') %}
    {% if ctl.url is not none %}
        <a href="{{ ctl.url }}" title="{{ str(ctl.obj_type) }}" target="_blank">
    {% endif %}
        {{ ctl.description }}
    {% if ctl.url is not none %}
        </a>
    {% endif %}

Meta and formatting
~~~~~~~~~~~~~~~~~~~
.. highlight:: python

* ``get_verbose_name()`` allows to get verbose_name of Django model field, including related (foreign) and reverse
  related fields.
* Django functions to format html content: ``flatatt()`` / ``format_html()`` / ``force_text()``.
* Possibility to raise exceptions in Jinja2 templates via ``{{ raise('Error message') }}``

Advanced url resolution, both forward and reverse
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

* ``resolve_cbv()`` takes url_name and kwargs and returns a function view or a class-based view for these arguments,
  when available::

    resolve_cbv(url_name, view_kwargs)

* ``reverseq()`` allows to build reverse urls with optional query string specified as Python dict::

    reverseq('my_url_name', kwargs={'project_id': project.pk}, query={'type': 'approved'})

Miscelaneous
~~~~~~~~~~~~
* ``sdv_dbg()`` for optional template variable dump (debug).
* Context processor is inheritable which allows greater flexibility to implement your own custom features by
  overloading methods.

forms.py / formsets.js
----------------------
See :doc:`forms` for the detailed explanation.

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

then add app which has ``Specialization`` model into settings.DJK_APPS list. See :doc:`installation` for more info
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
.. highlight:: python

Get currently used middleware class::

    from django_jinja_knockout.apps import DjkAppConfig

    ContextMiddleware = DjkAppConfig.get_context_middleware()

* Middleware is extendable (inheritable), which allows to implement your own features via overloaded methods. That's why
  ``DjkAppConfig`` is used to resolve ``ContextMiddleware`` class instead of direct import. Such way extended
  ``ContextMiddleware`` class specified via ``settings.DJK_MIDDLEWARE`` will be used instead of original version.
* Direct import from ``django_jinja_knockout.middleware`` or from ``my_project.middleware`` is possible but is not
  encouraged as wrong version of middleware may be used.

Access to current HTTP request instance anywhere in form / formset / field widget code::

    request = ContextMiddleware.get_request()

* Real HTTP request instance will be loaded when running as web server.
* Fake request will be created when running in console (for example in the management commands). Fake request HTTP GET /
  POST arguments can be initialized via ``ContextMiddleware`` class ``.mock_request()`` method, before calling
  ``.get_request()``.

Support optional client-side :doc:`viewmodels` injection from current user session.

Automatic timezone detection and activation from browser (which should be faster than using maxmind geoip database).
Also since version 0.3.0 it's possible to get timezone name string from current browser http request to use in
the application (for example to pass it to celery task)::

    ContextMiddleware.get_request_timezone()

.. highlight:: python

Request mock-up
~~~~~~~~~~~~~~~

Since version 0.7.0 it is possivble to mock-up requests in console mode (management commands) to resolve reverse URLs
fully qualified names like this::

    from django_jinja_knockout.apps import DjkAppConfig
    request = DjkAppConfig.get_context_middleware().get_request()
    from django_jinja_knockout.tpl import reverseq
    # Will return fully-qualified URL for the specified route with query string appended:
    reverseq('profile_detail', kwargs={'profile_id': 1}, request=request, query={'users': [1,2,3]})

By default domain name is taken from current configured Django `site`_. Otherwise either ``settings``. ``DOMAIN_NAME``
or ``settings``. ``ALLOWED_HOSTS`` should be set to autodetect current domain name.

Mini-router
~~~~~~~~~~~

Since version 0.7.0 inherited middleware classes (see :ref:`installation_djk_middleware` settings) support built-in mini
router, which could be used to implement CBV-like logic in middleware class itself, either via string match or via the
regexp::

    class ContextMiddleware(RouterMiddleware):

        routes_str = {
            '/-djk-js-error-/': 'log_js_error',
        }
        routes_re = [
            # (r'^/-djk-js-(?P<action>/?\w*)-/', 'log_js_error'),
        ]

        def log_js_error(self):
            from .log import send_admin_mail_delay
            vms = vm_list()
            # ... skipped ...
            return JsonResponse(vms)


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
  instance of particular Django model object. For example::

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

FilteredRawQuerySet
~~~~~~~~~~~~~~~~~~~

``FilteredRawQuerySet`` inherits Django ``RawQuerySet`` class whose instances are returned by Django model object manager
``.raw()`` calls.

It supports ``.filter()`` / ``.exclude()`` / ``.order_by()`` / ``values()`` / ``values_list()``
queryset methods and also SQL-level slicing which is much more efficient than Python slicing of ``RawQuerySet``.

These methods are used by filtering / ordering code in `ListSortingView`_ and `KoGridView`_ class-based views.

See `FilteredRawQuerySet sample`_ in ``djk-sample`` project source code for a complete example of AJAX grid with
raw query which has ``LEFT JOIN`` statement.

Since version 0.4.0 it supports args with Q objects.

ListQuerySet
~~~~~~~~~~~~
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
* ``reverseq()`` - construct url with query parameters from url name. Since version 0.4.0, when request instance is
  supplied, absolute url will be returned.

* Manipulation with css classes:

 * ``add_css_classes()`` - similar to client-side ``jQuery.addClass()``;
 * ``remove_css_classes()`` - similar to client-side ``jQuery.removeClass()``;
 * ``add_css_classes_to_dict()`` - optimized for usage as argument of ``django.forms.utils`` ``flatatt()``;
 * ``remove_css_classes_from_dict()`` - optimized for usage as argument of ``django.forms.utils`` ``flatatt()``;

* ``html_to_text()`` - convert HTML fragment with anchor links into plain text with text links. It's used in
  `utils/mail.py`_ ``SendmailQueue`` to convert HTML body of email message to text-only body.
* ``format_local_date()`` - output localized ``Date`` / ``DateTime``.

* ``str_dict()`` - Django models could define `get_str_fields()`_ method which maps model instance field values to their
  formatted string values, similar to ``Model`` ``__str()__`` method, but for each or to some selected separate fields.

  If these models have foreign keys pointing to another models which also have `get_str_fields()`_ defined,
  ``str_dict()`` can be used to convert nested dict `get_str_fields()`_ values to flat strings in ``__str__()`` method::

    class Member(models.Model):

        # ... skipped ...

        def get_str_fields(self):
            parts = OrderedDict([
                ('profile', self.profile.get_str_fields()),
                ('club', self.club.get_str_fields()),
                ('last_visit', format_local_date(timezone.localtime(self.last_visit))),
                ('plays', self.get_plays_display()),
                ('role', self.get_role_display()),
                ('is_endorsed', 'endorsed' if self.is_endorsed else 'unofficial')
            ])
            return parts

        def __str__(self):
            # Will flatten 'profile' and 'club' str_fields dict keys values
            # and convert the whole str_fields dict values into str.
            str_fields = self.get_str_fields()
            return str_dict(str_fields)

Internally ``str_dict()`` uses lower level ``flatten_dict()`` function which is defined in the same source file.

viewmodels.py
-------------
Server-side Python functions and classes to manipulate lists of client-side viewmodels. Mostly are used with AJAX JSON
responses and in ``app.js`` client-side response routing. Read :doc:`viewmodels` documentation for more info.

views submodule
---------------
See :doc:`views` for the detailed explanation.

widgets.py
----------
* ``OptionalWidget`` - A two-component ``MultiField``: a checkbox that indicates optional value and a field itself
  (``widget_class`` = ``Textarea`` by default). The field itself is enabled / disabled accrording to the checkbox state
  via client-side `$.optionalInput`_ plugin, implemented in `plugins.js`_::

    from django_jinja_knockout.widgets import OptionalWidget

    OptionalWidget(attrs={'class': 'autogrow vLargeTextField', 'cols': 40, 'rows': 2})

* ``DisplayText`` - Read-only widget for existing ``ModelForm`` bound objects. Assign to ``ModelForm.widgets`` or to
  ``ModelForm.fields.widget`` to make selected form fields displayed as read-only text.

  Use ``DisplayModelMetaclass`` from ``django_jinja_knockout.forms`` to set all field widgets of form as
  ``DisplayText``, making the whole form read-only.

  In last case the form will have special table rendering in Jinja2 `bs_field()`_ macro.

  Widget allows to specify custom formatting callback to display complex fields, including foreign relationships,
  pre-defined string mapping for scalar ``True`` / ``False`` / ``None`` and layout override for :ref:`macros_bs_form`
  / :ref:`macros_bs_inline_formsets` macros. Note that it's possible to call these macros from Django language
  templates like this::

    {% jinja 'bs_form.htm' with _render_=1 form=form action=view_action opts=opts %}

  See ``DisplayText`` widget customization of widget html output via ``get_text_method()`` see `DisplayText sample`_.

* ``PrefillWidget`` - Django form input field which supports both free text and quick filling of input text value from
  the list of prefilled choices. Since version 0.6.0, `ListQuerySet`_ has ``prefill_choices()`` method, which allows to
  generate choices lsists for ``PrefillWidget`` initial values like this::

    from django_jinja_knockout.widgets import PrefillWidget
    from django_jinja_knockout.query import ListQuerySet

    # ...

    self.related_members_qs = ListQuerySet(
        Member.objects.filter(
            club__id=self.request.view_kwargs.get('club_id', None)
        )
    )
    if self.related_members_qs.count() > 1 and isinstance(form, MemberForm):
        # Replace standard Django CharField widget to PrefillWidget with incorporated standard field widget:
        form.fields['note'].widget = PrefillWidget(
            data_widget=form.fields['note'].widget,
            choices=self.related_members_qs.prefill_choices('note')
        )
        # Replace one more field widget to PrefillWidget:
        form.fields['name'].widget = PrefillWidget(
            data_widget=form.fields['name'].widget,
            choices=self.related_members_qs.prefill_choices('name')
        )

See ``djk-sample`` project for the sample of `PrefillWidget`_ usage with inline formsets. It is also simpler to use the
widget in single ModelForm without inline formsets.

utils/mail.py
-------------

class ``SendmailQueue``, which instance is available globally as ``EmailQueue``, allows to send multiple HTML
emails with attachments. In case sendmail error is occured, error message can be converted to form non-field errors with
``form`` named argument of ``.flush()`` method (works with AJAX and non-AJAX forms)::

    from django_jinja_knockout.utils.mail import EmailQueue

    EmailQueue.add(
        subject='Thank you for registration at our site!',
        html_body=body,
        to=destination_emails,
    ).flush(
        form=self.form
    )

When there is no form submitted or it's undesirable to add form's non-field error, ``request`` named argument of
``.flush()`` may be supplied instead. It also works with both AJAX and non-AJAX views. AJAX views would use client-side
:doc:`viewmodels`, displaying error messages in BootstrapDialog window. Non-AJAX views would use Django messaging
framework to display sendmail errors::

    from django_jinja_knockout.utils.mail import EmailQueue

    EmailQueue.add(
        subject='Thank you for registration at our site!',
        html_body=body,
        to=destination_emails,
    ).flush(
        request=self.request
    )

Since version 0.3.0, ``SendmailQueue`` class functionality could be extended by injecting ioc class. It allows to use
database backend or non-SQL store to process emails in background, for example as `Celery`_ task. ``SendmailQueue``
class ``.add()`` and ``.flush()`` methods could be overriden in ``self.ioc`` and new methods can be added as well.

``uncaught_exception_email`` function can be used to monkey patch Django exception ``BaseHandler`` to use
``SendmailQueue`` to send the uncaught exception reports to selected email addresses.

Here is the example of extending ``EmailQueue`` instance of ``SendmailQueue`` via custom ioc class (``EmailQueueIoc``)
and monkey patching Django exception ``BaseHandler``. This code should be placed in the project's ``apps.py``::

    class MyAppConfig(AppConfig):
        name = 'my_app'
        verbose_name = "Verbose name of my application"

        def ready(self):
            from django_jinja_knockout.utils.mail import EmailQueue
            # EmailQueueIoc should have custom .add() and / or .flush() methods implemented.
            # Original .add() / .flush() methods may be called via ._add() / ._flush().
            from my_app.tasks import EmailQueueIoc

            EmailQueueIoc(EmailQueue)

            # Save uncaught exception handler.
            BaseHandler.original_handle_uncaught_exception = BaseHandler.handle_uncaught_exception
            # Override uncaught exception handler.
            BaseHandler.handle_uncaught_exception = uncaught_exception_email
            BaseHandler.developers_emails = ['user@host.org']
            BaseHandler.uncaught_exception_subject = 'Django exception stack trace for my project'

``my_app.tasks.py``::

    class EmailQueueIoc:

        def __init__(self, email_queue):
            self.queue = email_queue
            self.instances = []
            # Maximum count of messages to send in one batch.
            self.batch_limit = 10
            self.max_total_errors = 3
            email_queue.set_ioc(self)

        def add(self, **kwargs):
            # Insert your code here.
            # Call original _add():
            return self.queue._add(**kwargs)

        def flush(self, **kwargs):
            # Insert your code here.
            # Call original _flush():
            return self.queue._flush(**kwargs)

        def celery_task():
            # Insert your code here.

    @app.task
    def email_send_batch():
        EmailQueue.celery_task()

utils/sdv.py
------------
Contains helper functions internally used by django-jinja-knockout. Some of these might be useful in Django project
modules.

``dbg()`` - dumps ``value`` into text log file `'sdv_out.py3'` under ``name`` label. To setup log file path overwrite
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

Where ``9`` is the value of ``self.pk``.
