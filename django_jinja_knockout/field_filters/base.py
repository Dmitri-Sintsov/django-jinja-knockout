from copy import deepcopy

from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _


class AbstractFilter:

    component_class = None
    template = None
    display = None

    def __init__(self, view, fieldname, vm_filter, request_list_filter=None):
        self.view = view
        self.fieldname = fieldname
        self.vm_filter = vm_filter
        # Query filter loaded from JSON. Field lookups are encoded as {'field': {'in': 1, 2, 3}}
        self.request_list_filter = request_list_filter
        # queryset.filter(*self.current_list_filter.args, **self.current_list_filter.kwargs)
        # self.current_list_filter = FuncArgs()
        # Text names of the currently selected filters.
        self.display = []

    def get_request_list_filter(self):
        return deepcopy(self.request_list_filter)

    def setup_request_list_filter(self):
        self.request_list_filter = self.view.get_request_list_filter()

    def get_component_class(self):
        return self.component_class

    def set_component_class(self, component_class):
        self.component_class = component_class

    def get_template(self):
        return self.template

    def set_template(self, template):
        self.template = template

    def build(self, filter_def):
        raise NotImplementedError('Abstract method')

    def get_template_kwargs(self):
        if self.request_list_filter is None:
            self.setup_request_list_filter()
        if not isinstance(self.request_list_filter, dict):
            raise ValidationError(
                _('Invalid type of list filter')
            )
        return {}


class BaseFilter(AbstractFilter):

    def build(self, filter_def):
        if 'multiple_choices' in filter_def:
            self.vm_filter['multiple_choices'] = filter_def['multiple_choices']
        return self.vm_filter
