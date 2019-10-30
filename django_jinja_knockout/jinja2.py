import jinja2
from jinja2.ext import Extension

from django.conf import settings
from django.utils import translation
from django.utils.safestring import mark_safe
from django.contrib.staticfiles.storage import staticfiles_storage
from django.urls import reverse

from .viewmodels import to_json


def get_type(val):
    return val.__class__.__name__


def escapejs(val, view_error=False):
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


class UrlsExtension(Extension):

    def __init__(self, environment):
        super().__init__(environment)
        environment.globals["url"] = self._url_reverse

    @jinja2.contextfunction
    def _url_reverse(self, context, name, *args, **kwargs):
        try:
            current_app = context["request"].current_app
        except AttributeError:
            try:
                current_app = context["request"].resolver_match.namespace
            except AttributeError:
                current_app = None
        except KeyError:
            current_app = None
        return reverse(name, args=args, kwargs=kwargs, current_app=current_app)


def environment(**options):
    if 'extensions' in options:
        options['extensions'] = set(options['extensions'])
    else:
        options['extensions'] = set()
    options['extensions'].update((
        'jinja2.ext.do',
        'jinja2.ext.i18n',
        'django_jinja_knockout.jinja2.UrlsExtension',
    ))

    options.setdefault("undefined", jinja2.DebugUndefined if settings.DEBUG else jinja2.Undefined)
    options.setdefault("auto_reload", settings.DEBUG)
    options.setdefault("autoescape", True)

    env = jinja2.Environment(**options)

    # Initialize i18n support
    if settings.USE_I18N:
        env.install_gettext_translations(translation, newstyle=True)
    else:
        env.install_null_translations(newstyle=True)

    env.globals.update({
        'static': staticfiles_storage.url,
        'reverse_url': reverse,
    })

    env.filters.update({
        'escapejs': escapejs,
        'get_type': get_type,
    })

    return env
