from copy import copy
import json
from math import ceil
import traceback
from ensure import ensure_annotations
from django.conf import settings
from django.utils.encoding import force_text
from django.utils.html import format_html, escape
from django.forms.utils import flatatt
from django.utils.six.moves.urllib.parse import urlparse
from django.utils.translation import gettext as _, ugettext as _u
from django.utils.decorators import method_decorator
from django.http import HttpResponseRedirect, HttpResponseBadRequest, JsonResponse
from django.db.models import Q
from django.views.generic.base import View
from django.views.generic import TemplateView, DetailView, ListView
from django.shortcuts import resolve_url
from django.contrib.auth import REDIRECT_FIELD_NAME
from django.contrib.contenttypes.models import ContentType
from .models import get_verbose_name
from . import tpl as qtpl
from .viewmodels import vm_list


def auth_redirect(request):
    if request.is_ajax():
        # Will use viewmodel framework to display client-side alert.
        return JsonResponse({
            'view': 'alert_error',
            'message': _u('Access to current url is denied')
        })
    # Borrowed from django.contrib.auth.decorators.user_passes_test()
    path = request.build_absolute_uri()
    resolved_login_url = resolve_url(settings.LOGIN_URL)
    # If the login url is the same scheme and net location then just
    # use the path as the "next" url.
    login_scheme, login_netloc = urlparse(resolved_login_url)[:2]
    current_scheme, current_netloc = urlparse(path)[:2]
    if ((not login_scheme or login_scheme == current_scheme) and
            (not login_netloc or login_netloc == current_netloc)):
        path = request.get_full_path()
    from django.contrib.auth.views import redirect_to_login
    return redirect_to_login(path, resolved_login_url, REDIRECT_FIELD_NAME)


def error_response(request, html):
    if request.is_ajax():
        return JsonResponse({
            'view': 'alert_error',
            'message': html
        })
    else:
        return HttpResponseBadRequest(html)


def exception_response(request, e):
    if request.is_ajax():
        if settings.DEBUG:
            html = qtpl.print_list(
                row=[str(e), traceback.format_exc()],
                elem_tpl='<li style="white-space: pre-wrap;">{0}</li>\n'
            )
        else:
            html = 'Exception occured. Please contact administrator.'
        return error_response(request, html)
    else:
        raise e


# @note: Currently is unused, because url permission middleware checks permission_required from urls.py kwargs.
# @note: Usage:
# @cbv_decorator(permission_required('my_project.change_project'))
# class ProjectUpdate(BsTabsMixin, InlineDetailView):
# ...
def cbv_decorator(decorator):
    def inner(cls):
        orig_dispatch = cls.dispatch

        @method_decorator(decorator)
        def new_dispatch(self, request, *args, **kwargs):
            return orig_dispatch(self, request, *args, **kwargs)

        cls.dispatch = new_dispatch
        return cls
    return inner


def prepare_bs_navs(navs, request):
    # Select active nav tab according to request.path, if any.
    for key, nav in enumerate(navs):
        if 'atts' not in nav:
            nav['atts'] = {}
        if 'class' not in nav['atts']:
            nav['atts']['class'] = ''
        if nav['url'] == request.path:
            nav['atts']['class'] += ' active'
        nav['atts']['class'].strip()


# Automatic template context processor for bs_navs() jinja2 macro. #
class BsTabsMixin(object):

    def get_context_data(self, **kwargs):
        context_data = super().get_context_data(**kwargs)
        main_navs = self.get_main_navs(
            self.request, None if not hasattr(self, 'object') or self.object is None else self.object.pk
        )
        prepare_bs_navs(main_navs, self.request)
        context_data['main_navs'] = main_navs
        return context_data


class ContextDataMixin(object):

    extra_context_data = {}

    def get_context_data(self, **kwargs):
        context_data = self.__class__.extra_context_data.copy()
        context_data.update(super().get_context_data(**kwargs))
        return context_data


# See also https://github.com/AndrewIngram/django-extra-views
class FormWithInlineFormsetsMixin(object):
    # @note: Required to define ONLY when form_with_inline_formsets has FormClass is None
    # ("edit many related formsets without master form" mode).
    form_with_inline_formsets = None

    def get_form_with_inline_formsets(self, request):
        # UPDATE mode by default (UPDATE / VIEW).
        return self.__class__.form_with_inline_formsets(request)

    def get_model(self):
        return getattr(self.__class__, 'model', None)

    def dispatch(self, request, *args, **kwargs):
        self.ff = self.get_form_with_inline_formsets(request)
        form_class = self.ff.get_form_class()
        self.model = self.get_model()
        if self.model is None and form_class is not None:
            self.model = form_class._meta.model
        return super().dispatch(request, *args, **kwargs)

    def get_success_viewmodels(self):
        # @note: Do not just remove 'redirect_to', otherwise deleted forms will not be refreshed
        # after successful submission. Use as callback for view: 'alert' or make your own view.
        return vm_list({
            'view': 'redirect_to',
            'url': self.get_success_url()
        })

    def get_form_error_viewmodel(self, form):
        for bound_field in form:
            return {
                'view': 'form_error',
                'class': 'danger',
                'id': bound_field.auto_id,
                'messages': list((escape(message) for message in form.errors['__all__']))
            }
        return None

    def get_field_error_viewmodel(self, bound_field):
        return {
            'view': 'form_error',
            'id': bound_field.auto_id,
            'messages': list((escape(message) for message in bound_field.errors))
        }
        # Alternative version, different from 'bs_field.htm' macro rendering.
        """
        return {
            'view': 'popover_error',
            'id': bound_field.auto_id,
            'message': qtpl.print_bs_labels(bound_field.errors)
        }
        """

    def add_form_viewmodels(self, form):
        if '__all__' in form.errors:
            vm = self.get_form_error_viewmodel(form)
            if vm is not None:
                self.forms_vms.append(vm)
        for bound_field in form:
            if len(bound_field.errors) > 0:
                self.fields_vms.append(self.get_field_error_viewmodel(bound_field))

    def form_valid(self, form, formsets):
        """
        Called if all forms are valid. Creates a model instance along with
        associated formsets models and then redirects to a success page.
        """
        if self.request.is_ajax():
            return self.get_success_viewmodels()
        else:
            return HttpResponseRedirect(self.get_success_url())

    def form_invalid(self, form, formsets):
        """
        Called if a form is invalid. Re-renders the context data with the
        data-filled forms and errors.
        """
        if self.request.is_ajax():
            self.fields_vms = vm_list()
            self.forms_vms = vm_list()
            if form is not None:
                self.add_form_viewmodels(form)
            for formset in formsets:
                for formset_form in formset:
                    self.add_form_viewmodels(formset_form)
            return self.forms_vms + self.fields_vms
        else:
            return self.render_to_response(
                self.get_context_data(form=self.ff.form, formsets=self.ff.formsets)
            )

    def get_object_from_url(self):
        raise ValueError('Abstract method')

    def get(self, request, *args, **kwargs):
        """
        Handles GET requests and instantiates blank versions of the form
        and its inline formsets.
        """
        self.object = self.get_object_from_url()
        self.ff.get(instance=self.object)
        return self.render_to_response(
            self.get_context_data(form=self.ff.form, formsets=self.ff.formsets)
        )

    def post(self, request, *args, **kwargs):
        """
        Handles POST requests, instantiating a form instance and its inline
        formsets with the passed POST variables and then checking them for
        validity.
        """
        self.object = self.get_object_from_url()
        self.object = self.ff.save(instance=self.object)
        if self.object is not None:
            return self.form_valid(self.ff.form, self.ff.formsets)
        else:
            return self.form_invalid(self.ff.form, self.ff.formsets)


class InlineCreateView(FormWithInlineFormsetsMixin, TemplateView):

    def get_form_with_inline_formsets(self, request):
        return self.__class__.form_with_inline_formsets(request, create=True)

    def get_object_from_url(self):
        return None


# @note: Suitable both for CREATE and for VIEW actions (via form metaclass=DisplayModelMetaclass).
class InlineDetailView(FormWithInlineFormsetsMixin, DetailView):

    def get_object_from_url(self):
        return self.get_object()


# Model queryset filtering / ordering base.
class BaseFilterView(View):

    filter_key = 'list_filter'
    order_key = 'list_order_by'
    search_key = 'list_search'
    allowed_sort_orders = None
    allowed_filter_fields = None
    search_fields = None

    def __init__(self):
        super().__init__()
        # queryset.filter(**self.current_list_filter)
        self.current_list_filter = None
        # queryset.order_by(*self.current_sort_order) or queryset.order_by(self.current_sort_order)
        self.current_sort_order = None
        self.current_stripped_sort_order = None
        self.is_iterable_order = False
        self.current_search_str = ''

    def get_allowed_sort_orders(self):
        # Do not need to duplicate both accending and descending ('-' prefix) orders.
        # Both are counted in.
        return []

    def get_allowed_filter_fields(self):
        # Be careful about enabling filters.
        # @todo: Support '__in' suffix automatically.
        # key is field name (may be one to many related field as well)
        # value is list of field choices, as specified in model.
        return {}

    def get_search_fields(self):
        # {'field1': 'contains', 'field2': 'icontains', 'field3': ''}
        return {}

    def set_contenttype_filter(self, allowed_filter_fields, field, apps_models):
        allowed_filter_fields[field] = []
        for app_label, model in apps_models:
            ct = ContentType.objects.filter(app_label=app_label, model=model).first()
            allowed_filter_fields[field].append((ct.pk, ct.name))

    def request_get(self, key, default=None):
        return self.request.GET.get(key, default)

    def report_error(self, message, *args, **kwargs):
        raise ValueError(message.format(*args, **kwargs))

    def dispatch(self, request, *args, **kwargs):
        if self.__class__.allowed_sort_orders is None:
            self.__class__.allowed_sort_orders = self.get_allowed_sort_orders()
        if self.__class__.allowed_filter_fields is None:
            self.__class__.allowed_filter_fields = self.get_allowed_filter_fields()
        if self.__class__.search_fields is None:
            self.__class__.search_fields = self.get_search_fields()

        sort_order = self.request_get(self.__class__.order_key)
        if sort_order is not None:
            sort_order = json.loads(sort_order)
            self.is_iterable_order, self.current_stripped_sort_order = self.strip_sort_order(sort_order)
            self.current_sort_order = sort_order

        list_filter = self.request_get(self.__class__.filter_key)
        if list_filter is not None:
            list_filter = json.loads(list_filter)
            if type(list_filter) is not dict:
                self.report_error('List of filters must be dictionary: {0}', list_filter)
            for key, val in list_filter.items():
                if key not in self.__class__.allowed_filter_fields:
                    self.report_error('Non-allowed filter field: {0}', key)
                self.current_list_filter = list_filter

        self.current_search_str = self.request_get(self.search_key, '')

        return super().dispatch(request, *args, **kwargs)

    def strip_sort_order(self, sort_order):
        if type(sort_order) not in [str, list]:
            self.report_error('Invalid type of sorting order')
        # Tuple is not suitable because json.dumps() converts Python tuples to json lists.
        is_iterable = type(sort_order) is list
        stripped_order = [order.lstrip('-') for order in sort_order] if is_iterable else sort_order.lstrip('-')
        if stripped_order not in self.__class__.allowed_sort_orders:
            self.report_error('Non-allowed sorting order: {0}', stripped_order)
        return is_iterable, stripped_order

    def order_queryset(self, queryset):
        if self.current_sort_order is None:
            return queryset
        return queryset.order_by(*self.current_sort_order) \
            if self.is_iterable_order \
            else queryset.order_by(self.current_sort_order)

    def filter_queryset(self, queryset):
        if self.current_list_filter is None:
            return queryset
        else:
            return queryset.filter(**self.current_list_filter)

    def search_queryset(self, queryset):
        if self.current_search_str == '' or len(self.__class__.search_fields) == 0:
            return queryset
        else:
            q = None
            for field, operation in self.__class__.search_fields.items():
                if operation != '':
                    field += '__' + operation
                q_kwargs = {
                    field: self.current_search_str
                }
                if q is None:
                    q = Q(**q_kwargs)
                else:
                    q |= Q(**q_kwargs)
            return queryset.filter(q)

    # This method is required because child class custom queryset.filter will not work after self.order_queryset().
    # Thus, filter ListView queryset by overriding this method, not get_queryset().
    def get_base_queryset(self):
        return super().get_queryset()

    def get_queryset(self):
        return self.filter_queryset(
            self.order_queryset(
                self.search_queryset(
                    self.get_base_queryset()
                )
            )
        )


# Traditional server-side generated filtered / sorted ListView.
class ListSortingView(BaseFilterView, ListView):

    def get_current_sort_order_querypart(self, query={}):
        if self.current_sort_order is None:
            return query
        else:
            result = {self.__class__.order_key: json.dumps(self.current_sort_order)}
            result.update(query)
            return result

    def negate_sort_order_key(self, order_key):
        return order_key.lstrip('-') if order_key[0] == '-' else '-{0}'.format(order_key)

    def is_negate_sort_order(self, sort_order):
        return sort_order[0][0] == '-' if type(sort_order) is list else sort_order[0] == '-'

    def get_negate_sort_order_querypart(self, sort_order, query={}):
        if sort_order is None:
            return query
        is_iterable, stripped_sort_order = self.strip_sort_order(sort_order)
        if self.current_sort_order == sort_order:
            # Negate current sort order.
            if is_iterable:
                sort_order = [self.negate_sort_order_key(order_key) for order_key in sort_order]
            else:
                sort_order = self.negate_sort_order_key(sort_order)
        result = {self.__class__.order_key: json.dumps(sort_order)}
        result.update(query)
        return result

    def get_list_filter_querypart(self, list_filter, query={}):
        if list_filter is None:
            return query
        result = {self.__class__.filter_key: json.dumps(list_filter)}
        result.update(query)
        return result

    def get_current_list_filter_querypart(self, query={}):
        return self.get_list_filter_querypart(self.current_list_filter, query)

    def get_current_querypart(self, query={}):
        return self.get_current_list_filter_querypart(
            self.get_current_sort_order_querypart(query)
        )

    def has_current_filter(self, fieldname, fieldval):
        if self.current_list_filter is None:
            return False
        if fieldname not in self.current_list_filter:
            return False
        return self.current_list_filter[fieldname] == fieldval

    # Get current filter links suitable for bs_navs() or bs_breadcrumbs() template. #
    def get_filter_navs(self, filter_field):
        reset_list_filter = copy(self.current_list_filter)
        link = {'atts': {}}
        if self.current_list_filter is None:
            link['atts']['class'] = 'active'
            reset_list_filter = {}
        elif filter_field in reset_list_filter:
            del reset_list_filter[filter_field]
        else:
            link['atts']['class'] = 'active'
        link.update({
            'url': qtpl.reverseq(
                self.request.url_name,
                kwargs=self.kwargs,
                query=self.get_current_sort_order_querypart(
                    query=self.get_list_filter_querypart(
                        list_filter=reset_list_filter
                    )
                )
            ),
            'text': _('All')
        })
        navs = [link]
        display = []
        for filter_type, filter_type_display in self.__class__.allowed_filter_fields[filter_field]:
            reset_list_filter[filter_field] = filter_type
            link = {
                'url': qtpl.reverseq(
                    self.request.url_name,
                    kwargs=self.kwargs,
                    query=self.get_current_sort_order_querypart(
                        query=self.get_list_filter_querypart(
                            list_filter=reset_list_filter
                        )
                    )
                ),
                'text': filter_type_display,
                'atts': {}
            }
            if self.has_current_filter(filter_field, filter_type):
                display.append(filter_type_display)
                link['atts']['class'] = 'active'
            navs.append(link)
        return navs, display

    def get_sort_order_link(self, sort_order, kwargs=None, query={}, text=None, viewname=None):
        if kwargs is None:
            kwargs = self.kwargs
        if viewname is None:
            viewname = self.request.url_name
        if text is None:
            obj = self.__class__.model()
            text = get_verbose_name(obj, sort_order if type(sort_order) is str else sort_order[0])
        link_attrs = {
            'class': 'halflings-before',
            'href': qtpl.reverseq(
                viewname,
                kwargs=kwargs,
                query=self.get_negate_sort_order_querypart(
                    sort_order=sort_order,
                    query=self.get_current_list_filter_querypart(query)
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

    def get_context_data(self, **kwargs):
        context_data = super().get_context_data(**kwargs)
        context_data.update({
            'cbv': self,
            'filter_title': {},
            'filter_navs': {},
            'filter_display': {}
        })
        for fieldname in self.__class__.allowed_filter_fields:
            context_data['filter_title'][fieldname] = get_verbose_name(self.__class__.model, fieldname)
            navs, display = self.get_filter_navs(fieldname)
            context_data['filter_navs'][fieldname] = navs
            context_data['filter_display'][fieldname] = display
        return context_data


class ViewmodelView(TemplateView):

    @ensure_annotations
    def process_error_viewmodel(self, viewmodel:dict):
        if 'view' not in viewmodel:
            viewmodel['view'] = 'alert_error'

    @ensure_annotations
    def process_error_vm_list(self, vms:vm_list):
        for vm in vms:
            self.process_error_viewmodel(vm)

    @ensure_annotations
    def process_success_viewmodel(self, viewmodel:dict):
        if 'view' not in viewmodel:
            viewmodel['view'] = 'alert'

    @ensure_annotations
    def process_success_vm_list(self, vms:vm_list):
        for vm in vms:
            self.process_success_viewmodel(vm)

    # Can be called as self.error(*vm_list) or as self.error(**viewmodel_kwargs).
    # todo: Optional error accumulation.
    def error(self, *args, **kwargs):
        from .middleware import ImmediateJsonResponse
        if len(kwargs) > 0:
            vms = vm_list(dict(**kwargs))
        else:
            vms = vm_list(*args)
        self.process_error_vm_list(vms)
        raise ImmediateJsonResponse(vms)

    def dispatch(self, request, *args, **kwargs):
        result = super().dispatch(request, *args, **kwargs)
        if type(result) is dict:
            result = vm_list(result)
        if type(result) is vm_list:
            self.process_success_vm_list(result)
        return result


# Knockout.js ko-grid.js filtered / sorted ListView.
class KoGridView(BaseFilterView, ViewmodelView):

    view_name = 'grid_page'
    context_object_name = 'model'
    # query all fields by default.
    query_fields = []
    # ko viewmodel columns for all fields by default.
    grid_fields = []
    current_page = 1
    objects_per_page = getattr(settings, 'OBJECTS_PER_PAGE', 10)

    def request_get(self, key, default=None):
        return self.request.POST.get(key, default)

    def report_error(self, message, *args, **kwargs):
        self.error(
            title='Error',
            message=message.format(*args, **kwargs)
        )

    def dispatch(self, request, *args, **kwargs):
        self.model_class = self.get_base_queryset().model
        if len(self.__class__.grid_fields) == 0:
            for field in self.model_class._meta.fields:
                self.grid_fields.append(field.name)
        return super().dispatch(request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        if self.__class__.context_object_name is not None:
            from .models import get_meta
            context['get_meta'] = get_meta
            context[self.__class__.context_object_name] = self.model_class
        return context

    # One may add new related / calculated fields, for example.
    def postprocess_row(self, row):
        return row

    def get_rows(self):
        page_num = self.request_get('page', 1)
        try:
            page_num = int(page_num)
        except:
            self.error(
                title='Invalid page number',
                message=format_html('Page number: {}', page_num)
            )
        first_elem = (page_num - 1) * self.__class__.objects_per_page
        last_elem = first_elem + self.__class__.objects_per_page
        qs = self.get_queryset()
        self.total_rows = qs.count()
        return [
            self.postprocess_row(row) for row in qs[first_elem:last_elem].values(*self.__class__.query_fields)
        ]

    def get_viewmodel(self, rows):
        vm = {
            'view': self.__class__.view_name,
            'entries': list(rows),
            'totalPages': ceil(self.total_rows / self.__class__.objects_per_page),
        }
        if self.request_get('load_meta', False):
            vm_grid_fields = []
            for field in self.__class__.grid_fields:
                vm_grid_fields.append({
                    'field': field,
                    'name': get_verbose_name(self.model_class, field)
                })
            vm['grid_fields'] = vm_grid_fields

            vm_filters = []
            for fieldname, choices in self.__class__.allowed_filter_fields.items():
                vm_choices = []
                for value, name in choices:
                    vm_choices.append({
                        'value': value,
                        'name': name
                    })
                vm_filters.append({
                    'field': fieldname,
                    'name': get_verbose_name(self.model_class, fieldname),
                    'choices': vm_choices
                })
            vm['filters'] = vm_filters
        return vm

    def post(self, request, *args, **kwargs):
        return self.get_viewmodel(
            self.get_rows()
        )
