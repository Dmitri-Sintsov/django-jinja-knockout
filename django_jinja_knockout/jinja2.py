from importlib import import_module
import jinja2

from django.conf import settings
from django.utils import translation


def import_extensions(extensions_modules):
    extensions = {
        'extensions': set(),
        'filters': {},
        '_globals': {},
    }
    for module_path in extensions_modules:
        if '.' not in module_path:
            module_path = f'django_jinja_knockout.templatetags.{module_path}'
        module = import_module(module_path)
        for key in extensions:
            if isinstance(extensions[key], dict):
                extensions[key].update(getattr(module, key, {}))
            else:
                for ext_path in getattr(module, key, set()):
                    if '.' not in ext_path:
                        ext_path = f'{module_path}.{ext_path}'
                    extensions[key].add(ext_path)
    return extensions


class DjangoBytecodeCache(jinja2.BytecodeCache):

    def __init__(self):
        self.cache = self.get_cache_backend()

    def get_cache_backend(self):
        from django.core.cache import cache
        return cache

    def load_bytecode(self, bucket):
        key = f'jinja2_{bucket.key}'
        bytecode = self.cache.get(key)
        if bytecode:
            bucket.bytecode_from_string(bytecode)

    def dump_bytecode(self, bucket):
        key = f'jinja2_{bucket.key}'
        self.cache.set(key, bucket.bytecode_to_string())


# Used by third-party django_jinja backend.
# May be removed in the future in case django_jinja package will not be updated.
class CompatibleEnvironment(jinja2.Environment):

    extensions_modules = ['base', 'django', 'fields', 'humanize']

    def __init__(self, **options):
        super().__init__(**options)
        extensions = import_extensions(getattr(settings, 'JINJA_EXTENSIONS', self.extensions_modules))
        self.filters.update(extensions['filters'])


# Used by built-in Django Jinja2 template backend.
class EnvironmentProcessor:

    extensions_modules = ['base', 'django', 'fields', 'humanize']

    url_compat = True
    gettext_newstyle = True

    def get_extensions(self):
        result = self.extensions['extensions']
        if not self.url_compat:
            result.remove('django_jinja_knockout.templatetags.base.UrlsExtension')
        return result

    def get_globals(self):
        result = self.extensions['_globals']
        if self.url_compat:
            del result['url']
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
        self.extensions = import_extensions(getattr(settings, 'JINJA_EXTENSIONS', self.extensions_modules))
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
        self.env.filters.update(self.extensions['filters'])
        del self.extensions


def environment(**options):
    return EnvironmentProcessor(**options).get_environment()
