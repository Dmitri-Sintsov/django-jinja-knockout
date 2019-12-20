from urllib.parse import urlsplit

from django.conf import settings
from django.utils.html import format_html, mark_safe
from django.templatetags.static import static
from django.forms.utils import flatatt
from django.middleware.csrf import get_token
from django.contrib.messages.api import get_messages
from django.contrib.messages.constants import DEFAULT_LEVELS

from .forms import renderers as forms_renderers
from .models import get_verbose_name
from .utils import sdv
from .viewmodels import vm_list
from .views import base as base_views
from . import middleware
from . import tpl


class ScriptList(sdv.UniqueIterList):

    def iter_callback(self, val):
        parsed = urlsplit(val)
        return parsed.path


def raise_exception(msg):
    raise Exception(msg)


# Dynamic part of template context, usually accessed as request.template_context.
class TemplateContext:

    # dict manipulation functions are used with HttpRequest.template_context.client_data or with HttpRequest.session.
    ONLOAD_KEY = 'onloadViewModels'

    def __init__(self, view_title=None, client_data=None, client_routes=None, custom_scripts=None):
        self.client_conf = {}
        # view_title may be used by macro / template to build current page title.
        self.set_view_title(view_title)
        # client_data for custom vars and onload viewmodels.
        self.client_data = {} if client_data is None else client_data
        # urls injected to client-side Javascript.
        self.client_routes = set() if client_routes is None else client_routes
        # Ordered list of custom scripts urls injected to client-side Javascript.
        self.custom_scripts = ScriptList() if custom_scripts is None else ScriptList(custom_scripts)
        self.view_title_args = []
        self.view_title_kwargs = {}

    def set_view_title(self, view_title):
        self.view_title = view_title

    def get_view_title(self, request=None):
        if request is not None:
            self.resolver_match_title(request)
        if self.view_title is not None and (len(self.view_title_args) > 0 or len(self.view_title_kwargs) > 0):
            return format_html(self.view_title, *self.view_title_args, **self.view_title_kwargs)
        else:
            return self.view_title

    def set_title_format_args(self, *args, **kwargs):
        self.view_title_args = [] if args is None else args
        self.view_title_kwargs = {} if kwargs is None else kwargs

    def update_client_data(self, client_data):
        self.client_data.update(client_data)

    def nested_client_data(self, client_data):
        sdv.nested_update(self.client_data, client_data)

    def get_client_data(self):
        return self.client_data

    def add_client_routes(self, client_routes):
        if isinstance(client_routes, set):
            self.client_routes |= client_routes
        else:
            self.client_routes.add(client_routes)

    def get_client_urls(self):
        return {url_name: tpl.get_formatted_url(url_name) for url_name in self.client_routes}

    def add_custom_scripts(self, *custom_scripts):
        self.custom_scripts.extend(custom_scripts)

    def get_custom_scripts(self):
        return self.custom_scripts

    def get_client_routes(self):
        # HttpRequest.client_routes are not really 'is_anon', they just may be filtered in view function itself,
        # according to current permissions. So they are 'is_anon' because they exist.
        # Always available client routes | per-view client routes.
        return {(url, True) for url in self.client_routes}

    def has_vm_list(self, dct):
        return self.ONLOAD_KEY in dct

    def onload_vm_list(self, dct=None, new_value=None):
        if dct is None:
            dct = self.client_data
        if new_value is not None:
            dct[self.ONLOAD_KEY] = new_value if isinstance(new_value, vm_list) else vm_list(*new_value)
            return dct[self.ONLOAD_KEY]
        if isinstance(dct.get(self.ONLOAD_KEY), vm_list):
            return dct[self.ONLOAD_KEY]
        else:
            dct[self.ONLOAD_KEY] = vm_list(*dct.get(self.ONLOAD_KEY, []))
            return dct[self.ONLOAD_KEY]

    def resolver_match_title(self, request):
        # view_title:
        if self.view_title is None:
            if 'view_title' in request.resolver_match.kwargs:
                self.view_title = request.resolver_match.kwargs.pop('view_title')
        return self.view_title

    def apply_request(self, request):
        self.resolver_match_title(request)
        # onload_viewmodels:
        viewmodels = self.onload_vm_list()
        if self.has_vm_list(request.session):
            vm_session = self.onload_vm_list(request.session)
            viewmodels.extend(vm_session)

    def update_client_conf(self, client_conf):
        self.client_conf.update(client_conf)

    def get_client_conf(self):
        self.client_conf.setdefault('url', self.get_client_urls())
        return self.client_conf


class TemplateContextProcessor():
    # List of global client routes that will be injected into every view.
    # One also may inject specific routes into client side per view via request.template_context.add_client_routes({'route1', 'route2'})
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
        self.template_context = None if self.skip_request() else base_views.create_template_context(HttpRequest)

    def skip_request(self):
        """
        Will be called for application response() views.
        """
        if hasattr(settings, 'DJK_MIDDLEWARE'):
            return self.HttpRequest is None or not getattr(self.HttpRequest, 'is_djk', False)
        else:
            return False

    def get_user_id(self):
        return middleware.ThreadMiddleware().get_user_id(self.HttpRequest)

    def get_context_data(self):
        if self.template_context is None:
            return {}

        self.user_id = self.get_user_id()
        client_conf = {
            'jsErrorsAlert': getattr(settings, 'JS_ERRORS_ALERT', False),
            'jsErrorsLogging': getattr(settings, 'JS_ERRORS_LOGGING', False),
            'csrfToken': get_token(self.HttpRequest),
            'languageCode': getattr(settings, 'LANGUAGE_CODE', 'en-us'),
            'staticPath': static(''),
            'userId': self.user_id,
        }
        file_max_size = getattr(settings, 'FILE_MAX_SIZE', None)
        if file_max_size is not None:
            client_conf['fileMaxSize'] = file_max_size

        self.template_context.add_client_routes({
            url_name for url_name, is_anon in self.CLIENT_ROUTES if is_anon or self.user_id != 0
        })

        self.template_context.update_client_conf(client_conf)
        self.template_context.apply_request(self.HttpRequest)

        return {
            'djk': self.template_context,
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
