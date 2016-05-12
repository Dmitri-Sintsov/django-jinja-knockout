from inspect import trace
from .utils import sdv
from django.conf import settings
from django.utils.html import format_html, force_text, escape, mark_safe
from django.core.urlresolvers import reverse, NoReverseMatch
from django.templatetags.static import static
from django.forms.utils import flatatt
from django.middleware.csrf import get_token
from django.contrib.messages.api import get_messages
from django.contrib.messages.constants import DEFAULT_LEVELS
from .models import get_verbose_name, ContentTypeLinker
from .tpl import add_css_classes, add_css_classes_to_dict, resolve_cbv, reverseq


LAYOUT_CLASSES = {'label': 'col-md-3', 'field': 'col-md-7'}


def raise_helper(msg):
    raise Exception(msg)


class TemplateContextProcessor():

    CLIENT_ROUTES = ()

    def __init__(self, HttpRequest=None):
        self.user_id = 0
        self.HttpRequest = HttpRequest

    def skip_request(self):
        """
        Will be called for application response() views.
        Currently is used only with jinja2 templates to do not interfere with django.admin.
        """
        return self.HttpRequest is None or not hasattr(self.HttpRequest, 'client_data')

    def get_user_id(self):
        return self.HttpRequest.user.pk \
            if self.HttpRequest.user.is_authenticated() and self.HttpRequest.user.is_active \
            else 0

    def get_context_data(self):
        if self.skip_request():
            return {}
        self.user_id = self.get_user_id()
        client_conf = {
            'csrfToken': get_token(self.HttpRequest),
            'staticPath': static(''),
            'userId': self.user_id,
            'url': {}
        }

        for url, is_anon in self.__class__.CLIENT_ROUTES:
            if is_anon or self.user_id != 0:
                try:
                    client_conf['url'][url] = reverse(url)
                except NoReverseMatch as e:
                    # Current pattern has named parameters. Translate these to Python str.format() / Javascript
                    # sprintf() library format.
                    # todo: Find a cleaner, faster way to find pattern result not using trace frames.
                    caller = trace()[-1:]
                    f_locals = sdv.get_nested(caller, [0, 0, 'f_locals'])
                    if type(f_locals) is dict and 'prefix_norm' in f_locals and 'result' in f_locals:
                        client_conf['url'][url] = '{}{}'.format(f_locals['prefix_norm'], f_locals['result'])

        return {
            'add_css_classes': add_css_classes,
            'add_css_classes_to_dict': add_css_classes_to_dict,
            'client_data': self.HttpRequest.client_data,
            'client_conf': client_conf,
            'ContentTypeLinker': ContentTypeLinker,
            'DEFAULT_MESSAGE_LEVELS': DEFAULT_LEVELS,
            'escape': escape,
            'getattr': getattr,
            'get_verbose_name': get_verbose_name,
            'flatatt': flatatt,
            'format_html': format_html,
            'force_text': force_text,
            'isinstance': isinstance,
            'layout_classes': getattr(settings, 'LAYOUT_CLASSES', LAYOUT_CLASSES),
            'mark_safe': mark_safe,
            'messages': get_messages(self.HttpRequest),
            'request': self.HttpRequest,
            'raise': raise_helper,
            'resolve_cbv': resolve_cbv,
            # Use url() provided by django-jinja for reverse without query args.
            'reverseq': reverseq,
            'sdv_dbg': sdv.dbg,
            'str': str,
        }


# Inherit and extend TemplateContextProcessor class if you want to pass more data to Jinja2 templates.
def template_context_processor(HttpRequest=None):
    return TemplateContextProcessor(HttpRequest).get_context_data()
