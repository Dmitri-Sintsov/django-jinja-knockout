from .utils import sdv
from ensure import ensure_annotations
from django.core.urlresolvers import reverse
from django.utils.translation import ugettext_lazy as _
from django.utils.html import mark_safe, escape
from django.db import models
try:
    # Django 1.8
    from django.contrib.admin.views.main import EMPTY_CHANGELIST_VALUE as empty_value_display
except ImportError:
    # Django > 1.8
    from django.contrib.admin import site
    empty_value_display = site.empty_value_display

from django.contrib.admin.actions import delete_selected


# Use to optionally inject app css / scripts into django.admin.
class AppAdminMixin(object):
    class Media:
        css = {
            'all': ('css/front/common.css',)
        }
        js = ('js/front/plugins.js', 'js/front/app.js',)


# http://stackoverflow.com/questions/9025624/allowing-only-some-given-instances-of-a-model-to-be-deleted-from-the-admin #
class ProtectMixin(object):
    actions = ['delete_empty']

    # Check for deletion of one model.
    def is_protected(self, obj):
        return False

    # Filter for deletion of multiple models.
    def queryset_is_protected(self, queryset):
        return queryset

    # http://stackoverflow.com/questions/12475847/django-admin-disable-user-deletion
    # Delete single object.
    def has_delete_permission(self, request, obj=None):
        # sdv.dbg('obj', obj)
        if obj is None:
            return True
        return not self.is_protected(obj)

    """ https://docs.djangoproject.com/en/dev/ref/contrib/admin/actions/ """
    # Delete multiple objects.
    def delete_empty(self, request, queryset):
        # Do not allow to delete built-in specializations.
        queryset = self.queryset_is_protected(queryset)
        # call Django's delete_selected with limited queryset
        delete_selected(self, request, queryset)
        pass
    delete_empty.short_description = _('Delete non-builtin records')

    def get_actions(self, request):
        actions = super().get_actions(request)
        # sdv.dbg('actions', actions)
        if 'delete_selected' in actions:
            del actions['delete_selected']
        return actions


# http://stackoverflow.com/questions/5197280/for-a-django-model-how-can-i-get-the-django-admin-url-to-add-another-or-list-o
@ensure_annotations
def get_admin_url(model: models.Model, action='change'):
    return reverse("admin:{0}_{1}_{2}".format(
            model._meta.app_label,
            model._meta.model_name,
            action
        ), args=(model.pk,)
    )


# https://docs.djangoproject.com/en/1.8/ref/contrib/admin/#django.contrib.admin.ModelAdmin.list_display
# http://stackoverflow.com/questions/5330598/making-django-readonly-foreignkey-field-in-admin-render-as-a-link/
@ensure_annotations
def get_model_change_link(model, modelattrs: list=[]):
    if model is None:
        return empty_value_display
    change_url = get_admin_url(model)
    display_text = model
    for attr in modelattrs:
        display_text = getattr(display_text, attr)
    return mark_safe('<a href="{0}">{1}</a>'.format(change_url, escape(display_text)))
