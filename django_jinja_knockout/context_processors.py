from .utils import sdv
from django.conf import settings
from django.utils.html import format_html, mark_safe
from django.templatetags.static import static
from django.forms.utils import flatatt
from django.middleware.csrf import get_token
from django.contrib.messages.api import get_messages
from django.contrib.messages.constants import DEFAULT_LEVELS
from .models import get_verbose_name, ContentTypeLinker
from .tpl import add_css_classes, add_css_classes_to_dict, resolve_cbv, reverseq, get_formatted_url


LAYOUT_CLASSES = {'label': 'col-md-3', 'field': 'col-md-7'}


def raise_helper(msg):
    raise Exception(msg)


class TemplateContextProcessor():
    # List of global client routes that will be injected into every view.
    # One also may inject specific routes into client side per view via request.client_routes.extend(['route1', 'route2'])
    """
        CLIENT_ROUTES = (
            # Available to both anonymous and registered users.
            ('logout', False),
            # Available to registered users only.
            ('users_list', True),
        )
    """
    CLIENT_ROUTES = ()

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
        return self.HttpRequest.user.pk \
            if self.HttpRequest.user.is_authenticated() and self.HttpRequest.user.is_active \
            else 0

    def yield_client_routes(self):
        # Per-view client routes.
        for url in self.HttpRequest.client_routes:
            # HttpRequest.client_routes are not really 'is_anon', they just may be filtered in view function itself,
            # according to current permissions. So they are 'is_anon' because they exist.
            yield url, True
        # Always available client routes.
        for route in self.CLIENT_ROUTES:
            yield route

    def get_context_data(self):
        if self.skip_request():
            return {}

        self.user_id = self.get_user_id()
        client_conf = {
            'csrfToken': get_token(self.HttpRequest),
            'languageCode': getattr(settings, 'LANGUAGE_CODE', 'en-us'),
            'staticPath': static(''),
            'userId': self.user_id,
            'url': {}
        }
        file_max_size = getattr(settings, 'FILE_MAX_SIZE', None)
        if file_max_size is not None:
            client_conf['fileMaxSize'] = file_max_size
        for url_name, is_anon in self.yield_client_routes():
            if (is_anon or self.user_id != 0) and url_name not in client_conf['url']:
                client_conf['url'][url_name] = get_formatted_url(url_name)
        return {
            'add_css_classes': add_css_classes,
            'add_css_classes_to_dict': add_css_classes_to_dict,
            'client_data': self.HttpRequest.client_data,
            'client_conf': client_conf,
            'ContentTypeLinker': ContentTypeLinker,
            'DEFAULT_MESSAGE_LEVELS': DEFAULT_LEVELS,
            'getattr': getattr,
            'get_verbose_name': get_verbose_name,
            'flatatt': flatatt,
            'format_html': format_html,
            'isinstance': isinstance,
            'layout_classes': getattr(settings, 'LAYOUT_CLASSES', LAYOUT_CLASSES),
            'mark_safe': mark_safe,
            'messages': get_messages(self.HttpRequest),
            'request': self.HttpRequest,
            'raise': raise_helper,
            'resolve_cbv': resolve_cbv,
            # Use url() provided by django-jinja for reverse without query args.
            'reverseq': reverseq,
            'sdv': sdv,
            'str': str,
        }


# Inherit and extend TemplateContextProcessor class if you want to pass more data to Jinja2 templates.
def template_context_processor(HttpRequest=None):
    return TemplateContextProcessor(HttpRequest).get_context_data()
