=============
middleware.py
=============

.. _custom_scripts: https://github.com/Dmitri-Sintsov/djk-sample/search?l=HTML&q=custom_scripts
.. _extending middleware: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/djk_sample/middleware.py
.. _.get_context_middleware(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?utf8=%E2%9C%93&q=get_context_middleware
.. _site: https://docs.djangoproject.com/en/dev/ref/contrib/sites/
.. _settings.py: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/djk_sample/settings.py

.. _middleware_installation:

Middleware installation
-----------------------

.. highlight:: python

The built-in middleware is compatible both to the old type of middleware and to the new type of middleware.

To add the built-in middleware to the project ``settings.py``, define ``DJK_MIDDLEWARE`` value, then add it to
the ``MIDDLEWARE`` list::

    DJK_MIDDLEWARE = 'django_jinja_knockout.middleware.ContextMiddleware'

    MIDDLEWARE = [
        'django.contrib.sessions.middleware.SessionMiddleware',
        'django.middleware.common.CommonMiddleware',
        'django.middleware.csrf.CsrfViewMiddleware',
        'django.contrib.auth.middleware.AuthenticationMiddleware',
        'django.contrib.messages.middleware.MessageMiddleware',
        'django.middleware.clickjacking.XFrameOptionsMiddleware',
        'django.middleware.security.SecurityMiddleware',
        DJK_MIDDLEWARE,
    ]

The built-in middleware is applied only to Django apps which are registered in ``settings.py`` variable ``DJK_APPS``
list::

    DJK_APPS = (
        'djk_sample',
        'club_app',
        'event_app',
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

Such apps has to be both in ``DJK_APPS`` list and in ``INSTALLED_APPS`` list. See sample `settings.py`_ for the complete
example.

Since v0.9.0 the dependency on ``DJK_MIDDLEWARE`` was sufficiently reduced. The code which does not call ``DjkAppConfig``
class `.get_context_middleware()`_ method and does not use middleware features described here (like permission checks),
should work without ``DJK_MIDDLEWARE`` defined in `settings.py`_ at all. However beware that ``RendererModelForm`` and
``ForeignKeyGridWidget`` still require it, so it's not the recommended settings to run.

Extending built-in middleware
-----------------------------

Middleware is extendable (inheritable), which allows to implement your own features by overloading it's methods. See
the example of `extending middleware`_.

``DjkAppConfig`` class `.get_context_middleware()`_ method should be used to resolve the installed ``ContextMiddleware``
class instead of direct import. Such way the extended ``ContextMiddleware`` class specified in ``settings.py``
``DJK_MIDDLEWARE`` will be used instead of the original version::

    from django_jinja_knockout.apps import DjkAppConfig

    ContextMiddleware = DjkAppConfig.get_context_middleware()

Direct import from ``django_jinja_knockout.middleware`` or from ``my_project.middleware`` is possible but is discouraged
as wrong version of middleware may be used.

The instance of middleware provides the access to current HTTP request instance anywhere in form / formset / field widget
code::

    request = ContextMiddleware.get_request()

* Real HTTP request instance will be loaded when running as web server.
* Fake request will be created when running in console (for example in the management commands). Fake request HTTP GET /
  POST arguments can be initialized via ``ContextMiddleware`` class ``.mock_request()`` method, before calling
  ``.get_request()``.

Still it's wise to restrict ``.get_request()`` usage to forms / formsets / widgets mostly, avoiding usage at the model /
database / console management command level, although the mocking requests makes that possible.

Automatic timezone detection
----------------------------

Automatic timezone detection and activation from the browser, which should be faster than using maxmind geoip database.
Since version 0.3.0 it's possible to get timezone name string from current browser http request to use in the application
(for example to pass it to celery task)::

    ContextMiddleware.get_request_timezone()

.. _middleware_security:

Middleware security
-------------------
The views that belong to modules defined in ``DJK_APPS`` are checked for permissions, specified in urls.py url() call
``kwargs``.

``DJK_APPS`` views are secured by the middleware with urls that deny access to anonymous / inactive users by default.
Anonymous views require explicit permission defined as ``url()`` extra kwargs per each view in ``urls.py``::

    from my_app.views import signup
    # ...
    url(r'^signup/$', signup, name='signup', kwargs={'allow_anonymous': True})

Optional checks for AJAX requests and / or specific Django permission::

    from my_app.views import check_project
    # ...
    url(r'^check-project/$', check_project, name='check_project', kwargs={
        'ajax': True, 'permission_required': 'my_app.project_can_add'
    })

Request mock-up
---------------

.. highlight:: python

Since version 0.7.0 it is possivble to mock-up requests in console mode (management commands) to resolve reverse URLs
fully qualified names like this::

    from django_jinja_knockout.apps import DjkAppConfig
    from django_jinja_knockout import tpl

    request = DjkAppConfig.get_context_middleware().get_request()
    # Will return fully-qualified URL for the specified route with query string appended:
    tpl.reverseq('profile_detail', kwargs={'profile_id': 1}, request=request, query={'users': [1,2,3]})

By default domain name is taken from current configured Django `site`_. Otherwise either ``settings``. ``DOMAIN_NAME``
or ``settings``. ``ALLOWED_HOSTS`` should be set to autodetect current domain name.

Mini-router
-----------

Since version 0.7.0 inherited middleware classes (see :ref:`installation_djk_middleware` settings) support built-in mini
router, which could be used to implement CBV-like logic in the middleware class itself, either via request path string
match or via the regexp match::

    class ContextMiddleware(RouterMiddleware):

        routes_str = {
            '/-djk-js-error-/': 'log_js_error',
        }
        routes_re = [
            # (r'^/-djk-js-(?P<action>/?\w*)-/', 'log_js_error'),
        ]

        def log_js_error(self, **kwargs):
            from .log import send_admin_mail_delay
            vms = vm_list()
            # ... skipped ...
            return JsonResponse(vms)
