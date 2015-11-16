from django.apps import apps

def get_verbose_name(obj, fieldname):
    if type(obj) is str:
        obj = apps.get_model(*obj.split('.'))
    fieldpath = fieldname.split('__')
    if len(fieldpath) > 1:
        fieldname = fieldpath.pop()
        for _fieldname in fieldpath:
            obj = obj._meta.get_field(_fieldname).rel.to
    return obj._meta.get_field_by_name(fieldname)[0].verbose_name


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
