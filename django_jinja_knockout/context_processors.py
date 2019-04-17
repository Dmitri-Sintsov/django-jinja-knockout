from .utils import sdv

from django.conf import settings
from django.utils.html import format_html, mark_safe
from django.templatetags.static import static
from django.forms.utils import flatatt
from django.middleware.csrf import get_token
from django.contrib.messages.api import get_messages
from django.contrib.messages.constants import DEFAULT_LEVELS

from .forms import renderers as forms_renderers
from .models import get_verbose_name
from . import middleware
from . import tpl


def raise_exception(msg):
    raise Exception(msg)


class TemplateContextProcessor():
    # List of global client routes that will be injected into every view.
    # One also may inject specific routes into client side per view via request.client_routes |= {'route1', 'route2'}
    """
        CLIENT_ROUTES = {
            # Available to both anonymous and registered users.
            ('logout', False),
            # Available to registered users only.
            ('users_list', True),
        }
    """
    CLIENT_ROUTES = set()

    def __init__(self, HttpRequest=None):
        self.user_id = 0
        self.HttpRequest = HttpRequest

    def skip_request(self):
        """
        Will be called for application response() views.
        """
        return self.HttpRequest is None or \
            not all([hasattr(self.HttpRequest, attr) for attr in ('client_data', 'client_routes')])

    def get_user_id(self):
        return middleware.ThreadMiddleware().get_user_id(self.HttpRequest)

    def get_client_routes(self):
        # HttpRequest.client_routes are not really 'is_anon', they just may be filtered in view function itself,
        # according to current permissions. So they are 'is_anon' because they exist.
        # Always available client routes | per-view client routes.
        return self.CLIENT_ROUTES | {(url, True) for url in self.HttpRequest.client_routes}

    def get_context_data(self):
        if self.skip_request():
            return {}

        self.user_id = self.get_user_id()
        client_conf = {
            'jsErrorsAlert': getattr(settings, 'JS_ERRORS_ALERT', False),
            'jsErrorsLogging': getattr(settings, 'JS_ERRORS_LOGGING', False),
            'csrfToken': get_token(self.HttpRequest),
            'languageCode': getattr(settings, 'LANGUAGE_CODE', 'en-us'),
            'staticPath': static(''),
            'userId': self.user_id,
            'url': {}
        }
        file_max_size = getattr(settings, 'FILE_MAX_SIZE', None)
        if file_max_size is not None:
            client_conf['fileMaxSize'] = file_max_size
        for url_name, is_anon in self.get_client_routes():
            if (is_anon or self.user_id != 0) and url_name not in client_conf['url']:
                client_conf['url'][url_name] = tpl.get_formatted_url(url_name)
        return {
            'client_data': self.HttpRequest.client_data,
            'client_conf': client_conf,
            'DEFAULT_MESSAGE_LEVELS': DEFAULT_LEVELS,
            'getattr': getattr,
            'get_verbose_name': get_verbose_name,
            'flatatt': flatatt,
            'format_html': format_html,
            'render_fields': forms_renderers.render_fields,
            'render_form': forms_renderers.render_form,
            'isinstance': isinstance,
            'list': list,
            'mark_safe': mark_safe,
            'messages': get_messages(self.HttpRequest),
            'request': self.HttpRequest,
            'raise': raise_exception,
            'sdv': sdv,
            'set': set,
            'str': str,
            'tpl': tpl,
        }


# Inherit and extend TemplateContextProcessor class if you want to pass more data to Jinja2 templates.
def template_context_processor(HttpRequest=None):
    return TemplateContextProcessor(HttpRequest).get_context_data()
