# Uncomment and add the following code to your project's urls.py:

"""
from django.conf.urls import patterns

js_info_dict = {
    'domain': 'djangojs',
    'packages': ('my_project', 'django_jinja_knockout',),
}

urlpatterns = patterns('',
    (r'^jsi18n/$', 'django.views.i18n.javascript_catalog', js_info_dict),
)
"""

import re

from django.urls import re_path


class UrlPath:

    def __init__(self, view_cls):
        self.view_cls = view_cls

    def get_re_pattern_for_arg(self, arg):
        if arg == self.view_cls.action_kwarg:
            return r'(?P<' + re.escape(arg) + r'>/?\w*)'
        elif arg.endswith('_id'):
            return r'-(?P<' + re.escape(arg) + r'>\d+)'
        else:
            return r'-(?P<' + re.escape(arg) + r'>\w+)'

    def __call__(self, name, base=None, args=None, kwargs=None):
        if base is None:
            base = name.replace('_', '-')
        if args is None:
            args = []
        if self.view_cls.action_kwarg is not None and self.view_cls.action_kwarg not in args:
            args.append(self.view_cls.action_kwarg)
        if kwargs is None:
            kwargs = {}
        re_route_args = r''.join([self.get_re_pattern_for_arg(arg) for arg in args])
        route = r'^' + re.escape(base) + re_route_args + r'/$'
        return re_path(route, self.view_cls.as_view(), kwargs, name)
