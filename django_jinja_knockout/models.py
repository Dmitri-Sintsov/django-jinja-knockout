from django.apps import apps
from django.db import models
from django.db.models import Q
from django.contrib.auth.models import User, Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey

from .utils.sdv import nested_values


def normalize_fk_fieldname(fieldname):
    return fieldname[:-3] if fieldname.endswith('_id') else fieldname


def get_permission_object(permission_str):
    app_label, codename = permission_str.split('.')
    return Permission.objects.filter(content_type__app_label=app_label, codename=codename).first()


def get_users_with_permission(permission_str, include_su=True):
    permission_obj = get_permission_object(permission_str)
    q = Q(groups__permissions=permission_obj) | Q(user_permissions=permission_obj)
    if include_su:
        q |= Q(is_superuser=True)
    return User.objects.filter(q).distinct()


def get_related_field_val(obj, fieldname, strict_related=True):
    curr_rel = obj
    fieldpath = fieldname.split('__')
    for _fieldname in fieldpath:
        if curr_rel is None and not strict_related:
            return None
        curr_rel = getattr(curr_rel, _fieldname)
    return curr_rel


def get_related_field(obj, fieldname):
    if type(obj) is str:
        related_obj = apps.get_model(*obj.split('.'))
    else:
        related_obj = obj
    fieldpath = fieldname.split('__')
    if len(fieldpath) > 1:
        fieldname = fieldpath.pop()
        for _fieldname in fieldpath:
            curr_field = related_obj._meta.get_field(_fieldname)
            if hasattr(curr_field, 'rel'):
                related_obj = curr_field.rel.to
            else:
                related_obj = curr_field.related_model
    return related_obj._meta.get_field(fieldname)


def get_meta(obj, meta_attr, fieldname=None):
    if fieldname is None:
        return getattr(obj._meta, meta_attr)
    related_field = get_related_field(obj, fieldname)
    if isinstance(related_field, GenericForeignKey):
        return get_meta(obj, meta_attr, related_field.ct_field)
    else:
        return getattr(related_field, meta_attr)


def get_verbose_name(obj, fieldname=None):
    return get_meta(obj, 'verbose_name', fieldname)


# obj can be model class or an instance of model class.
# To iterate only some selected fields, specify fields list.
def yield_model_fieldnames(obj, fields=None):
    if fields is None:
        for field in obj._meta.fields:
            yield field.attname
    else:
        for fieldname in fields:
            yield fieldname


# Return dict of model fields key / val like queryset values() but for one model supplied.
def model_values(obj, fields=None, strict_related=True):
    row = {}
    for fieldname in yield_model_fieldnames(obj, fields):
        try:
            if '__' in fieldname:
                val = get_related_field_val(obj, fieldname, strict_related)
            else:
                val = getattr(obj, fieldname)
            if isinstance(val, models.Model):
                row[fieldname] = val.pk
            else:
                row[fieldname] = val
        except AttributeError:
            row[fieldname] = get_related_field_val(obj, fieldname)
    return row


def get_object_description(object):
    if hasattr(object, 'get_str_fields'):
        return nested_values(object.get_str_fields())
    else:
        return [str(object)]


class ContentTypeLinker(object):

    def __init__(self, obj, typefield, idfield):
        self.model = None
        self.url = None
        self.description = ''
        self.obj_type = getattr(obj, typefield)
        if self.obj_type is not None:
            model_class = self.obj_type.model_class()
            self.model = model_class.objects.filter(pk=getattr(obj, idfield)).first()
            if self.model is not None:
                if hasattr(self.model, 'get_canonical_link') and callable(self.model.get_canonical_link):
                    self.description, self.url = self.model.get_canonical_link()
                else:
                    self.description = str(self.model)
