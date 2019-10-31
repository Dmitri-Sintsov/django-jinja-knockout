import jinja2
from jinja2.ext import Extension

from django.conf import settings
from django.utils import translation
from django.utils.safestring import mark_safe
from django.contrib.staticfiles.storage import staticfiles_storage
from django.urls import reverse

from .viewmodels import to_json


def filter_get_type(val):
    return val.__class__.__name__


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


class DjangoBytecodeCache(jinja2.BytecodeCache):

    def __init__(self):
        self.cache = self.get_cache_backend()

    def get_cache_backend(self):
        from django.core.cache import cache
        return cache

    def load_bytecode(self, bucket):
        key = 'jinja2_{}'.format(bucket.key)
        bytecode = self.cache.get(key)
        if bytecode:
            bucket.bytecode_from_string(bytecode)

    def dump_bytecode(self, bucket):
        key = 'jinja2_{}'.format(bucket.key)
        self.cache.set(key, bucket.bytecode_to_string())


class DefaultEnvironment:

    gettext_newstyle = True

    def get_extensions(self):
        return (
            'jinja2.ext.do',
            'jinja2.ext.i18n',
            'django_jinja_knockout.jinja2.UrlsExtension',
        )

    def get_globals(self):
        return {
            'static': staticfiles_storage.url,
            'reverse_url': reverse,
        }

    def get_filters(self):
        return {
            'escapejs': filter_escapejs,
            'get_type': filter_get_type,
        }

    def has_bytecode_cache(self):
        return settings.CACHES.get('default').get('BACKEND') != 'django.core.cache.backends.locmem.LocMemCache'

    def ioc_bytecode_cache(self):
        return DjangoBytecodeCache()

    # Initialize i18n support
    def i18n(self):
        if settings.USE_I18N:
            self.env.install_gettext_translations(translation, newstyle=self.gettext_newstyle)
        else:
            self.env.install_null_translations(newstyle=self.gettext_newstyle)

    def ioc_environment(self, **options):
        return jinja2.Environment(**options)

    def get_environment(self):
        return self.env

    def __init__(self, **options):
        if 'extensions' in options:
            options['extensions'] = set(options['extensions'])
        else:
            options['extensions'] = set()
        options['extensions'].update(self.get_extensions())

        options.setdefault("undefined", jinja2.DebugUndefined if settings.DEBUG else jinja2.Undefined)
        options.setdefault("auto_reload", settings.DEBUG)
        options.setdefault("autoescape", True)

        self.env = self.ioc_environment(**options)

        if self.has_bytecode_cache():
            self.env.bytecode_cache = self.ioc_bytecode_cache()

        self.i18n()

        self.env.globals.update(self.get_globals())

        self.env.filters.update(self.get_filters())


def environment(**options):
    return DefaultEnvironment(**options).get_environment()
