import datetime

from django.db.models.fields.related import ForeignObjectRel
from django.utils.dateparse import parse_date, parse_datetime
from django.utils.translation import ugettext_lazy as _
from django.db import models

from .admin import empty_value_display
from .utils import sdv
from .models import model_fields_meta


class ObjDict(dict):

    def __init__(self, obj, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.obj = obj
        self.update(obj.get_str_fields() if self.has_str_fields() else {})

    def has_str_fields(self):
        return hasattr(self.obj, 'get_str_fields')

    def get_field(self, field_name):
        return self.obj._meta.get_field(field_name)

    def is_anon(self, field_name):
        return field_name in self

    def get_field_val(self, field_name):
        return self.get(field_name, getattr(self.obj, field_name))

    def get_verbose_names(self):
        return model_fields_meta(self.obj, 'verbose_name')


class FieldData:

    include_autofields = True
    skip_serialization = ()
    related_field_classes = (
        models.ManyToOneRel,
        models.ManyToManyRel,
        models.ManyToManyField,
        ForeignObjectRel,
    )

    def __init__(self, field_name, field):
        self.field_name = field_name
        self.field = field
        self.metadata = {}

    def get_related_verbose_name(self, verbose_name):
        return sdv.get_nested(self.field, ['related_model', '_meta', 'verbose_name'], verbose_name)

    def is_serializable(self):
        return not isinstance(self.field, self.skip_serialization) and self.field_name != 'password'

    def is_related_field(self):
        return isinstance(self.field, self.related_field_classes) and not isinstance(self.field, models.OneToOneRel)

    def is_extra_str_field(self):
        return self.include_autofields and isinstance(self.field, models.AutoField)

    # Returns only class name, instead of full module path.
    # Override in the ancestor class, in case full module path is required to be stored in the metadata.
    def get_str_type(self, typ=None):
        return sdv.get_str_type(self.field if typ is None else typ, only_class_name=True)

    def set_metadata(self, metadata, typ=None):
        self.metadata = metadata
        self.metadata['type'] = self.get_str_type(typ)


class NestedBase:

    def __init__(self):
        self.treepath = ''

    def push_path(self, *field_path):
        if len(field_path) == 0:
            raise ValueError('Zero length path is unsupported', field_path)
        for field_name in field_path:
            if field_name == '':
                raise ValueError('Empty path is unsupported', field_name)
            elif '›' in field_name:
                raise ValueError('Unsupported character "›" in the field_name', field_name)
        self.treepath += ('›' if self.treepath != '' else '') + '›'.join(field_path)

    def pop_path(self, *field_path):
        if self.treepath == '':
            raise ValueError('self.treepath is already at bottom')
        if len(field_path) == 0:
            self.treepath = '›'.join(self.treepath.split('›')[:-1])
        else:
            field_path = '›'.join(field_path)
            if not self.treepath.endswith(field_path):
                raise ValueError('Mismatching treepath and the field_path', self.treepath, field_path)
            else:
                self.treepath = self.treepath[:-len(field_path)]
            self.treepath = self.treepath.rstrip('›')


# Serializes Django model with nested relationships to model_dict with separate localization metadata.
#
# Usage:
#   ns = NestedSerializer(obj=obj)
#   model_dict = ns.to_dict(nesting_level=2)
#   pp.pprint(model_dict)
#   pp.pprint(ns.metadata)
#   model_dict = ns.to_dict(nesting_level=2, serialize_reverse_relationships=False)
class NestedSerializer(NestedBase):

    objdict_class = ObjDict
    fielddata_class = FieldData
    model_class = None
    serialize_reverse_relationships = True
    # (field value, exists)
    not_found = None, False

    def __init__(self, obj):
        super().__init__()
        if not self.is_valid_obj(obj):
            raise ValueError('obj is instance of {}, should be instance of {}'.format(type(obj), self.model_class))
        self.obj = obj
        self.metadata = {}

    def ioc_objdict(self, obj):
        return self.objdict_class(obj)

    def ioc_fielddata(self, field_name, field):
        return self.fielddata_class(field_name, field)

    def is_valid_obj(self, obj):
        return self.model_class is None or isinstance(obj, self.model_class)

    def get_reverse_qs(self, obj, field_name):
        reverse_qs = sdv.get_nested(obj, [field_name + '_set', 'all'])
        if callable(reverse_qs):
            return reverse_qs()
        else:
            reverse_qs = sdv.get_nested(obj, [field_name, 'all'])
            if callable(reverse_qs):
                return reverse_qs()
            else:
                return None
            # Commented out, obtaining the queryset such way does not provide reverse relationship JOIN.
            # field = obj._meta.get_field(field_name)
            # return sdv.get_nested(field, ['remote_field', 'model', 'objects', 'all'])

    def get_field_val(self, obj, fd, nesting_level):
        choices_fn = 'get_{}_display'.format(fd.field_name)
        if hasattr(obj, choices_fn):
            return getattr(obj, choices_fn)(), True
        else:
            if fd.is_related_field():
                if self.serialize_reverse_relationships:
                    fd.metadata['is_anon'] = True
                    reverse_qs = self.get_reverse_qs(obj, fd.field_name)
                    if reverse_qs is not None:
                        v = [
                            self.recursive_to_dict(reverse_obj, nesting_level - 1) for reverse_obj in reverse_qs
                        ]
                        # Always store metadata for reverse relationships even when there is zero relations.
                        # Such way it minimizes the number of different metadata dicts for the same Model.
                        self.metadata[self.treepath] = fd.metadata
                        if len(v) > 0:
                            return v, True
                        else:
                            return self.not_found
                    else:
                        return self.not_found
                else:
                    return self.not_found
            try:
                return getattr(obj, fd.field_name), True
            except AttributeError:
                return self.not_found

    def field_to_dict(self, od, field_name, verbose_name, nesting_level):
        fd = self.ioc_fielddata(field_name, od.get_field(field_name))
        if field_name == verbose_name and isinstance(fd.field, models.ForeignKey):
            # Localize related field model verbose_name, if any.
            verbose_name = fd.get_related_verbose_name(verbose_name)
        fd.set_metadata({
            'verbose_name': str(verbose_name),
            'is_anon': field_name in od,
        })
        if fd.is_serializable():
            v, exists = self.get_field_val(od.obj, fd, nesting_level)
            if exists:
                if isinstance(v, list):
                    result = v, exists
                elif isinstance(v, models.Model):
                    result = self.recursive_to_dict(v, nesting_level - 1), True
                elif isinstance(v, (datetime.date, datetime.datetime)):
                    result = v.isoformat(), True
                elif isinstance(v, (int, float, type(None), bool, str)):
                    result = v, True
                elif field_name in od:
                    result = od[field_name], True
                    fd.metadata['type'] = fd.get_str_type(v)
                else:
                    # Not a valid JSON type
                    result = str(v), True
                self.metadata[self.treepath] = fd.metadata
                return result
            else:
                return self.not_found
        else:
            if field_name in od:
                self.metadata[self.treepath] = {
                    'verbose_name': str(verbose_name),
                    'is_anon': True,
                    'type': fd.get_str_type(od[field_name]),
                }
                return od[field_name], True
            else:
                return self.not_found

    def push_str_field(self, model_dict, fd, val):
        field_path = fd.field_name if isinstance(fd.field_name, (list, tuple)) else [fd.field_name]
        self.push_path(*field_path)
        self.metadata[self.treepath] = fd.metadata
        sdv.set_nested(model_dict, fd.field_name, val)
        if isinstance(val, dict) and isinstance(fd.field, models.Model):
            od = self.ioc_objdict(fd.field)
            od.clear()
            od.update(val)
            self.get_str_val_dict(od)
        self.pop_path(*field_path)

    def get_str_val_dict(self, od):
        model_dict = {}
        verbose_names = od.get_verbose_names()
        for field_name in verbose_names:
            fd = self.ioc_fielddata(field_name, od.get_field(field_name))
            if field_name in od or fd.is_extra_str_field():
                val = od.get_field_val(field_name)
                fd.metadata = {
                    'verbose_name': str(verbose_names[field_name]),
                    'is_anon': field_name in od,
                    'type': fd.get_str_type(val if field_name in od else fd.field),
                }
                self.push_str_field(model_dict, fd, val)
        return model_dict

    def recursive_to_dict(self, obj, nesting_level):
        od = self.ioc_objdict(obj)
        if nesting_level > 0:
            model_dict = {}
            for field_name, verbose_name in model_fields_meta(obj, 'verbose_name').items():
                self.push_path(field_name)
                val, exists = self.field_to_dict(od, field_name, verbose_name, nesting_level)
                self.pop_path()
                if exists:
                    model_dict[field_name] = val
            return model_dict
        elif od.has_str_fields():
            model_dict = self.get_str_val_dict(od)
            return model_dict if len(model_dict) > 0 else str(obj)
        else:
            return str(obj)

    def to_dict(self, nesting_level=1, serialize_reverse_relationships=None):
        if isinstance(serialize_reverse_relationships, bool):
            self.serialize_reverse_relationships = serialize_reverse_relationships
        return self.recursive_to_dict(self.obj, nesting_level)


# Generates localized representation of previously serialized Django model from model_dict via supplied metadata.
#
# Usage:
#   nl = NestedLocalizer(metadata=ns.metadata)
#   pp.pprint(nl.localize_model_dict(model_dict))
#   pp.pprint(nl.localize_model_dict(model_dict, is_anon=None))
#   pp.pprint(nl.localize_model_dict(model_dict, is_anon=True))
#   pp.pprint(nl.localize_model_dict(model_dict, is_anon=False))
class NestedLocalizer(NestedBase):

    skip_localization = (
        'AutoField',
    )
    scalar_display = {
        None: empty_value_display,
        False: _('No'),
        True: _('Yes'),
    }

    def __init__(self, metadata=None):
        super().__init__()
        self.treepath = ''
        self.metadata = {} if metadata is None else metadata
        self.is_anon = None

    def localize_field_val(self, field_val, metadata):
        if field_val in self.scalar_display:
            return self.scalar_display[field_val]
        elif metadata['type'] == 'DateTimeField':
            dt = parse_datetime(field_val)
            return None if dt is None else format_local_date(dt)
        elif metadata['type'] == 'DateField':
            d = parse_date(field_val)
            if d is None:
                d = parse_datetime(field_val)
            return None if d is None else format_local_date(d)
        else:
            return field_val

    def recursive_localize_field(self, field_val, metadata):
        if isinstance(field_val, dict):
            return self.recursive_localize_model_dict(
                field_val, {}
            )
        elif isinstance(field_val, list):
            return [self.recursive_localize_field(reverse_val, metadata) for reverse_val in field_val]
        else:
            return self.localize_field_val(field_val, metadata)

    def get_metadata(self, field_name):
        return self.metadata[self.treepath] if self.treepath in self.metadata else {
            'verbose_name': field_name,
            'is_anon': False,
            'type': None,
        }

    def is_permitted_field(self, metadata):
        return metadata['type'] not in self.skip_localization and \
            (self.is_anon is None or self.is_anon == metadata['is_anon'])

    def localize_field(self, field_name, field_val):
        metadata = self.get_metadata(field_name)
        if self.is_permitted_field(metadata):
            local_name = metadata['verbose_name']
            return local_name, self.recursive_localize_field(field_val, metadata)
        else:
            return None, None

    def recursive_localize_model_dict(self, model_dict, local_model_dict):
        for field_name, field_val in model_dict.items():
            self.push_path(field_name)
            local_name, local_val = self.localize_field(field_name, field_val)
            if local_name is not None:
                local_model_dict[local_name] = local_val
            self.pop_path()
        return local_model_dict

    def localize_model_dict(self, model_dict, is_anon=None):
        self.is_anon = is_anon
        if self.metadata is None:
            return model_dict
        else:
            return self.recursive_localize_model_dict(model_dict, {})


from .tpl import format_local_date  # noqa
