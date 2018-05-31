from django.core.exceptions import FieldDoesNotExist
from django.apps import apps
from django.db import models
from django.db.models import Q
# Django>=1.8
from django.db.models.fields.related import ForeignObjectRel
# Django>=1.9
# from django.db.models.fields.reverse_related import ForeignObjectRel
from django.db.models.fields.related import ForeignObject
from django.contrib.auth.models import User, Permission
from django.contrib.contenttypes.fields import GenericForeignKey
from django.utils.translation import ugettext_lazy as _

# To be used as CHOICES argument value of NullBooleanField unique key.
MANY_NONE_SINGLE_TRUE = (
    (None, _('No')),
    (True, _('Yes')),
)


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
    if type(obj) is str:
        related_obj = apps.get_model(*obj.split('.'))
    else:
        related_obj = obj
    fieldpath = fieldname.split('__')
    if len(fieldpath) > 1:
        fieldname = fieldpath.pop()
        for _fieldname in fieldpath:
            curr_field = related_obj._meta.get_field(_fieldname)
            if hasattr(curr_field, 'related_model'):
                # Django>=1.9
                related_obj = curr_field.related_model
            else:
                # Django==1.8
                related_obj = curr_field.rel.to
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


def model_fields_meta(model, meta_attr):
    meta = {}
    for field in model._meta.get_fields():
        if isinstance(field, ForeignObjectRel):
            field_meta = getattr(field.related_model._meta, meta_attr)
        elif isinstance(field, GenericForeignKey):
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
    if hasattr(model, 'get_fields_i18n'):
        return model.get_fields_i18n()
    else:
        return model_fields_meta(model, 'verbose_name')


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


# Return dict of model fields name / value pairs like queryset values() for one model instance supplied.
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


def get_object_description(obj):
    if hasattr(obj, 'get_str_fields'):
        return obj.get_str_fields()
    else:
        return [str(obj)]


# Get selected choice str from the list of defined choices for Django model field choices.
def get_choice_str(choices, selected_choice):
    for choice, choice_str in choices:
        if choice == selected_choice:
            return choice_str
    return None


# Check whether actual file of FileField exists (is not deleted / moved out).
def file_exists(obj):
    return obj.storage.exists(obj.name)


def wakeup_user(user):
    if hasattr(user, '_wrapped') and hasattr(user, '_setup'):
        if user._wrapped.__class__ == object:
            user._setup()
        user = user._wrapped
    return user


class NestedSerializer:

    def __init__(self, obj=None, i18n_fields=None, str_fields_keys=None):
        self.i18n_parent_path = []
        self.obj = obj
        self.i18n_fields = {} if i18n_fields is None else i18n_fields
        self.str_fields_keys = None if str_fields_keys is None else str_fields_keys

    def to_dict(self, nesting_level=1):
        self.str_fields_keys = {}
        return self._to_dict(self.obj, nesting_level)

    def _to_dict(self, obj, nesting_level):
        model_dict = {}
        if nesting_level > 0:
            if hasattr(obj, 'get_str_fields'):
                self.str_fields_keys['›'.join(self.i18n_parent_path)] = list(obj.get_str_fields().keys())
            for field_name, verbose_name in model_fields_meta(obj, 'verbose_name').items():
                field = obj._meta.get_field(field_name)
                if not isinstance(field, (models.AutoField, models.ManyToOneRel)):
                    choices_fn = 'get_{}_display'.format(field_name)
                    if hasattr(obj, choices_fn):
                        v = getattr(obj, choices_fn)()
                    else:
                        try:
                            v = getattr(obj, field_name)
                        except AttributeError:
                            continue
                    self.i18n_parent_path.append(field_name)
                    self.i18n_fields['›'.join(self.i18n_parent_path)] = str(verbose_name)
                    if isinstance(v, models.Model):
                        v = self._to_dict(v, nesting_level - 1)
                    elif not isinstance(v, (int, float, type(None), bool, str)):
                        v = str(v)
                    model_dict[field_name] = v
                    self.i18n_parent_path.pop()
            return model_dict
        elif hasattr(obj, 'get_str_fields'):
            verbose_names = model_fields_meta(obj, 'verbose_name')
            for field_name, val in obj.get_str_fields().items():
                if field_name in verbose_names:
                    self.i18n_parent_path.append(field_name)
                    self.i18n_fields['›'.join(self.i18n_parent_path)] = str(verbose_names[field_name])
                    model_dict[field_name] = val
                    self.i18n_parent_path.pop()
            return model_dict if len(model_dict) > 0 else str(obj)
        else:
            return str(obj)

    def localize_model_dict(self, model_dict):
        if self.i18n_fields is None:
            return model_dict
        else:
            return self._localize_model_dict(model_dict, self.str_fields_keys, {})

    def _localize_model_dict(self, model_dict, str_fields_keys, i18n_model_dict):
        for k, v in model_dict.items():
            if str_fields_keys is None:
                str_field_key = True
            else:
                str_field_key = k in (str_fields_keys.get('', []) if len(self.i18n_parent_path) == 0 else str_fields_keys)
            if str_field_key:
                self.i18n_parent_path.append(k)
                local_keypath = self.i18n_fields.get('›'.join(self.i18n_parent_path), k)
                if isinstance(v, dict):
                    child_str_keys = str_fields_keys.get(k, '') if isinstance(str_fields_keys, dict) else None
                    if child_str_keys != '':
                        if isinstance(child_str_keys, str):
                            child_str_keys = {}
                        i18n_model_dict[local_keypath] = self._localize_model_dict(
                            v, child_str_keys, {}
                        )
                else:
                    i18n_model_dict[local_keypath] = v
                self.i18n_parent_path.pop()
        return i18n_model_dict
