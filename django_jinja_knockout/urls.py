from django.conf.urls import patterns, url

js_info_dict = {
    'domain': 'djangojs',
    'packages': ('django_jinja_knockout',),
}

urlpatterns = patterns('',
    (r'^jsi18n/$', 'django.views.i18n.javascript_catalog', js_info_dict),
)
