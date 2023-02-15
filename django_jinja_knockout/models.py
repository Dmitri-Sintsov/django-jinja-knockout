from django.core.exceptions import FieldDoesNotExist, ObjectDoesNotExist
from django.apps import apps
from django.db import models
from django.db.models import Q
from django.db.models.fields.related import ForeignObject, ForeignObjectRel
from django.utils.translation import gettext_lazy as _
from django.contrib import auth, contenttypes


# To be used as CHOICES argument value of NullBooleanField unique key.
MANY_NONE_SINGLE_TRUE = (
    (None, _('No')),
    (True, _('Yes')),
)


def normalize_fk_fieldname(fieldname):
    return fieldname[:-3] if fieldname.endswith('_id') else fieldname


def get_permission_object(permission_str):
    app_label, codename = permission_str.split('.')
    return auth.models.Permission.objects.filter(content_type__app_label=app_label, codename=codename).first()


def get_users_with_permission(permission_str, include_su=True):
    permission_obj = get_permission_object(permission_str)
    q = Q(groups__permissions=permission_obj) | Q(user_permissions=permission_obj)
    if include_su:
        q |= Q(is_superuser=True)
    return auth.models.User.objects.filter(q).distinct()


def get_related_field_val(obj, fieldname, strict_related=True):
    curr_rel = obj
    fieldpath = fieldname.split('__') if isinstance(fieldname, str) else fieldname
    if strict_related:
        for _fieldname in fieldpath:
            curr_rel = getattr(curr_rel, _fieldname)
    else:
        for _fieldname in fieldpath:
            curr_rel = getattr(curr_rel, _fieldname, None)
            if curr_rel is None:
                return None
    return curr_rel


def get_related_field(obj, fieldname):
    if isinstance(obj, str):
        related_obj = apps.get_model(*obj.split('.'))
    else:
        related_obj = obj
    fieldpath = fieldname.split('__')
    if len(fieldpath) > 1:
        fieldname = fieldpath.pop()
        for _fieldname in fieldpath:
            curr_field = related_obj._meta.get_field(_fieldname)
            related_obj = curr_field.related_model
    return related_obj._meta.get_field(fieldname)


def get_meta(obj, meta_attr, fieldname=None):
    if fieldname is None:
        return getattr(obj._meta, meta_attr)
    related_field = get_related_field(obj, fieldname)
    if isinstance(related_field, contenttypes.fields.GenericForeignKey):
        return get_meta(obj, meta_attr, related_field.ct_field)
    else:
        try:
            return getattr(related_field, meta_attr)
        except AttributeError:
            # See django.contrib.admin.utils.label_for_field
            return getattr(related_field.related_model._meta, meta_attr)


def get_verbose_name(obj, fieldname=None):
    return get_meta(obj, 'verbose_name', fieldname)


def model_fields_meta(model, meta_attr):
    meta = {}
    for field in model._meta.get_fields():
        if isinstance(field, ForeignObjectRel):
            field_meta = getattr(field.related_model._meta, meta_attr)
        elif isinstance(field, contenttypes.fields.GenericForeignKey):
            content_obj = getattr(model, field.ct_field)
            if content_obj is None:
                field_meta = ''
            else:
                if hasattr(content_obj, 'field'):
                    field_meta = getattr(content_obj.field, meta_attr)
                else:
                    field_meta = getattr(content_obj._meta, meta_attr)
        else:
            field_meta = getattr(field, meta_attr)
        meta[field.name] = field_meta
    return meta


def model_fields_verbose_names(model):
    verbose_names = model_fields_meta(model, 'verbose_name')
    if hasattr(model, 'get_fields_i18n'):
        verbose_names.update(model.get_fields_i18n())
    return verbose_names


# obj can be model class or an instance of model class.
# To iterate only some selected fields, specify fields list.
def yield_model_fieldnames(obj, fields=None):
    if fields is None:
        for field in obj._meta.fields:
            yield field.attname
    else:
        for fieldname in fields:
            yield fieldname


def yield_model_fields(obj, fields=None, skip_virtual=False):
    if fields is None:
        for field in obj._meta.fields:
            yield field.name, field
    else:
        for fieldname in fields:
            try:
                if '__' in fieldname:
                    yield fieldname, get_related_field(obj, fieldname)
                else:
                    yield fieldname, obj._meta.get_field(fieldname)
            except FieldDoesNotExist as e:
                if not skip_virtual:
                    raise e


def yield_related_models(obj, fields):
    for fieldname, field in yield_model_fields(obj, fields, skip_virtual=True):
        if isinstance(field, ForeignObject):
            yield fieldname, field.related_model


# Return dict of model fields name / value pairs like queryset .values() for one model instance supplied.
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


def get_object_description(obj, wrap=True):
    if hasattr(obj, 'get_str_fields'):
        return obj.get_str_fields()
    else:
        return [str(obj)] if wrap else str(obj)


def get_app_label_model(label_model):
    if '.' in label_model:
        return label_model.split('.', 1)
    else:
        return None, None


def get_content_object(object_id, content_type_id=None, app_label=None, model=None):
    ContentType = contenttypes.models.ContentType
    try:
        if content_type_id is not None:
            content_type = ContentType.objects.get_for_id(content_type_id)
        elif app_label is not None:
            content_type = ContentType.objects.get_by_natural_key(app_label, model)
        elif model is not None:
            content_type = ContentType.objects.get_for_model(model)
        else:
            return None, None
        obj = content_type.get_object_for_this_type(pk=object_id)
        return content_type, obj
    except ObjectDoesNotExist:
        return None, None


# Check whether actual file of FileField exists (is not deleted / moved out).
def file_exists(obj):
    return obj.storage.exists(obj.name)


def wakeup_user(user):
    if hasattr(user, '_wrapped') and hasattr(user, '_setup'):
        if user._wrapped.__class__ == object:
            user._setup()
        user = user._wrapped
    return user
