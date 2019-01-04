import json
import pytz
import re
import threading
from urllib.parse import urlsplit

import django
from django.core.serializers.json import DjangoJSONEncoder
from django.utils.functional import Promise
from django.utils.encoding import force_text
from django.utils import timezone
from django.conf import settings
from django.http import HttpResponse, HttpResponseBadRequest
from django.contrib.auth import get_backends, logout as auth_logout
from django.test.client import RequestFactory

from .utils import sdv
from .utils.modules import get_fqn
from .tpl import format_html_attrs
from .views import auth_redirect, error_response, exception_response
from .viewmodels import vm_list, onload_vm_list, has_vm_list


# from django_jinja_knockout.apps import DjkAppConfig
# request = DjkAppConfig.get_context_middleware().get_request()
# from django_jinja_knockout.tpl import reverseq
# reverseq('profile_detail', kwargs={'profile_id': 1}, request=request, query={'users': [1,2,3]})
class MockRequestFactory(RequestFactory):

    def _base_environ(self, **request):
        environ = super()._base_environ(**request)
        from django.contrib.sites.models import Site
        if len(settings.ALLOWED_HOSTS) > 0:
            environ['SERVER_NAME'] = settings.ALLOWED_HOSTS[-1]
        elif hasattr(settings, 'DOMAIN_NAME'):
            environ['SERVER_NAME'] = settings.DOMAIN_NAME
        if Site._meta.installed:
            site = Site.objects.get_current()
            environ['SERVER_NAME'] = site.name
        if environ['SERVER_NAME'] not in settings.ALLOWED_HOSTS:
            # Fix host validation in django.http.request.HttpRequest.get_host()
            settings.ALLOWED_HOSTS.append(environ['SERVER_NAME'])
        return environ


class ScriptList(sdv.UniqueIterList):

    def iter_callback(self, val):
        parsed = urlsplit(val)
        return parsed.path


class DjkJSONEncoder(DjangoJSONEncoder):

    def default(self, o):
        if isinstance(o, Promise):
            # force_text() is used because django.contrib.auth.models.User incorporates the instances of
            # django.utils.functional.lazy.<locals>.__proxy__ object, which are not JSON serializable.
            return force_text(o)
        else:
            return super().default(o)


class JsonResponse(HttpResponse):

    def __init__(self, data, encoder=DjkJSONEncoder, safe=True, content_type='application/json', **kwargs):
        if safe and not isinstance(data, (list, dict)):
            raise TypeError(
                'In order to allow non-list / non-dict objects to be '
                'serialized set the safe parameter to False'
            )
        kwargs.setdefault('content_type', content_type)
        data = json.dumps(data, ensure_ascii=False, cls=encoder)
        super(JsonResponse, self).__init__(content=data, **kwargs)


class ImmediateHttpResponse(Exception):
    """
    This exception is used to interrupt the flow of processing to immediately
    return a custom HttpResponse.
    """
    _response = HttpResponseBadRequest('No response was provided for the instance')

    def __init__(self, response):
        self._response = response

    @property
    def response(self):
        return self._response


class ImmediateJsonResponse(ImmediateHttpResponse):

    def __init__(self, response, content_type='application/json'):
        self._response = JsonResponse(
            response, encoder=DjkJSONEncoder, safe=not isinstance(response, list), content_type=content_type
        )


class ContextMiddlewareCompat:

    def __init__(self, *args, **kwargs):
        self.get_response = kwargs.get('get_response', args[0] if len(args) > 0 else None)
        self.request = kwargs.pop('request', None)

    def __call__(self, request):
        response = None
        if hasattr(self, 'process_request'):
            response = self.process_request(request)
        if not response:
            response = self.get_response(request)
        if hasattr(self, 'process_response'):
            response = self.process_response(request, response)
        return response

    def is_authenticated(self):
        user = self.request.user
        return user.is_authenticated() if django.VERSION < (1, 10) else user.is_authenticated

    def get_user_id(self):
        return self.request.user.pk if self.is_authenticated() and self.request.user.is_active else 0


class RouterMiddleware(ContextMiddlewareCompat):

    _mock_request = None
    _threadmap = {}
    routes_str = {}
    routes_re = []

    def process_request(self, request):
        self.request = request

        # Mini-router (local mini-resolver).
        if request.path_info in self.routes_str:
            return getattr(self, self.routes_str[request.path_info])()
        for pattern, method_name in self.routes_re:
            if isinstance(pattern, re._pattern_type):
                match = pattern.search(request.path_info)
            else:
                match = re.search(pattern, request.path_info)
            if match is not None:
                kwargs = match.groupdict()
                args = () if kwargs else match.groups()
                return getattr(self, method_name)(*args, **kwargs)

        # Todo: remove when IE9 support will expire.
        request.ie_ajax_iframe = request.method == 'POST' and \
            'HTTP_X_REQUESTED_WITH' not in request.META and \
            'HTTP_X_REQUESTED_WITH' in request.POST
        if request.ie_ajax_iframe:
            # Fix IE9 not being able to post $.ajaxForm() with proper HTTP headers due to iframe emulation.
            request.META['HTTP_X_REQUESTED_WITH'] = request.POST['HTTP_X_REQUESTED_WITH']

        # Get local timezone from browser and activate it.
        if getattr(settings, 'USE_JS_TIMEZONE', False):
            tz_name = self.__class__.get_request_timezone(request)
            if tz_name is not None:
                timezone.activate(pytz.timezone(tz_name))

        self.__class__._threadmap[threading.get_ident()] = request
        # Simple script loader.
        request.custom_scripts = ScriptList()
        # Optional server-side injected JSON.
        request.client_data = {}
        """
            request.client_routes = {
                'logout',
                'users_list',
            }
        """
        request.client_routes = set()
        viewmodels = onload_vm_list(request.client_data)
        if has_vm_list(request.session):
            vm_session = onload_vm_list(request.session)
            viewmodels.extend(vm_session)

    def process_exception(self, request, exception):
        self.__class__._threadmap.pop(threading.get_ident(), None)

    def process_response(self, request, response):
        self.__class__._threadmap.pop(threading.get_ident(), None)
        return response

    @classmethod
    def is_active(cls):
        return threading.get_ident() in cls._threadmap

    @classmethod
    def mock_request_args(cls):
        return 'post', '/', [], {
            'secure': getattr(settings, 'SECURE_PROXY_SSL_HEADER', None) is not None
        }

    # todo: complete url resolution and middleware / mock view.
    # As mocks are more often used with forms, uses 'post' method by default.
    # Call this method in child class with custom arguments before calling .get_request(), when needed.
    @classmethod
    def mock_request(cls, method_name='post', path='/', *args, **kwargs):
        if cls._mock_request is None:
            factory = MockRequestFactory()
            factory_method = getattr(factory, method_name)
            cls._mock_request = factory_method(path, *args, **kwargs)
        return cls._mock_request

    # http://stackoverflow.com/questions/16633952/is-there-a-way-to-access-the-context-from-everywhere-in-django
    @classmethod
    def get_request(cls, *mock_request_args):
        if cls.is_active():
            return cls._threadmap[threading.get_ident()]
        else:
            method_name, path, args, kwargs = cls.mock_request_args() if len(mock_request_args) == 0 else mock_request_args
            return cls.mock_request(method_name, path, *args, **kwargs)

    @classmethod
    def get_request_timezone(cls, request=None):
        if request is None:
            request = cls.get_request()
        if 'local_tz' in request.COOKIES:
            try:
                local_tz = int(request.COOKIES['local_tz'])
                if -14 <= local_tz <= 12:
                    if local_tz == 0:
                        tz_name = 'Etc/GMT'
                    elif local_tz < 0:
                        tz_name = 'Etc/GMT{}'.format(local_tz)
                    else:
                        tz_name = 'Etc/GMT+{}'.format(local_tz)
                    return tz_name
            except ValueError:
                pass
        return None


class ContextMiddleware(RouterMiddleware):

    routes_str = {
        '/-djk-js-error-/': 'log_js_error',
    }
    routes_re = [
        # (r'^/-djk-js-(?P<action>/?\w*)-/', 'log_js_error'),
    ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.view_func = None
        self.view_args = None
        self.view_kwargs = None

    # Mostly to store contenttypes framework http session logs and to store modified / added objects of inline formsets.
    @classmethod
    def add_instance(cls, group_key, obj, obj_key=None):
        request = cls.get_request()
        if request is None:
            return
        instances = getattr(request, group_key, [] if obj_key is None else {})
        if obj_key is None:
            instances.append(obj)
        else:
            instances[obj_key] = obj
        setattr(request, group_key, instances)

    @classmethod
    def yield_out_instances(cls, group_key):
        request = cls.get_request()
        if request is None or not hasattr(request, group_key):
            return
        instances = getattr(request, group_key)
        delattr(request, group_key)
        if isinstance(instances, dict):
            for key, obj in instances.items():
                yield key, obj
        else:
            for obj in instances:
                yield obj

    def log_js_error(self):
        from .log import send_admin_mail_delay
        body_keys = [
            'referrer',
            'userAgent',
            'message',
            'source',
            'lineno',
            'colno',
            'error',
            'stack',
        ]
        vms = vm_list()
        if 'url' in self.request.POST and set(body_keys) <= set(self.request.POST.keys()):
            subject = 'Javascript error at {}'.format(self.request.POST['url'])
            html_message = '\n\n'.join([
                format_html_attrs(
                    '<p><b>{k}:</b> \n<div{attrs}>{v}</div></p>',
                    k=k,
                    v=self.request.POST[k],
                    attrs={'style': 'white-space: pre-wrap;'} if k == 'stack' else {}
                ) for k in body_keys
            ])
            if hasattr(settings, 'ADMINS') and len(settings.ADMINS) > 0:
                try:
                    send_admin_mail_delay(subject=subject, html_message=html_message, request=self.request)
                except ImmediateJsonResponse as e:
                    return e.response if self.request.is_ajax() else error_response(self.request, 'AJAX request is required')
        else:
            vms.append({
                'view': 'alert_error',
                'subject': 'Unknown Javascript logging error',
                'html_message': 'Missing required POST argument',
            })
        return JsonResponse(vms)

    def check_acl(self, request, view_kwargs):
        # Check whether request required to be performed as AJAX.
        requires_ajax = view_kwargs.get('ajax')
        if requires_ajax is not None:
            # Do not confuse backend with custom parameter (may cause error otherwise).
            del view_kwargs['ajax']
        if requires_ajax is True:
            # todo: Check request.META['HTTP_USER_AGENT'] for IE9.
            if not request.is_ajax():
                return error_response(request, 'AJAX request is required')
        elif requires_ajax is False:
            if request.is_ajax():
                return error_response(request, 'AJAX request is not required')

        # Check for user to be logged in.
        if view_kwargs.get('allow_anonymous', False):
            # Do not confuse backend with custom parameter (may cause error otherwise).
            del view_kwargs['allow_anonymous']
        else:
            if not self.is_authenticated():
                return auth_redirect(request)

        # Logout inactive user for all but selected views.
        if view_kwargs.get('allow_inactive', False):
            # Do not confuse backend with custom parameter (may cause error otherwise).
            del view_kwargs['allow_inactive']
        else:
            if self.is_authenticated() and not request.user.is_active:
                auth_logout(request)
                return auth_redirect(request)

        # Check for permissions defined in urls.py
        if 'permission_required' in view_kwargs:
            # Set request context to our custom auth backend, if any.
            for backend in get_backends():
                if get_fqn(backend) in settings.AUTHENTICATION_BACKENDS:
                    # Found our custom auth backend.
                    kwargs = {
                        'user_obj': request.user,
                        'perm': view_kwargs['permission_required']
                    }
                    if getattr(backend.__class__, 'uses_request', False):
                        kwargs['request'] = request
                    if not backend.has_perm(**kwargs):
                        # Current user has no access to current view.
                        # Redirect to login url with 'next' link.
                        return auth_redirect(request)
            # Do not confuse backend with custom parameter (may cause error otherwise).
            del view_kwargs['permission_required']
        request.view_kwargs = view_kwargs
        return True

    def before_acl(self):
        if self.request.resolver_match is not None:
            # required for CBV bs_pagination() to work correctly.
            self.request.url_name = self.request.resolver_match.url_name
        else:
            self.request.url_name = None
        if 'view_title' in self.view_kwargs:
            # May be used by macro / template to build current page title.
            self.request.view_title = self.view_kwargs['view_title']
            del self.view_kwargs['view_title']
        return True

    def after_acl(self):
        return True

    def is_our_module(self, module):
        for our_module in settings.DJK_APPS:
            if module.startswith(our_module + '.'):
                return True
        return module.startswith('django_jinja_knockout.')

    def process_view(self, request, view_func, view_args, view_kwargs):
        if not self.is_our_module(view_func.__module__):
            return
        if hasattr(view_func, '__wrapped__'):
            view_class = sdv.get_cbv_from_dispatch_wrapper(view_func)
            if hasattr(view_class, 'client_routes'):
                request.client_routes |= view_class.client_routes
        self.view_func = view_func
        self.view_args = view_args
        self.view_kwargs = view_kwargs

        if self.before_acl() is not True:
            return None
        acl_result = self.check_acl(request, view_kwargs)
        if acl_result is not True:
            return acl_result
        if self.after_acl() is not True:
            return None

        try:
            result = view_func(request, *view_args, **view_kwargs)
            if request.is_ajax():
                # Todo: remove when IE9 support will expire.
                # http://stackoverflow.com/questions/17701992/ie-iframe-doesnt-handle-application-json-response-properly
                content_type = 'text/plain; charset = utf-8' if request.ie_ajax_iframe else 'application/json'
                # @note: safe parameter enables json serializing for lists.
                if isinstance(result, HttpResponse):
                    return result
                else:
                    try:
                        return JsonResponse(
                            result, encoder=DjkJSONEncoder, safe=not isinstance(result, list), content_type=content_type
                        )
                    except TypeError as e:
                        if getattr(settings, 'DEBUG', False):
                            # Validate invalid JSON to simplify debugging.
                            from .validators import ViewmodelValidator
                            ViewmodelValidator().val(result).validate_json().flush()
                        else:
                            raise e
            else:
                return result
        except Exception as e:
            if isinstance(e, ImmediateJsonResponse):
                return e.response if request.is_ajax() else error_response(request, 'AJAX request is required')
            elif isinstance(e, ImmediateHttpResponse):
                return e.response
            else:
                return exception_response(request, e)

    """
    # http://stackoverflow.com/questions/5334176/help-with-process-template-response-django-middleware
    # Will be called for built-in django views (not jinja2 views), such as
    # url(r'^login/$', 'django.contrib.auth.views.login', {'template_name': 'login.htm'}, name='login')
    def process_template_response(self, request, response):
        context_data = .context_processors.template_context_processor(request)
        response.context_data.update(context_data)
        return response
    """


"""
session_key = request.COOKIES.get(settings.SESSION_COOKIE_NAME, None)
"""
