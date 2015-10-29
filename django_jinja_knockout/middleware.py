from pyquestpc import sdv
from pyquestpc.modules import get_fqn
from django.conf import settings
from django.http import HttpResponseBadRequest, JsonResponse
from django.contrib.auth import get_backends, logout as auth_logout
from .views import auth_redirect, error_response, exception_response


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

    def __init__(self, response):
        self._response = JsonResponse(response)


class ContextMiddleware(object):

    def process_request(self, request):
        # Optional server-side injected JSON.
        request.client_data = {}

    def check_acl(self, request, view_kwargs):
        # Check whether request required to be performed as AJAX.
        if view_kwargs.get('ajax', False):
            # Do not confuse backend with custom parameter (may cause error otherwise).
            del view_kwargs['ajax']
            if not request.is_ajax():
                return error_response('AJAX request is required')
        else:
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
                    if not backend.has_perm(
                            user_obj=request.user,
                            perm=view_kwargs['permission_required'],
                            request=request
                    ):
                        # Current user has no access to context blog / project.
                        # Redirect to login url with 'next' link.
                        return auth_redirect(request)
            # Do not confuse backend with custom parameter (may cause error otherwise).
            del view_kwargs['permission_required']
        request.view_kwargs = view_kwargs
        return True

    def process_view(self, request, view_func, view_args, view_kwargs):
        acl_result = self.check_acl(request, view_kwargs)
        if acl_result is not True:
            return acl_result

        try:
            result = view_func(request, *view_args, **view_kwargs)
            return JsonResponse(result) if request.is_ajax() else result
        except Exception as e:
            if isinstance(e, ImmediateJsonResponse):
                return e.response if request.is_ajax() else error_response('AJAX request is required')
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
