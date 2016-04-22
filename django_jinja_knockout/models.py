from django.apps import apps
from django.db import models


def get_related_field_val(obj, fieldname):
    curr_rel = obj
    fieldpath = fieldname.split('__')
    for _fieldname in fieldpath:
        curr_rel = getattr(curr_rel, _fieldname)
    return curr_rel

def get_meta(obj, meta_attr, fieldname=None):
    if fieldname is None:
        return getattr(obj._meta, meta_attr)
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
    return getattr(related_obj._meta.get_field_by_name(fieldname)[0], meta_attr)


def get_verbose_name(obj, fieldname=None):
    return get_meta(obj, 'verbose_name', fieldname)


# Return dict of model fields key / val like queryset values() but for one model supplied.
def model_values(obj, fields = None):
    row = {}
    if fields is None:
        fields = (field for field in obj)
    for field in fields:
        try:
            val = getattr(obj, field)
            if isinstance(val, models.Model):
                row[field] = val.pk
            else:
                row[field] = val
        except AttributeError:
            row[field] = get_related_field_val(obj, field)
    return row

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
