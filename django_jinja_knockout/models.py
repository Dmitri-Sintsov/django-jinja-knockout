def get_verbose_name(obj, fieldname):
    return obj._meta.get_field_by_name(fieldname)[0].verbose_name


class ContentTypeLinker(object):

    def __init__(self, obj, typefield, idfield):
        self.model = None
        self.viewname = None
        self.kwargs = {}
        self.description = ''
        self.obj_type = getattr(obj, typefield)
        if self.obj_type is not None:
            model_class = self.obj_type.model_class()
            self.model = model_class.objects.filter(pk=getattr(obj, idfield)).first()
            if self.model is not None:
                if hasattr(self.model, 'get_canonical_reverse') and callable(self.model.get_canonical_reverse):
                    self.description, self.viewname, self.kwargs = self.model.get_canonical_reverse()
                else:
                    self.description = str(self.model)
