import datetime
import re

from django.utils.dateparse import parse_date, parse_datetime
from django.utils.translation import ugettext_lazy as _
from django.db import models

from .admin import empty_value_display
from .utils import sdv
from .models import model_fields_meta


class NestedBase:

    def __init__(self):
        self.treepath = ''

    def push_path(self, field_name):
        if '›' in field_name:
            raise ValueError('Unsupported character "›" in field_name')
        if self.treepath != '':
            self.treepath += '›' + field_name
        else:
            self.treepath = field_name

    def pop_path(self):
        if self.treepath == '':
            raise ValueError('self.treepath is already at bottom')
        self.treepath = '›'.join(self.treepath.split('›')[:-1])


class NestedSerializer(NestedBase):

    skip_serialization = (
        models.ManyToManyRel,
        # models.ManyToOneRel,
    )

    def __init__(self, obj):
        super().__init__()
        self.obj = obj
        self.metadata = {}

    def get_str_type(self, field):
        if field is None:
            return None
        else:
            path = str(type(field))
            mtch = re.search(r"<\w*?\s*?'(.*?)'>", path)
            if mtch is None:
                return path
            else:
                grp = mtch.group(1).split('.')
                return grp[-1]

    def is_serializable_field(self, field, field_name):
        return not isinstance(field, self.skip_serialization) and field_name != 'password'

    def get_reverse_qs(self, obj, field_name):
        reverse_qs = sdv.get_nested(obj, [field_name + '_set', 'all'])
        if callable(reverse_qs):
            return reverse_qs
        else:
            reverse_qs = sdv.get_nested(obj, [field_name, 'all'])
            return reverse_qs
            # Commented out, obtaining the queryset such way does not provide reverse relationship JOIN.
            # field = obj._meta.get_field(field_name)
            # return sdv.get_nested(field, ['remote_field', 'model', 'objects', 'all'])

    def get_field_val(self, obj, field_name, metadata, nesting_level):
        not_found = None, False
        field = obj._meta.get_field(field_name)
        choices_fn = 'get_{}_display'.format(field_name)
        if hasattr(obj, choices_fn):
            return getattr(obj, choices_fn)(), True
        else:
            if isinstance(field, models.ManyToOneRel):
                metadata['is_anon'] = True
                reverse_qs = self.get_reverse_qs(obj, field_name)
                if callable(reverse_qs):
                    v = [
                        self.recursive_to_dict(reverse_obj, nesting_level - 1) for reverse_obj in reverse_qs()
                    ]
                    # Always store metadata for reverse relationships even when there is zero relations.
                    # Such way it minimizes the number of different metadata dicts for the same Model.
                    self.metadata[self.treepath] = metadata
                    if len(v) > 0:
                        return v, True
                    else:
                        return not_found
                else:
                    return not_found
            try:
                return getattr(obj, field_name), True
            except AttributeError:
                return not_found

    def field_to_dict(self, obj, field_name, verbose_name, nesting_level, str_fields):
        field = obj._meta.get_field(field_name)
        metadata = {
            'verbose_name': str(verbose_name),
            'is_anon': field_name in str_fields,
            'type': self.get_str_type(field),
        }
        if self.is_serializable_field(field, field_name):
            v, exists = self.get_field_val(obj, field_name, metadata, nesting_level)
            if exists:
                if isinstance(v, list):
                    result = v, exists
                elif isinstance(v, models.Model):
                    result = self.recursive_to_dict(v, nesting_level - 1), True
                elif isinstance(v, (datetime.date, datetime.datetime)):
                    result = v.isoformat(), True
                elif isinstance(v, (int, float, type(None), bool, str)):
                    result = v, True
                elif field_name in str_fields:
                    result = str_fields[field_name], True
                    metadata['type'] = self.get_str_type(v)
                else:
                    # Not a valid JSON type
                    result = str(v), True
                self.metadata[self.treepath] = metadata
                return result
            else:
                return None, False
        else:
            if field_name in str_fields:
                self.metadata[self.treepath] = {
                    'verbose_name': str(verbose_name),
                    'is_anon': True,
                    'type': self.get_str_type(str_fields[field_name]),
                }
                return str_fields[field_name], True
            else:
                return None, False

    def get_str_val_dict(self, obj, str_fields):
        model_dict = {}
        verbose_names = model_fields_meta(obj, 'verbose_name')
        for field_name, val in str_fields.items():
            field = getattr(obj, field_name, None)
            if field_name in verbose_names:
                self.push_path(field_name)
                self.metadata[self.treepath] = {
                    'verbose_name': str(verbose_names[field_name]),
                    'is_anon': True,
                    'type': self.get_str_type(field),
                }
                model_dict[field_name] = val
                if isinstance(val, dict) and isinstance(field, models.Model):
                    self.get_str_val_dict(field, val)
                self.pop_path()
        return model_dict

    def recursive_to_dict(self, obj, nesting_level):
        if nesting_level > 0:
            model_dict = {}
            if hasattr(obj, 'get_str_fields'):
                str_fields = obj.get_str_fields()
            else:
                str_fields = {}
            for field_name, verbose_name in model_fields_meta(obj, 'verbose_name').items():
                self.push_path(field_name)
                val, exists = self.field_to_dict(obj, field_name, verbose_name, nesting_level, str_fields)
                self.pop_path()
                if exists:
                    model_dict[field_name] = val
            return model_dict
        elif hasattr(obj, 'get_str_fields'):
            model_dict = self.get_str_val_dict(obj, obj.get_str_fields())
            return model_dict if len(model_dict) > 0 else str(obj)
        else:
            return str(obj)

    def to_dict(self, nesting_level=1):
        return self.recursive_to_dict(self.obj, nesting_level)


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
            return format_local_date(parse_datetime(field_val))
        elif metadata['type'] == 'DateField':
            return format_local_date(parse_date(field_val))
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
