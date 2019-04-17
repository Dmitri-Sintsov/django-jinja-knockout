from copy import deepcopy
import json

from django.core.exceptions import ValidationError
from django.conf import settings
from django.utils.encoding import force_text
from django.utils.html import format_html
from django.forms.utils import flatatt
from django.utils.translation import gettext as _
from django.views.generic import ListView
from django.template.response import TemplateResponse

from .. import middleware
from .. import tpl
from ..models import get_meta, get_verbose_name
from .base import BaseFilterView


# Mix this class in ListView / ListSortingView derived class to have advanced pagination in
# bs_pagination() / bs_list() Jinja2 macros via selected_pages attribute of the instance.
class FoldingPaginationMixin:

    always_visible_links = False
    delta_visible_pages = 3

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.selected_pages = []

    def add_page(self, page_num, is_active, link_text):
        self.selected_pages.append((page_num, is_active, link_text))

    # is_active = True means page is selected (current or meaningless to click) thus is not clickable.
    def add_clickable_page(self, page_num, is_active, link_text):
        if self.always_visible_links or not is_active:
            self.selected_pages.append((page_num, is_active, link_text))

    def get_context_data(self, **kwargs):
        context_data = super().get_context_data(**kwargs)
        page_obj = context_data['page_obj']

        starting_page = page_obj.number - self.delta_visible_pages
        if starting_page < 1:
            starting_page = 1

        ending_page = starting_page + self.delta_visible_pages * 2
        back_shift = ending_page - page_obj.paginator.num_pages
        if back_shift > 0:
            starting_page -= back_shift
            ending_page -= back_shift
            if starting_page < 1:
                starting_page = 1

        self.add_clickable_page(1, page_obj.number == 1, _('First page'))
        prev_page_number = page_obj.previous_page_number() if page_obj.has_previous() else 1
        self.add_clickable_page(prev_page_number, not page_obj.has_previous(), _('Previous'))

        for i in range(starting_page, ending_page + 1):
            if i == starting_page and starting_page != 1:
                link_text = '...'
            elif i == ending_page and ending_page != page_obj.paginator.num_pages:
                link_text = '...'
            else:
                link_text = str(i)
            self.add_page(i, i == page_obj.number, link_text)

        next_page_number = page_obj.next_page_number() if page_obj.has_next() else page_obj.paginator.num_pages
        self.add_clickable_page(next_page_number, not page_obj.has_next(), _('Next'))
        self.add_clickable_page(page_obj.paginator.num_pages, page_obj.number == page_obj.paginator.num_pages, _('Last page'))

        return context_data


# Server-side implementation of filter field 'type': 'choices'.
# This class should not be exported in __init__.py.
#
# For AJAX (client-side) implementation used in conjunction with KoGridView,
# see App.ko.GridFilterChoice class in grid.js.
#
# todo: implement FilterRanges to work with BaseFilterView.get_lookup_range().
class FilterChoices:

    def __init__(self, view, filter_field, vm_filter, request_list_filter=None):
        self.view = view
        self.filter_field = filter_field
        self.vm_filter = vm_filter
        self.request_list_filter = request_list_filter
        # Text names of the currently selected filters.
        self.display = []

    def switch_choice(self, curr_list_filter, value):
        is_added = False
        in_filter = []
        if self.filter_field in curr_list_filter:
            field_filter = curr_list_filter[self.filter_field]
            if isinstance(field_filter, dict):
                unsupported_lookup = False
                if len(curr_list_filter[self.filter_field]) > 1:
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
                    self.view.remove_query_filter(self.filter_field)
                    raise ValidationError(
                        _("Unsupported field lookup for filter field '%(field)s'"),
                        params={'field': self.filter_field}
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
                del curr_list_filter[self.filter_field]
            elif len(in_filter) == 1:
                curr_list_filter[self.filter_field] = in_filter[0]
            else:
                curr_list_filter[self.filter_field] = {'in': in_filter}
        else:
            is_added = True
            curr_list_filter[self.filter_field] = value
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
        elif self.filter_field in curr_list_filter:
            del curr_list_filter[self.filter_field]
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
            is_added = not self.view.has_filter_choice(self.filter_field, choice_def['value'])
            curr_list_filter[self.filter_field] = choice_def['value']
        link = {
            'text': choice_def['name'],
            'atts': {}
        }
        if is_added is not False:
            if is_added is None:
                curr_list_filter[self.filter_field] = choice_def['value']
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
                self.view.has_filter_choice(self.filter_field, choice) for choice in
                self.yield_choice_values()
            ])
        self.request_list_filter = {} if self.has_all_choices else self.view.get_request_list_filter()

    def get_request_list_filter(self):
        return deepcopy(self.request_list_filter)

    def get_template_args(self):
        try:
            if self.request_list_filter is None:
                self.setup_request_list_filter()

            if not isinstance(self.request_list_filter, dict):
                raise ValidationError(
                    _('Invalid type of list filter')
                )

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

        except ValidationError as e:
            # Use filter field rendering Jinja2 macro bs_breadcrumbs() or similar, to display the error.
            return [{
                'text': str(e),
                'atts': {'class': 'active'},
                'url': '',
            }]
        return navs


# Traditional server-side (non-AJAX) generated filtered / sorted ListView.
# todo: Implement more filters ('range', 'fk').
# todo: Support self.current_list_filter.args Q() __or__.
class ListSortingView(FoldingPaginationMixin, BaseFilterView, ListView):

    paginate_by = getattr(settings, 'OBJECTS_PER_PAGE', 10)
    template_name = 'cbv_list.htm'
    highlight_mode = 'cycleRows'
    highlight_mode_rules = {
        'none': {
            'cycler': [],
        },
        'cycleColumns': {
            'direction': 0,
            'cycler': ['success', 'info', 'warning'],
        },
        'cycleRows': {
            'direction': 1,
            'cycler': ['success', 'info', 'warning'],
        },
        'linearRows': {
            'direction': 1,
            'cycler': ['linear-white'],
        }
    }
    data_caption = True

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.cycler_direction = self.highlight_mode_rules[self.highlight_mode].get('direction', None)
        self.cycler = self.highlight_mode_rules[self.highlight_mode].get('cycler', [])
        self.reported_error = None
        self.filter_display = {}

    def reset_query_args(self):
        self.allowed_filter_fields = self.get_allowed_filter_fields()
        self.current_list_filter.kwargs = {}
        self.current_sort_order = []
        self.current_stripped_sort_order = []
        self.current_search_str = ''

    # Respond with error message (non-AJAX mode).
    def report_error(self, message, *args, **kwargs):
        self.reset_query_args()
        self.reported_error = format_html(_(message), *args, **kwargs)
        self.object_list = self.model.objects.all()[0:0]
        # Reset page number otherwise there could be re-raised Http404() in genetic.list.MultipleObjectMixin.paginate_queryset().
        # Unfortunately there is no abstraction to reset current page number, that's why self.page_kwarg is altered instead.
        self.page_kwarg = ''
        context = {
            'view': self,
        }
        context.update(self.get_context_data())
        response = TemplateResponse(
            self.request,
            self.template_name,
            context,
            status=404
        )
        raise middleware.ImmediateHttpResponse(response)

    def get_heading(self):
        return get_meta(self.model, 'verbose_name_plural')

    def get_table_attrs(self):
        return {
            'class': 'table table-bordered table-collapse display-block-condition',
        }

    def get_cell_attrs(self, obj, column, row_idx, col_idx):
        attrs = {}
        if len(self.cycler) > 0:
            idx = row_idx if self.cycler_direction == 1 else col_idx
            attrs['class'] = self.cycler[idx % len(self.cycler)]
        if self.data_caption:
            if isinstance(column, list):
                verbose_name = ' / '.join([str(get_verbose_name(obj, field)) for field in column])
            else:
                verbose_name = get_verbose_name(obj, column)
            attrs['data-caption'] = verbose_name
        return attrs

    def get_json_order_result(self, sort_order):
        return {
            self.order_key: json.dumps(
                sort_order[0] if len(sort_order) == 1 else sort_order
            )
        }

    def get_current_sort_order_querypart(self, query: dict = None):
        if query is None:
            query = {}
        if self.current_sort_order is None:
            return query
        else:
            result = self.get_json_order_result(self.current_sort_order)
            result.update(query)
            return result

    def negate_sort_order_key(self, order_key):
        return order_key.lstrip('-') if order_key[0] == '-' else '-{0}'.format(order_key)

    def is_negate_sort_order(self, sort_order):
        return sort_order[0][0] == '-'

    def get_negate_sort_order_querypart(self, sort_order, query: dict = None):
        if sort_order is None:
            return query
        if query is None:
            query = {}
        # stripped_sort_order = self.strip_sort_order(sort_order)
        if self.current_sort_order == sort_order:
            # Negate current sort order.
            sort_order = [self.negate_sort_order_key(order_key) for order_key in sort_order]
        result = self.get_json_order_result(sort_order)
        result.update(query)
        return result

    # See utils.QueryFieldParserMixin.get_current_list_filter_querypart() for alternative implementation.
    def get_current_list_filter_querypart(self):
        return self.get_request_list_filter()

    def get_list_filter_querypart(self, list_filter_querypart=None, query: dict = None):
        if query is None:
            query = {}
        if list_filter_querypart is None or len(list_filter_querypart) == 0:
            return query
        else:
            result = {self.filter_key: json.dumps(list_filter_querypart)}
            result.update(query)
            return result

    # Methods with _querypart suffix are used to parse and return HTTP request querypart for current view state
    # of filtering / sorting, used in navigation and pagination.
    def get_current_querypart(self, query: dict = None):
        if query is None:
            query = {}
        return self.get_list_filter_querypart(
            list_filter_querypart=self.get_current_list_filter_querypart(),
            query=self.get_current_sort_order_querypart(query)
        )

    def get_reverse_query(self, list_filter_querypart):
        query = self.get_current_sort_order_querypart(
            query=self.get_list_filter_querypart(
                list_filter_querypart=list_filter_querypart
            )
        )
        return tpl.reverseq(
            self.request.resolver_match.view_name,
            kwargs=self.kwargs,
            query=query
        )

    def get_request_list_filter(self):
        return deepcopy(self.request_list_filter)

    def has_filter_choice(self, fieldname, choice):
        if not isinstance(self.request_list_filter, dict):
            raise ValidationError(
                _('Invalid type of list filter')
            )
        if fieldname not in self.request_list_filter:
            return False
        if self.request_list_filter[fieldname] == choice:
            return True
        if isinstance(self.request_list_filter[fieldname], dict):
            for choices in self.request_list_filter[fieldname].values():
                if choice in choices:
                    return True
        return False

    # todo: support self.current_list_filter.args Q lookups removal.
    def remove_query_filter(self, filter_field):
        field_lookups = set([filter_field])
        if isinstance(self.request_list_filter, dict) and filter_field in self.request_list_filter:
            if isinstance(self.request_list_filter[filter_field], dict):
                field_lookups.update([
                    '{}__{}'.format(filter_field, lookup) for lookup in self.request_list_filter[filter_field]
                ])
            # del self.request_list_filter[filter_field]
        if isinstance(self.current_list_filter.kwargs, dict):
            for field_lookup in field_lookups:
                if field_lookup in self.current_list_filter.kwargs:
                    del self.current_list_filter.kwargs[field_lookup]

    # Get current filter links suitable for bs_navs() or bs_breadcrumbs() template.
    # Currently supports only filter fields of type='choices'.
    # Todo: Implement more non-AJAX filter types (see KoGridView AJAX implementation).
    def get_field_filter(self, filter_field):
        vm_filter = self.get_filter(filter_field)
        filter_classname = 'Filter{}'.format(vm_filter['type'].capitalize())
        if filter_classname not in globals():
            raise NotImplementedError(
                'There is no "{}" class implementation for "{}" filter_field'.format(filter_classname, filter_field)
            )
        filter_class = globals()[filter_classname](self, filter_field, vm_filter)
        return filter_class

    def get_sort_order_link(self, sort_order, kwargs=None, query: dict = None, text=None, viewname=None):
        if type(sort_order) is str:
            sort_order = [sort_order]
        if query is None:
            query = {}
        if text is None:
            text = self.get_field_verbose_name(sort_order[0])
        if sort_order[0] in self.allowed_sort_orders:
            if kwargs is None:
                kwargs = self.kwargs
            if viewname is None:
                viewname = self.request.resolver_match.view_name
            link_attrs = {
                'class': 'iconui-ctrl-before',
                'href': tpl.reverseq(
                    viewname,
                    kwargs=kwargs,
                    query=self.get_negate_sort_order_querypart(
                        sort_order=sort_order,
                        query=self.get_list_filter_querypart(
                            list_filter_querypart=self.get_current_list_filter_querypart(),
                            query=query
                        )
                    )
                )
            }
            if sort_order == self.current_stripped_sort_order:
                link_attrs['class'] += ' sort-desc' if self.is_negate_sort_order(self.current_sort_order) else ' sort-asc'
            else:
                # link_attrs['class'] = 'sort-desc' if self.is_negate_sort_order(sort_order) else 'sort-asc'
                link_attrs['class'] += ' sort-inactive'

            return format_html(
                '<a{}>{}</a>',
                flatatt(link_attrs),
                force_text(text)
            )
        else:
            return force_text(text)

    def get_filter_args(self, fieldname):
        if fieldname in self.allowed_filter_fields:
            filter_title = self.get_field_verbose_name(fieldname)
            field_filter = self.get_field_filter(fieldname)
            navs = field_filter.get_template_args()
            # Store parsed field_filter display args for future reference, when needed.
            self.filter_display[fieldname] = field_filter.display
            return filter_title, navs
        else:
            raise ValueError('Not allowed fieldname: {}'.format(fieldname))

    def get_no_match_kwargs(self):
        kwargs = {
            'filter_title': {},
            'filter_display': {},
        }
        for fieldname in self.allowed_filter_fields:
            kwargs['filter_title'][fieldname] = self.get_field_verbose_name(fieldname)
            if fieldname in self.filter_display:
                # Field filter was already parsed.
                kwargs['filter_display'][fieldname] = self.filter_display[fieldname]
            else:
                # Parse field filter to get it's current display args.
                field_filter = self.get_field_filter(fieldname)
                # Next call is required to populate field_filter.display.
                field_filter.get_template_args()
                kwargs['filter_display'][fieldname] = field_filter.display
        if self.reported_error is None:
            kwargs['heading'] = self.get_heading()
        else:
            kwargs.update({
                'heading': self.reported_error,
                'format_str': '%(heading)s',
                'format_str_filters': '%(heading)s',
            })
        return kwargs

    def get_base_queryset(self):
        # Validate all filters by calling .get_template_args() which would remove invalid lookups from
        # via .remove_query_filter() method so these will not be queried.
        for filter_field in self.allowed_filter_fields:
            field_filter = self.get_field_filter(filter_field)
            field_filter.get_template_args()
        return super().get_base_queryset()
