from django.apps import AppConfig
from django.conf import settings
from django.utils.module_loading import import_string

from . import middleware


class DjkAppConfig(AppConfig):
    name = 'django_jinja_knockout'
    djk_middleware = None

    @classmethod
    def get_context_middleware(cls):
        if cls.djk_middleware is None:
            cls.djk_middleware = import_string(settings.DJK_MIDDLEWARE) if hasattr(settings, 'DJK_MIDDLEWARE') \
                else middleware.ContextMiddleware
        return cls.djk_middleware
