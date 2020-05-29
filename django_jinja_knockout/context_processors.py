from collections import OrderedDict

from django.conf import settings
from django.utils.module_loading import import_string
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
from . import tpl


def raise_exception(msg):
    raise Exception(msg)


# HTML page properties, accessed in CBV as self.page_context, in templates as page_context.
class PageContext:

    # dict manipulation functions are used with self.client_data or with self.request.session.
    ONLOAD_KEY = 'onloadViewModels'

    def __init__(self, view_title=None, client_data=None, client_routes=None, custom_scripts=None):
        self.request = None
        # view_title may be used by macro / template to build current page title.
        self.view_title = view_title
        # client_data for custom vars and onload viewmodels.
        self.client_data = {} if client_data is None else client_data
        # urls injected to client-side Javascript.
        self.client_routes = set() if client_routes is None else client_routes
        # Ordered list of custom scripts urls injected to client-side Javascript.
        self.custom_scripts = OrderedDict.fromkeys(
            [] if custom_scripts is None else custom_scripts, None
        )
        self.view_title_args = []
        self.view_title_kwargs = {}

    def set_request(self, request):
        self.request = request

    def set_view_title(self, view_title):
        self.view_title = view_title

    def resolver_match_title(self):
        if self.view_title is None:
            if 'view_title' in self.request.resolver_match.kwargs:
                self.view_title = self.request.resolver_match.kwargs.pop('view_title')
        return self.view_title

    def get_view_title(self):
        self.resolver_match_title()
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

    def get_client_data(self, key=None):
        if key is None:
            return self.client_data
        else:
            return self.client_data.get(key, None)

    def add_client_routes(self, client_routes):
        if isinstance(client_routes, set):
            self.client_routes |= client_routes
        else:
            self.client_routes.add(client_routes)

    def get_client_urls(self):
        return {url_name: tpl.get_formatted_url(url_name) for url_name in self.client_routes}

    def has_custom_script(self, custom_script):
        return custom_script in self.custom_scripts.keys()

    def add_custom_scripts(self, *custom_scripts):
        self.custom_scripts.update(OrderedDict.fromkeys(custom_scripts, None))

    def get_custom_scripts(self):
        return self.custom_scripts.keys()

    def has_session(self):
        return self.ONLOAD_KEY in self.request.session

    def onload_vm_list(self, dct, new_value):
        if new_value is not None:
            dct[self.ONLOAD_KEY] = new_value if isinstance(new_value, vm_list) else vm_list(*new_value)
            return dct[self.ONLOAD_KEY]
        if isinstance(dct.get(self.ONLOAD_KEY), vm_list):
            return dct[self.ONLOAD_KEY]
        else:
            dct[self.ONLOAD_KEY] = vm_list(*dct.get(self.ONLOAD_KEY, []))
            return dct[self.ONLOAD_KEY]

    def onload_client_data(self, new_value=None):
        return self.onload_vm_list(self.client_data)

    def onload_session(self, new_value=None):
        return self.onload_vm_list(self.request.session)

    def request_viewmodels(self):
        # onload_viewmodels:
        viewmodels = self.onload_client_data()
        if self.has_session():
            vm_session = self.onload_session(self.request.session)
            viewmodels.extend(vm_session)

    def get_client_conf(self):
        user_id = self.request.user.id if self.request.user.is_authenticated and self.request.user.is_active else 0
        client_conf = {
            'jsErrorsAlert': getattr(settings, 'JS_ERRORS_ALERT', False),
            'jsErrorsLogging': getattr(settings, 'JS_ERRORS_LOGGING', False),
            'csrfToken': get_token(self.request),
            'languageCode': getattr(settings, 'LANGUAGE_CODE', 'en-us'),
            'staticPath': static(''),
            'userId': user_id,
        }
        file_max_size = getattr(settings, 'FILE_MAX_SIZE', None)
        if file_max_size is not None:
            client_conf['fileMaxSize'] = file_max_size

        self.add_client_routes({
            url_name for url_name, is_anon in getattr(settings, 'DJK_CLIENT_ROUTES', {}) if is_anon or user_id != 0
        })

        self.request_viewmodels()
        client_conf.setdefault('url', self.get_client_urls())
        return client_conf


class TemplateContextProcessor():

    def __init__(self, HttpRequest=None):
        self.user_id = 0
        self.HttpRequest = HttpRequest

    def skip_request(self):
        """
        Will be called for application response() views.
        """
        if hasattr(settings, 'DJK_MIDDLEWARE'):
            return self.HttpRequest is None or not getattr(self.HttpRequest, 'is_djk', False)
        else:
            return False

    def get_context_data(self):
        if self.skip_request():
            return {}

        return {
            'create_page_context': create_page_context,
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


DJK_PAGE_CONTEXT_CLS = import_string(
    getattr(settings, 'DJK_PAGE_CONTEXT_CLS', 'django_jinja_knockout.context_processors.PageContext')
)


def create_page_context(request, view_title=None, client_data=None, client_routes=None, custom_scripts=None):
    page_context = DJK_PAGE_CONTEXT_CLS(view_title, client_data, client_routes, custom_scripts)
    page_context.set_request(request)
    return page_context
