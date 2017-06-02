from django.utils.html import format_html, mark_safe
from .admin import empty_value_display


class ContentTypeLinker:

    def __init__(self, obj, typefield, idfield):
        self.model = None
        self.url = None
        self.text = None
        self.html = None
        self.obj_type = getattr(obj, typefield)
        if self.obj_type is not None:
            model_class = self.obj_type.model_class()
            self.model = model_class.objects.filter(pk=getattr(obj, idfield)).first()
            if self.model is not None:
                if hasattr(self.model, 'get_absolute_url') and callable(self.model.get_absolute_url):
                    self.url = self.model.get_absolute_url()
                    self.text = self.url.text if hasattr(self.url, 'text') else str(self.model)
                    self.html = mark_safe(self.url.html) if hasattr(self.url, 'html') else self.text
                else:
                    self.text = str(self.model)

    def get_html(self, template=None):
        if template is None:
            template = '<a href="{url}" target="_blank">{description}</a>'
        if self.url is not None:
            return format_html(
                template,
                url=self.url,
                description=self.text if self.html is None else self.html
            )
        else:
            return self.text

    def get_str_obj_type(self):
        return str(empty_value_display if self.obj_type is None else self.obj_type)
