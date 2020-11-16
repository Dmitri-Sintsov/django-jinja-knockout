import bleach
from collections.abc import Iterable

import jinja2
from jinja2.ext import Extension

from django.contrib.staticfiles.storage import staticfiles_storage
from django.urls import reverse
from django.utils.html import escape
from django.utils.safestring import mark_safe

from .. import tpl
from ..viewmodels import to_json


def filter_is_iterable(val):
    return isinstance(val, Iterable) and not isinstance(val, str)


def filter_to_json(val, view_error=False):
    if view_error:
        try:
            json_str = to_json(val)
        except TypeError as e:
            json_str = to_json({
                'onloadViewModels': {
                    'view': 'alert_error',
                    'title': 'filter_to_json TypeError',
                    'message': str(e)
                }
            })
    else:
        json_str = to_json(val)
    return mark_safe(
        json_str.replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')
    )


def filter_linkify(text):
    return mark_safe(bleach.linkify(escape(text)))


class UrlsExtension(Extension):

    def __init__(self, environment):
        super().__init__(environment)
        environment.globals['url'] = self._url_reverse

    @jinja2.contextfunction
    def _url_reverse(self, context, name, *args, **kwargs):
        return tpl.url(name, request=context.get('request'), *args, **kwargs)


extensions = {
    'jinja2.ext.do',
    'jinja2.ext.i18n',
    'jinja2.ext.loopcontrols',
    'UrlsExtension',
}

filters = {
    'is_iterable': filter_is_iterable,
    'to_json': filter_to_json,
    'linkify': filter_linkify,
}

_globals = {
    'static': staticfiles_storage.url,
    'url': reverse,
}
