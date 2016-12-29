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
