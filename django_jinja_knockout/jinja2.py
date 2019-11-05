import jinja2
from jinja2.ext import Extension

from django.conf import settings
from django.utils import translation
from django.contrib.staticfiles.storage import staticfiles_storage
from django.urls import reverse

from .templatetags.bootstrap import (
    filter_escapejs, filter_get_display_layout, filter_is_checkbox, filter_is_file,
    filter_is_iterable, filter_is_multiple_checkbox, filter_is_radio, filter_linkify
)

from . import tpl


class UrlsExtension(Extension):

    def __init__(self, environment):
        super().__init__(environment)
        environment.globals['url'] = self._url_reverse

    @jinja2.contextfunction
    def _url_reverse(self, context, name, *args, **kwargs):
        return tpl.url(name, request=context['request'], *args, **kwargs)


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


class BaseFiltersMixin:

    def get_filters(self):
        return {
            'escapejs': filter_escapejs,
            'get_display_layout': filter_get_display_layout,
            'is_checkbox': filter_is_checkbox,
            'is_file': filter_is_file,
            'is_iterable': filter_is_iterable,
            'is_multiple_checkbox': filter_is_multiple_checkbox,
            'is_radio': filter_is_radio,
            'linkify': filter_linkify,
        }


# Used by third-party django_jinja backend.
# May be removed in the future in case django_jinja package will not be updated.
class CompatibleEnvironment(jinja2.Environment, BaseFiltersMixin):

    def __init__(self, **options):
        super().__init__(**options)
        self.filters.update(self.get_filters())


# Used by built-in Django Jinja2 template backend.
class EnvironmentProcessor(BaseFiltersMixin):

    url_compat = True
    gettext_newstyle = True

    def get_extensions(self):
        result = set([
            'jinja2.ext.do',
            'jinja2.ext.i18n',
        ])
        if self.url_compat:
            result.add('django_jinja_knockout.jinja2.UrlsExtension')
        return result

    def get_globals(self):
        result = {
            'static': staticfiles_storage.url,
        }
        if not self.url_compat:
            result['url'] = reverse
        return result

    def set_default_options(self, options):
        options.setdefault('undefined', jinja2.DebugUndefined if settings.DEBUG else jinja2.Undefined)
        options.setdefault('auto_reload', settings.DEBUG)
        options.setdefault('autoescape', True)

    def has_bytecode_cache(self):
        # Skip 'LocMemCache' default backend.
        return 'LocMemCache' not in settings.CACHES.get('default', {}).get('BACKEND', 'LocMemCache')

    def ioc_bytecode_cache(self):
        return DjangoBytecodeCache()

    # Initialize i18n support
    def i18n(self):
        if settings.USE_I18N:
            # Jinja2 magic call.
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

        self.set_default_options(options)
        self.env = self.ioc_environment(**options)

        if self.has_bytecode_cache():
            self.env.bytecode_cache = self.ioc_bytecode_cache()

        self.i18n()
        self.env.globals.update(self.get_globals())
        self.env.filters.update(self.get_filters())


def environment(**options):
    return EnvironmentProcessor(**options).get_environment()
