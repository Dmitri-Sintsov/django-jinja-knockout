from copy import deepcopy, copy
import json

from django.core.exceptions import ValidationError
from django.conf import settings
from django.utils.encoding import force_str
from django.utils.html import format_html
from django.forms.utils import flatatt
from django.utils.translation import gettext as _
from django.views.generic.base import ContextMixin
from django.views.generic import ListView
from django.template.response import TemplateResponse

from ..utils.sdv import nested_update
from .. import middleware
from .. import tpl
from ..models import get_meta, get_verbose_name
from .base import BaseFilterView


# Mix this class in ListView / ListSortingView derived class to have advanced pagination in
# bs_pagination() / bs_list() Jinja2 macros via selected_pages attribute of the instance.
class FoldingPaginationMixin(ContextMixin):

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
        self.filter_instances = {}
        self.filter_errors = {}

    def get_filter_errors(self, fieldname):
        return self.filter_errors.get(fieldname, {})

    def reset_query_args(self):
        self.allowed_filter_fields = self.get_allowed_filter_fields()
        self.current_list_filter.kwargs = {}
        self.current_sort_order = []
        self.current_stripped_sort_order = []
        self.current_search_str = ''

    # Respond with error message (non-AJAX mode, no separate http method routing).
    def report_error(self, message=None, *args, **kwargs):
        self.reset_query_args()
        self.reported_error = None if message is None else format_html(_(message), *args, **kwargs)
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
        return order_key.lstrip('-') if order_key[0] == '-' else f'-{order_key}'

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

    def get_reverse_query(self, list_filter_querypart, extra_kwargs=None):
        query = self.get_current_sort_order_querypart(
            query=self.get_list_filter_querypart(
                list_filter_querypart=list_filter_querypart
            )
        )
        if extra_kwargs is None:
            view_kwargs = self.kwargs
        else:
            view_kwargs = copy(self.kwargs)
            view_kwargs.update(extra_kwargs)
        return tpl.reverseq(
            self.request.resolver_match.view_name,
            kwargs=view_kwargs,
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
                    f'{filter_field}__{lookup}' for lookup in self.request_list_filter[filter_field]
                ])
            # del self.request_list_filter[filter_field]
        if isinstance(self.current_list_filter.kwargs, dict):
            for field_lookup in field_lookups:
                if field_lookup in self.current_list_filter.kwargs:
                    del self.current_list_filter.kwargs[field_lookup]

    def build_field_filter(self, field_filter, canon_filter_def):
        self.filter_instances[field_filter.fieldname] = field_filter
        if 'template' in canon_filter_def:
            field_filter.set_template(canon_filter_def['template'])
        if 'component_class' in canon_filter_def:
            field_filter.set_component_class(canon_filter_def['component_class'])
        vm_filter = super().build_field_filter(field_filter, canon_filter_def)
        return vm_filter

    # Get current filter links suitable for bs_navs() or bs_breadcrumbs() template.
    # Currently supports only filter fields of type='choices'.
    # Todo: Implement more non-AJAX filter types (see KoGridView AJAX implementation).
    def get_field_filter_singleton(self, fieldname):
        if not self.has_filter(fieldname):
            raise ValueError(f'Not allowed filter fieldname: {fieldname}')
        if fieldname not in self.filter_instances:
            self.get_field_filter(fieldname)
        return self.filter_instances[fieldname]

    def get_sort_order_link(self, sort_order, kwargs=None, query: dict = None, text=None, viewname=None):
        if isinstance(sort_order, str):
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
                force_str(text)
            )
        else:
            return force_str(text)

    def has_filter(self, fieldname):
        return fieldname in self.allowed_filter_fields

    def ioc_field_filter(self, fieldname, vm_filter):
        if vm_filter['type'] == 'choices':
            return super().ioc_field_filter(fieldname, vm_filter)
        elif vm_filter['type'] == 'date':
            from ..field_filters.range import DateFilter
            return DateFilter(self, fieldname, vm_filter)
        elif vm_filter['type'] == 'datetime':
            from ..field_filters.range import DateTimeFilter
            return DateTimeFilter(self, fieldname, vm_filter)
        elif vm_filter['type'] == 'number':
            from ..field_filters.range import RangeFilter
            return RangeFilter(self, fieldname, vm_filter)
        elif vm_filter['type'] == 'error':
            from ..field_filters.base import ErrorFilter
            return ErrorFilter(self, fieldname, vm_filter)
        else:
            raise NotImplementedError(
                f'There is no "{vm_filter["type"]}" filter implementation for "{fieldname}" fieldname'
            )

    def get_no_match_template(self):
        return 'bs_filters.htm'

    def get_filter_template(self, fieldname):
        field_filter = self.get_field_filter_singleton(fieldname)
        return field_filter.get_template()

    def get_filter_kwargs(self, fieldname):
        field_filter = self.get_field_filter_singleton(fieldname)
        filter_kwargs = {
            'title': self.get_field_verbose_name(fieldname),
        }
        filter_kwargs.update(
            field_filter.get_template_kwargs()
        )
        return filter_kwargs

    def get_no_match_kwargs(self):
        kwargs = {
            'filter_title': {},
            'filter_display': {},
        }
        for fieldname in self.allowed_filter_fields:
            kwargs['filter_title'][fieldname] = self.get_field_verbose_name(fieldname)
            if fieldname in self.filter_instances:
                # Field filter was already parsed.
                kwargs['filter_display'][fieldname] = self.filter_instances[fieldname].display
            else:
                # Parse field filter to get it's current display args.
                field_filter = self.get_field_filter_singleton(fieldname)
                # Next call is required to populate field_filter.display.
                field_filter.get_template_kwargs()
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

    def add_field_error(self, model_field, form_field, value):
        nested_update(self.filter_errors, {
            model_field.name: {
                form_field.auto_id: form_field.errors
            }
        })

    def get_base_queryset(self):
        # Validate all filters by calling .get_template_kwargs() which would remove invalid lookups from
        # via .remove_query_filter() method so these will not be queried.
        for fieldname in self.allowed_filter_fields:
            field_filter = self.get_field_filter_singleton(fieldname)
            field_filter.get_template_kwargs()
        return super().get_base_queryset()

    def get_current_query(self):
        super().get_current_query()
        if len(self.filter_errors) > 0:
            self.report_error()
