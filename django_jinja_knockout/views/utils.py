from django.db import models
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _


class FieldLookupDict(dict):

    def add_lookup(self, field_lookup, values):
        if field_lookup in self:
            if not isinstance(self[field_lookup], list):
                self[field_lookup] = [
                    self[field_lookup]
                ]
            if isinstance(values, list):
                self[field_lookup].extend(values)
            else:
                self[field_lookup].append(values)
        else:
            self[field_lookup] = values

    def optimize(self):
        if 'in' in self and len(self) == 1:
            if isinstance(self['in'], list):
                if len(self['in']) == 1:
                    return self['in'][0]
            else:
                return self['in']
        return self


# Convert Django queryset list_filter to HTTP request list filter querypart.
# It allows to use Django queries which were not originally parsed in base.BaseFilterView.get_current_list_filter().
# Can be mixed to ListSortingView. Currently is unused. Consider to remove.
class QueryFieldParserMixin:

    def get_field_lookup(self, field_expr):
        if field_expr in self.allowed_filter_fields:
            field_name = field_expr
            field_lookup = 'in'
        else:
            rel_path = field_expr.split('__')
            if len(rel_path) > 1:
                field_name = '__'.join(rel_path[0:-1])
                field_lookup = rel_path[-1]
            if field_name not in self.allowed_filter_fields:
                raise ValidationError(
                    _("Invalid field lookup: '%(field_expr)s'"),
                    params={'field_expr': field_expr}
                )
        return field_name, field_lookup

    def yield_list_filter_args(self, list_filter_args, list_filter_kwargs):
        for arg in list_filter_args:
            if not isinstance(arg, models.Q) or arg.connector != 'OR' or arg.negated:
                raise ValidationError(
                    _('Only Q.__or__ expressions without negation are supported as query arguments')
                )
            for field_expr, values in arg.children:
                field_name, field_lookup = self.get_field_lookup(field_expr)
                if field_lookup == 'isnull':
                    field_lookup = 'in'
                    values = [None]
                yield field_name, field_lookup, values

        for field_expr, values in list_filter_kwargs.items():
            field_name, field_lookup = self.get_field_lookup(field_expr)
            yield field_name, field_lookup, values

    # todo: Consider refactoring to separate class.
    # Convert Django queryset list_filter to HTTP request list filter querypart.
    def parse_list_filter_querypart(self, list_filter_args, list_filter_kwargs):
        list_filter_querypart = {}

        # Sanitize arguments.
        if list_filter_args is None:
            if list_filter_kwargs is None:
                return list_filter_querypart
            else:
                list_filter_args = []
        else:
            if list_filter_kwargs is None:
                list_filter_kwargs = {}

        if self.allowed_filter_fields is None:
            self.allowed_filter_fields = self.get_allowed_filter_fields()

        for field_name, field_lookup, values in self.yield_list_filter_args(list_filter_args, list_filter_kwargs):

            if field_name not in list_filter_querypart:
                list_filter_querypart[field_name] = FieldLookupDict()

            list_filter_querypart[field_name].add_lookup(field_lookup, values)

        list_filter_querypart = {
            field_name: field_lookup_dict.optimize() for field_name, field_lookup_dict in list_filter_querypart.items()
        }

        return list_filter_querypart

    def get_current_list_filter_querypart(self):
        return self.parse_list_filter_querypart(
            self.current_list_filter_args,
            self.current_list_filter_kwargs,
        )
