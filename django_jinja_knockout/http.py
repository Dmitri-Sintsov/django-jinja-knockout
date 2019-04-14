from collections.abc import Sequence, Mapping
import json
import traceback

from django.conf import settings
from django.http import HttpResponse, HttpResponseBadRequest
from django.http.response import HttpResponseBase
from django.test.client import RequestFactory

from . import tpl


# Allows to perform FQN reverse url resolve in console management scripts.
# from django_jinja_knockout.apps import DjkAppConfig
# request = DjkAppConfig.get_context_middleware().get_request()
# from django_jinja_knockout.tpl import reverseq
# reverseq('member_detail', kwargs={'member_id': 1}, request=request, query={'users': [1,2,3]})
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


class JsonResponse(HttpResponse):

    def __init__(self, data, encoder=tpl.DjkJSONEncoder, safe=True, content_type='application/json', **kwargs):
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
        # Do not use json_response() as it potentially can cause infinite recursion here.
        self._response = JsonResponse(
            response, encoder=tpl.DjkJSONEncoder, safe=not isinstance(response, list), content_type=content_type
        )


def error_response(request, html):
    if request.is_ajax():
        return json_response({
            'view': 'alert_error',
            'message': html
        })
    else:
        return HttpResponseBadRequest(html)


def exception_response(request, e):
    if request.is_ajax() and settings.DEBUG:
        row = [(str(e), traceback.format_exc())]
        html = tpl.PrintList(
            tpl={
                'elem': '<li style="white-space: pre-wrap;">{v}</li>\n',
            },
        ).nested(row)
        return error_response(request, html)
    else:
        raise e


def json_response(data):
    try:
        return JsonResponse(
            data, encoder=tpl.DjkJSONEncoder, safe=not isinstance(data, list), content_type='application/json'
        )
    except TypeError as e:
        if getattr(settings, 'DEBUG', False):
            # Validate invalid JSON to simplify debugging.
            from .validators import ViewmodelValidator
            ViewmodelValidator().val(data).validate_json().flush()
        else:
            raise e


def conditional_json_response(response):
    if not isinstance(response, HttpResponseBase) and isinstance(response, (Sequence, Mapping)):
        response = json_response(response)
    return response
