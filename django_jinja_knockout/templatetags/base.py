import bleach
import collections
from django.utils.html import escape
from django.utils.safestring import mark_safe
from ..viewmodels import to_json


def filter_is_iterable(val):
    return isinstance(val, collections.Iterable) and not isinstance(val, str)


def filter_escapejs(val, view_error=False):
    if view_error:
        try:
            json_str = to_json(val)
        except TypeError as e:
            json_str = to_json({
                'onloadViewModels': {
                    'view': 'alert_error',
                    'title': 'escapejs TypeError',
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


class BaseFilters:

    filters = {
        'is_iterable': filter_is_iterable,
        'escapejs': filter_escapejs,
        'linkify': filter_linkify,
    }
