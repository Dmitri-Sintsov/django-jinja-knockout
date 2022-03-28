from collections import OrderedDict

from django.db.models import options

from .models import model_fields_meta

if 'obj_dict_cls' in options.DEFAULT_NAMES:
    raise ValueError('obj_dict_cls is already defined in model.Meta')
else:
    options.DEFAULT_NAMES = options.DEFAULT_NAMES + ('obj_dict_cls',)


# Model field low-level serialization.
#
# Stores the instance of models.Model as self.obj and it's .get_str_fields() as OrderedDict items.
#
# To override this class, initialize models.Model Meta.obj_dict_cls to ObjDict child class name
# then use ObjDict.from_obj(obj)
#
# request_user attribute may be used to set the visibility of fields per user in overriden .get_str_fields() method.
class ObjDict(OrderedDict):

    def __init__(self, obj, request_user=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.obj = obj
        self.request_user = request_user

    @staticmethod
    def from_obj(obj, request_user=None, *args, **kwargs):
        obj_dict_cls = getattr(obj._meta, 'obj_dict_cls', ObjDict)
        return obj_dict_cls(obj, request_user, *args, **kwargs)

    def update_fields(self, **str_fields_kwargs):
        self.update(self.get_str_fields(**str_fields_kwargs))

    def get_str_fields(self, **str_fields_kwargs):
        if self.has_str_fields():
            return self.obj.get_str_fields(**str_fields_kwargs)
        else:
            return {}

    def has_str_fields(self):
        return hasattr(self.obj, 'get_str_fields')

    def get_description(self, **str_fields_kwargs):
        return self.get_str_fields(**str_fields_kwargs) if self.has_str_fields() else str(self.obj)

    # used in custom .get_str_field() only
    def can_view_field(self, field_name=None):
        return True

    def get_field(self, field_name):
        return self.obj._meta.get_field(field_name)

    # requires to call .update_fields() first
    def is_anon(self, field_name):
        return field_name in self

    def get_field_val(self, field_name):
        # use str_field when available, fallback to raw field value
        return self.get(field_name, getattr(self.obj, field_name))

    def get_verbose_names(self):
        return model_fields_meta(self.obj, 'verbose_name')
