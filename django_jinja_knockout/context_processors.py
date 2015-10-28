from pyquestpc import sdv
from django.utils.html import format_html, force_text, escape
from django.templatetags.static import static
from django.forms.utils import flatatt
from django.middleware.csrf import get_token
from .models import get_verbose_name, ContentTypeLinker
from .tpl import add_css_classes, reverseq


def raise_helper(msg):
    raise Exception(msg)


class TemplateContextProcessor():

    def __init__(self, HttpRequest=None):
        """
        Will be called for application response() views.
        Currently is used only with jinja2 templates to do not interfere with django.admin.
        """
        if HttpRequest is None or not hasattr(HttpRequest, 'client_data'):
            self.context_data = {}
            return
        self.user_id = HttpRequest.user.pk if HttpRequest.user.is_authenticated() and HttpRequest.user.is_active else 0
        self.context_data = {
            'add_css_classes': add_css_classes,
            'client_data': HttpRequest.client_data,
            'client_conf': {
                'csrfToken': get_token(HttpRequest),
                'staticPath': static(''),
                'userId': self.user_id,
            },
            'ContentTypeLinker': ContentTypeLinker,
            'escape': escape,
            'getattr': getattr,
            'get_verbose_name': get_verbose_name,
            'flatatt': flatatt,
            'format_html': format_html,
            'force_text': force_text,
            'isinstance': isinstance,
            'request_path': HttpRequest.get_full_path(),
            'raise': raise_helper,
            # Use url() provided by django-jinja for reverse without query args.
            'reverseq': reverseq,
            'sdv_dbg': sdv.dbg,
            'str': str,
        }
        sdv.dbg('context_data', self.context_data)


# Inherit and extend TemplateContextProcessor class if you want to pass more data to Jinja2 templates.
def template_context_processor(HttpRequest=None):
    tpl_context_proc = TemplateContextProcessor(HttpRequest)
    return tpl_context_proc.context_data
