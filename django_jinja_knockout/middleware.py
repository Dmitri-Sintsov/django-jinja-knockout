import json
import pytz
import threading

from django.core.serializers.json import DjangoJSONEncoder
from django.utils import timezone
from django.conf import settings
from django.http import HttpResponse, HttpResponseBadRequest
from django.contrib.auth import get_backends, logout as auth_logout

from .utils import sdv
from .utils.modules import get_fqn
from .views import auth_redirect, error_response, exception_response
from .viewmodels import vm_list, to_vm_list, has_vm_list


class JsonResponse(HttpResponse):

    def __init__(self, data, encoder=DjangoJSONEncoder, safe=True, content_type='application/json', **kwargs):
        if safe and not isinstance(data, dict):
            raise TypeError('In order to allow non-dict objects to be '
                'serialized set the safe parameter to False')
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
            response, encoder=DjangoJSONEncoder, safe=not isinstance(response, list), content_type=content_type
        )


class ContextMiddleware(object):

    _threadmap = {}

    def __init__(self):
        self.request = None
        self.view_func = None
        self.view_args = None
        self.view_kwargs = None

    # http://stackoverflow.com/questions/16633952/is-there-a-way-to-access-the-context-from-everywhere-in-django
    @classmethod
    def get_request(cls):
        return cls._threadmap[threading.get_ident()]

    def process_request(self, request):

        # Todo: remove when IE9 support will expire.
        request.ie_ajax_iframe = request.method == 'POST' and \
                 'HTTP_X_REQUESTED_WITH' not in request.META and \
                'HTTP_X_REQUESTED_WITH' in request.POST
        if request.ie_ajax_iframe:
            # Fix IE9 not being able to post $.ajaxForm() with proper HTTP headers due to iframe emulation.
            request.META['HTTP_X_REQUESTED_WITH'] = request.POST['HTTP_X_REQUESTED_WITH']

        # Get local timezone from browser and activate it.
        if getattr(settings, 'USE_JS_TIMEZONE', False) and 'local_tz' in request.COOKIES:
            try:
                local_tz = int(request.COOKIES['local_tz'])
                if -14 <= local_tz <= 12:
                    if local_tz == 0:
                        tz_name = 'Etc/GMT'
                    elif local_tz < 0:
                        tz_name = 'Etc/GMT{}'.format(local_tz)
                    else:
                        tz_name = 'Etc/GMT+{}'.format(local_tz)
                    timezone.activate(pytz.timezone(tz_name))
            except ValueError:
                pass

        self.__class__._threadmap[threading.get_ident()] = request

        # Optional server-side injected JSON.
        request.client_data = {}
        """
            request.client_routes = [
                'logout',
                'users_list',
            ]
        """
        request.client_routes = []
        vm_list = to_vm_list(request.client_data)
        if has_vm_list(request.session):
            vm_session = to_vm_list(request.session)
            vm_list.extend(vm_session)

    def process_exception(self, request, exception):
        self.__class__._threadmap.pop(threading.get_ident(), None)

    def process_response(self, request, response):
        self.__class__._threadmap.pop(threading.get_ident(), None)
        return response

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
            if not request.user.is_authenticated():
                return auth_redirect(request)

        # Logout inactive user for all but selected views.
        if view_kwargs.get('allow_inactive', False):
            # Do not confuse backend with custom parameter (may cause error otherwise).
            del view_kwargs['allow_inactive']
        else:
            if request.user.is_authenticated() and not request.user.is_active:
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
        # required for CBV bs_pagination() to work correctly.
        self.request.url_name = self.request.resolver_match.url_name
        # Useful for building current page title.
        if 'view_title' in self.view_kwargs:
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
                request.client_routes.extend(view_class.client_routes)
        self.request = request
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
                return JsonResponse(
                    result, encoder=DjangoJSONEncoder, safe=not isinstance(result, list), content_type=content_type
                )
            else:
                return result
        except Exception as e:
            if isinstance(e, ImmediateJsonResponse):
                return e.response if request.is_ajax() else error_response(request, 'AJAX request is required')
            else:
                return exception_response(request, e)

    """ Will be called for built-in django views (not jinja2 views), such as
        url(r'^login/$', 'django.contrib.auth.views.login', {'template_name': 'login.htm'}, name='login')
    """
    """
    def process_template_response(self, request, response):
        # http://stackoverflow.com/questions/5334176/help-with-process-template-response-django-middleware
        context_data = .context_processors.template_context_processor(request)
        response.context_data.update(context_data)
        return response
    """

"""
session_key = request.COOKIES.get(settings.SESSION_COOKIE_NAME, None)
"""
