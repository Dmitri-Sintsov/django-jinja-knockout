from copy import deepcopy

from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _


class BaseFilter:

    component_class = None
    template = None
    display = None

    def __init__(self, view, fieldname, vm_filter, request_list_filter=None):
        self.view = view
        self.fieldname = fieldname
        self.vm_filter = vm_filter
        # Query filter loaded from JSON. Field lookups are encoded as {'field': {'in': 1, 2, 3}}
        self.request_list_filter = request_list_filter
        self.template_kwargs = {}
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

    def set_template_kwargs(self, template_kwargs):
        self.template_kwargs = template_kwargs

    def get_template(self):
        return self.template

    def set_template(self, template):
        self.template = template

    def build(self, filter_def):
        return self.vm_filter

    def get_template_kwargs(self):
        if self.request_list_filter is None:
            self.setup_request_list_filter()
        if not isinstance(self.request_list_filter, dict):
            raise ValidationError(
                _('Invalid type of list filter')
            )
        return self.template_kwargs

    def to_error_filter(self, ex):
        self.__class__ = ErrorFilter
        self.template = self.get_template()
        self.vm_filter['ex'] = ex
        return self.get_template_kwargs()


class MultiFilter(BaseFilter):

    def build(self, filter_def):
        if 'multiple_choices' in filter_def:
            self.vm_filter['multiple_choices'] = filter_def['multiple_choices']
        return self.vm_filter


class ErrorFilter(BaseFilter):
    template = 'bs_error_filter.htm'

    def get_template(self):
        # Should not be overriden, otherwise displaying error message may fail.
        return self.__class__.template

    # Do not call super as it may cause infinite recursion.
    def get_template_kwargs(self):
        # Exctract messages from ValidationError instance:
        return {
            'messages': self.vm_filter['ex'].messages
        }
