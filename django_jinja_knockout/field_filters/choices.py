from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _

from .. import tpl

from .base import MultiFilter


# Server-side implementation of filter field 'type': 'choices'.
#
# For AJAX (client-side) implementation used in conjunction with KoGridView,
# see App.ko.GridFilterChoice class in grid.js.
#
# todo: implement FilterRanges to work with BaseFilterView.get_lookup_range().
class FilterChoices(MultiFilter):

    template = 'bs_breadcrumbs.htm'

    def switch_choice(self, curr_list_filter, value):
        is_added = False
        in_filter = []
        if self.fieldname in curr_list_filter:
            field_filter = curr_list_filter[self.fieldname]
            if isinstance(field_filter, dict):
                unsupported_lookup = False
                if len(curr_list_filter[self.fieldname]) > 1:
                    unsupported_lookup = True
                if 'in' in field_filter:
                    in_filter = field_filter['in']
                    if not isinstance(in_filter, list):
                        in_filter = [in_filter]
                elif 'range' in field_filter:
                    # self.get_link() switcher is for 'in' lookups only.
                    return None
                else:
                    unsupported_lookup = True
                if unsupported_lookup:
                    # self.view.report_error() will not work as this code path is called from partially rendered page
                    # in progress, usually via bs_breadcrumbs() filter field rendering Jinja2 macro,
                    # thus we have to use it to display the error.
                    self.view.remove_query_filter(self.fieldname)
                    raise ValidationError(
                        _("Unsupported field lookup for filter field '%(field)s'"),
                        params={'field': self.fieldname}
                    )
            else:
                # Convert single value of field filter to the list of values.
                in_filter = [field_filter]
            # Switch value.
            if value in in_filter:
                # Remove already existing filter value.
                in_filter.remove(value)
            else:
                # Add new filter value.
                is_added = True
                in_filter.append(value)
            if len(in_filter) == 0:
                del curr_list_filter[self.fieldname]
            elif len(in_filter) == 1:
                curr_list_filter[self.fieldname] = in_filter[0]
            else:
                curr_list_filter[self.fieldname] = {'in': in_filter}
        else:
            is_added = True
            curr_list_filter[self.fieldname] = value
        return is_added

    def get_reset_link(self, curr_list_filter):
        # Reset filter.
        link = {
            'atts': {},
            'text': _('All'),
        }
        is_active = False
        if self.view.current_list_filter.kwargs is None:
            is_active = True
            curr_list_filter = {}
        elif self.fieldname in curr_list_filter:
            del curr_list_filter[self.fieldname]
        else:
            is_active = True
        if is_active:
            link['atts']['class'] = 'active'
            link['is_active_reset'] = True
        else:
            link['url'] = self.view.get_reverse_query(curr_list_filter)
        return link

    def get_link(self, choice_def, curr_list_filter):
        # Toggle choices for multiple choices only.
        if self.vm_filter['multiple_choices'] is True:
            is_added = self.switch_choice(curr_list_filter, choice_def['value'])
        else:
            is_added = not self.view.has_filter_choice(self.fieldname, choice_def['value'])
            curr_list_filter[self.fieldname] = choice_def['value']
        link = {
            'text': choice_def['name'],
            'atts': {}
        }
        if is_added is not False:
            if is_added is None:
                curr_list_filter[self.fieldname] = choice_def['value']
            link['url'] = self.view.get_reverse_query(curr_list_filter)
        else:
            self.display.append(choice_def['name'])
            link['atts']['class'] = 'active'
            # Show toggling of choices for multiple choices only.
            if self.vm_filter['multiple_choices'] is True:
                tpl.add_css_classes_to_dict(link['atts'], 'bold')
                link['url'] = self.view.get_reverse_query(curr_list_filter)
        return link

    def yield_choice_values(self):
        for choice_def in self.vm_filter['choices']:
            if 'value' in choice_def:
                yield choice_def['value']

    def setup_request_list_filter(self):
        self.has_all_choices = False
        if self.vm_filter['multiple_choices'] is True:
            self.has_all_choices = all([
                self.view.has_filter_choice(self.fieldname, choice) for choice in
                self.yield_choice_values()
            ])
        self.request_list_filter = {} if self.has_all_choices else self.view.get_request_list_filter()

    def get_template_kwargs(self):
        try:
            template_kwargs = super().get_template_kwargs()
            if self.vm_filter['multiple_choices'] is False:
                curr_list_filter = self.get_request_list_filter()
            navs = []
            self.display = []

            for choice_def in self.vm_filter['choices']:
                if self.vm_filter['multiple_choices'] is True:
                    curr_list_filter = self.get_request_list_filter()
                if 'value' not in choice_def:
                    link = self.get_reset_link(curr_list_filter)
                else:
                    link = self.get_link(choice_def, curr_list_filter)
                navs.append(link)
            template_kwargs['navs'] = navs
        except ValidationError as e:
            # Use filter field rendering Jinja2 macro bs_breadcrumbs() or similar, to display the error.
            return [{
                'text': str(e),
                'atts': {'class': 'active'},
                'url': '',
            }]
        return template_kwargs

    def build(self, filter_def):
        # Make "canonical" filter_def.
        filter_def.setdefault('add_reset_choice', True)
        filter_def.setdefault('active_choices', [])
        if 'multiple_choices' not in filter_def:
            # Autodetect 'multiple_choices' option.
            filter_def['multiple_choices'] = \
                True if filter_def.get('choices') is None else len(filter_def['choices']) > 2
        # Pre-built list of field values / menu names.
        vm_choices = []
        if filter_def['add_reset_choice']:
            vm_choices.append({
                # Do not pass 'value': None because since version 0.4.0 None can be valid value of field filter.
                # A choice without value is converted to Javascript undefined value at client-side instead.
                # 'value': None,
                'name': _('All'),
                'is_active': len(filter_def['active_choices']) == 0
            })
        # Convert filter_def choices from Django view to viewmodel choices for client-side AJAX response handler.
        for value, name in filter_def['choices']:
            choice = {
                'value': value,
                'name': name,
            }
            if value in filter_def['active_choices']:
                choice['is_active'] = True
            vm_choices.append(choice)
        self.vm_filter['choices'] = vm_choices
        return super().build(filter_def)
