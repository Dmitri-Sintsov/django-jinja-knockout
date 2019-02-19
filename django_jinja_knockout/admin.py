from ensure import ensure_annotations
from django.urls import reverse
from django.utils.translation import ugettext_lazy as _
from django.db import models
from django.contrib.admin import site


empty_value_display = site.empty_value_display


class DjkAdminMixin(object):
    """
    Use to optionally inject css / scripts into django.admin.
    Does not load full stack of client-side scripts.
    Currently has only the support to display properly instances of widgets.OptionalInput.
    """

    class Media:
        css = {
            'all': (
                'djk/css/app.css',
            )
        }
        js = (
            'djk/js/lib/underscore-min.js',
            'djk/js/plugins.js',
            'djk/js/admin.js',
        )


# http://stackoverflow.com/questions/9025624/allowing-only-some-given-instances-of-a-model-to-be-deleted-from-the-admin #
class ProtectMixin:

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
        return self.delete_selected_original(self, request, queryset)
    delete_empty.short_description = _('Delete non-builtin records')

    def get_actions(self, request):
        actions = super().get_actions(request)
        # sdv.dbg('actions', actions)
        if 'delete_selected' in actions:
            self.delete_selected_original = actions['delete_selected'][0]
            actions['delete_selected'] = (self.delete_empty.__func__, 'delete_selected', self.delete_empty.short_description)
        return actions


# http://stackoverflow.com/questions/5197280/for-a-django-model-how-can-i-get-the-django-admin-url-to-add-another-or-list-o
@ensure_annotations
def get_admin_url(model: models.Model, action='change'):
    return reverse(
        "admin:{0}_{1}_{2}".format(
            model._meta.app_label,
            model._meta.model_name,
            action
        ), args=(model.pk,)
    )


# https://docs.djangoproject.com/en/dev/ref/contrib/admin/#django.contrib.admin.ModelAdmin.list_display
# http://stackoverflow.com/questions/5330598/making-django-readonly-foreignkey-field-in-admin-render-as-a-link/
def get_model_change_link(model, modelattrs: list = None, tag_attrs: dict = None):
    if modelattrs is None:
        modelattrs = []
    if tag_attrs is None:
        tag_attrs = {}
    from .tpl import format_html_attrs
    if model is None:
        return empty_value_display
    display_text = model
    for attr in modelattrs:
        display_text = getattr(display_text, attr)
    _tag_attrs = {
        'href': get_admin_url(model)
    }
    _tag_attrs.update(tag_attrs)
    return format_html_attrs(
        '<a{0}>{1}</a>', _tag_attrs, display_text
    )
