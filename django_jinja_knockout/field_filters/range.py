from copy import deepcopy

from django.core.exceptions import ValidationError

from .. import tpl

from .base import BaseFilter, ErrorFilter


class RangeFilter(BaseFilter):
    component_class = 'App.RangeFilter'
    input_type = 'search'
    template = 'bs_range_filter.htm'
    from_field_lookup = 'gte'
    to_field_lookup = 'lte'

    def __init__(self, view, fieldname, vm_filter, request_list_filter=None):
        super().__init__(view, fieldname, vm_filter, request_list_filter)
        data_component_options = {
            'fieldName': self.fieldname,
        }
        if self.view.filter_key != 'list_filter':
            data_component_options['filterKey'] = self.view.filter_key
        if self.from_field_lookup != 'gte':
            data_component_options['fromFieldLookup'] = self.from_field_lookup
        if self.to_field_lookup != 'lte':
            data_component_options['toFieldLookup'] = self.to_field_lookup
        self.component_attrs = {
            'class': 'component',
            'data-component-options': data_component_options,
        }
        self.input_attrs = {
            'class': 'form-control',
            'type': self.input_type,
        }

    def get_values(self, curr_list_filter=None):
        if curr_list_filter is None:
            curr_list_filter = self.get_request_list_filter()
        filter_values = {}
        if self.fieldname in curr_list_filter:
            field_filter = curr_list_filter[self.fieldname]
            if self.from_field_lookup in field_filter:
                filter_values['from'] = field_filter[self.from_field_lookup]
            if self.to_field_lookup in field_filter:
                filter_values['to'] = field_filter[self.to_field_lookup]
        return filter_values

    def has_values(self, curr_list_filter=None):
        return len(self.get_values(curr_list_filter)) > 0

    def get_errors(self):
        return self.view.get_filter_errors(self.fieldname)

    def has_errors(self):
        return len(self.get_errors()) > 0

    def has_valid_values(self):
        return self.has_values() and not self.has_errors()

    def get_template_kwargs(self):
        try:
            template_kwargs = super().get_template_kwargs()
        except ValidationError as e:
            return self.to_error_filter(e)
        curr_list_filter = self.get_request_list_filter()
        apply_url_query = deepcopy(curr_list_filter)
        self.component_attrs['data-component-class'] = self.get_component_class()
        collapse_class = 'collapse'
        from_input_attrs = deepcopy(self.input_attrs)
        to_input_attrs = deepcopy(self.input_attrs)
        tpl.add_css_classes_to_dict(from_input_attrs, 'input-from')
        tpl.add_css_classes_to_dict(to_input_attrs, 'input-to')
        filter_values = self.get_values(curr_list_filter)
        if 'from' in filter_values:
            from_input_attrs['value'] = filter_values['from']
            collapse_class += ' in'
        if 'to' in filter_values:
            to_input_attrs['value'] = filter_values['to']
            if not collapse_class.endswith(' in'):
                collapse_class += ' in'
        if self.fieldname in curr_list_filter:
            del curr_list_filter[self.fieldname]
        reset_url_query = deepcopy(curr_list_filter)
        template_kwargs.update({
            'filter': self,
            'component_attrs': self.component_attrs,
            'collapse_class': collapse_class,
            'from_input_attrs': from_input_attrs,
            'to_input_attrs': to_input_attrs,
            'errors': self.get_errors(),
            'apply_url_query': apply_url_query,
            'reset_url_query': reset_url_query,
        })
        return template_kwargs


class DateFilter(RangeFilter):
    input_class = 'date-control'

    def get_template_kwargs(self):
        template_kwargs = super().get_template_kwargs()
        if isinstance(self, ErrorFilter):
            return template_kwargs
        else:
            tpl.add_css_classes_to_dict(template_kwargs['from_input_attrs'], self.input_class)
            tpl.add_css_classes_to_dict(template_kwargs['to_input_attrs'], self.input_class)
        return template_kwargs


class DateTimeFilter(DateFilter):
    input_class = 'datetime-control'
