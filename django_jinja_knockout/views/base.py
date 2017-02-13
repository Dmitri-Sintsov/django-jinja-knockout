import json
import traceback

from django.core.exceptions import ValidationError
from django.conf import settings
from django.utils.html import format_html, escape
from django import forms
from django.utils.six.moves.urllib.parse import urlparse
from django.utils.translation import gettext as _, ugettext as _u
from django.utils.decorators import method_decorator
from django.http import HttpResponseBadRequest
from django.db import models
from django.views.generic.base import View
from django.shortcuts import resolve_url
from django.contrib.auth import REDIRECT_FIELD_NAME
from django.contrib.contenttypes.models import ContentType

from .. import tpl as qtpl
from ..models import (
    normalize_fk_fieldname, get_verbose_name, get_related_field, yield_model_fieldnames
)
from ..viewmodels import vm_list
from ..admin import empty_value_display
from ..utils.sdv import yield_ordered, get_object_members, get_nested


def auth_redirect(request):
    from ..middleware import JsonResponse
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
    from ..middleware import JsonResponse
    if request.is_ajax():
        return JsonResponse({
            'view': 'alert_error',
            'message': html
        })
    else:
        return HttpResponseBadRequest(html)


def exception_response(request, e):
    if request.is_ajax() and settings.DEBUG:
        html = qtpl.print_list(
            row=[str(e), traceback.format_exc()],
            elem_tpl='<li style="white-space: pre-wrap;">{0}</li>\n'
        )
        return error_response(request, html)
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


# Supports both ancestors of DetailView and KoGridView.
# DetailView and it's ancestors are supported automatically.
# For KoGridView, one has to override .get() method and call .format_title() with appropriate args.
class FormatTitleMixin:

    format_view_title = False

    def __init__(self, *args, **kwargs):
        self.view_title_is_formatted = False
        super().__init__(*args, **kwargs)

    def format_title(self, *args):
        if self.__class__.format_view_title and not self.view_title_is_formatted:
            self.request.view_title = format_html(self.request.view_title, *args)
            self.view_title_is_formatted = True

    # Used when mixed with DetailView ancestors.
    def get_object(self, queryset=None):
        obj = super().get_object(queryset)
        self.format_title(obj)
        return obj

    # Used when mixed with DetailView ancestors.
    def get_object_from_url(self):
        return self.get_object()

    # Used when mixed with DetailView ancestors.
    def get_heading(self):
        if getattr(self, 'object', None) is not None:
            return self.object
        else:
            return get_verbose_name(self.model)


# Automatic template context processor for bs_navs() jinja2 macro, which is used to group navigation between
# related CRUD views (see djk-sample for example).
class BsTabsMixin(object):

    def get_main_navs(self, request, object_id=None):
        main_navs = []
        """
        from django.core.urlresolvers import reverse
        main_navs.append({
            'url': reverse('list_objects_url_name'), 'text': 'List'
        })
        if object_id is not None:
            main_navs.append({
                'url': reverse('view_object_url_name', kwargs={'obj_id': object_id}), 'text': 'View'
            })
        """
        return main_navs

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


# Forms and forms fields AJAX viewmodel responce.
class FormViewmodelsMixin():

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

    def add_form_viewmodels(self, form, ff_vms):
        if '__all__' in form.errors:
            ff_vms.append(self.get_form_error_viewmodel(form))
        for bound_field in form:
            if len(bound_field.errors) > 0:
                ff_vms.append(self.get_field_error_viewmodel(bound_field))

    def ajax_form_invalid(self, form, formsets):
        ff_vms = vm_list()
        if form is not None:
            self.add_form_viewmodels(form, ff_vms)
        for formset in formsets:
            for formset_form in formset:
                self.add_form_viewmodels(formset_form, ff_vms)
        return ff_vms


# Used to validate values of submitted filter fields.
class FieldValidator:

    field_types = (
        # Order is important, because DateTimeField is ancestor of DateField.
        ('DateTimeField', 'datetime', None),
        ('DateField',     'date',     None),
        ('DecimalField',  'number',   None),
        ('IntegerField',  'number',   None),
    )

    def __init__(self, view, fieldname, model_class=None):
        self.view = view
        self.model_field = get_related_field(view.model if model_class is None else model_class, fieldname)
        self.form_field, self.field_filter_type = self.get_form_field()

    def get_form_field(self):
        for model_field_type, field_filter_type, form_field_type in self.__class__.field_types:
            model_field = getattr(models, model_field_type)
            if isinstance(self.model_field, model_field):
                # Use the same field type from forms by default.
                if form_field_type is None:
                    return model_field().formfield(localize=True, required=False), field_filter_type
                else:
                    return (
                        getattr(forms, form_field_type)(localize=True, required=False),
                        field_filter_type
                    )
        return None, None

    def set_auto_id(self, lookup):
        if self.form_field is None:
            return
        self.form_field.auto_id = None
        if lookup == 'gte':
            self.form_field.auto_id = 'id_range_from'
        elif lookup == 'lte':
            self.form_field.auto_id = 'id_range_to'

    def clean(self, value):
        try:
            if self.form_field is None:
                return value, False
            else:
                cleaned_value = self.form_field.clean(value)
                is_blank = cleaned_value is None and self.form_field.required is not True
                return cleaned_value, is_blank
        except ValidationError as e:
            if self.form_field.auto_id is None:
                self.view.report_error(str(e))
            else:
                self.form_field.errors = e.messages
                self.view.error(
                    {
                        'view': self.view.__class__.viewmodel_name,
                        'has_errors': True,
                    },
                    self.view.get_field_error_viewmodel(self.form_field)
                )

    # Detect type of filter.
    # Override in child class to add new type of custom filters.
    # Implement "App.ko.Grid.iocKoFilter_custom_type" method at client-side.
    def detect_field_filter(self, filter_def):
        # Model.choices should have preference over self.field_filter_type because integer fields
        # may have choice attribute, which should have preference over 'number' filter.
        if hasattr(self.model_field, 'choices') and len(self.model_field.choices) > 0:
            filter_def['choices'] = self.model_field.choices
            return {
                'type': 'choices',
            }
        elif self.field_filter_type is not None:
            return {
                'type': self.field_filter_type
            }
        elif isinstance(self.model_field, models.ForeignKey):
            # Use App.ko.FkGridFilter to select filter choices.
            return {
                'type': 'fk',
                'multiple_choices': True
            }
        elif isinstance(self.model_field, (models.BooleanField, models.NullBooleanField)):
            filter_def['choices'] = [
                (True, _('Yes')),
                (False, _('No'))
            ]
            if isinstance(self.model_field, models.NullBooleanField):
                filter_def['choices'].append(
                    (None, str(empty_value_display))
                )
            return {
                'type': 'choices'
            }
        else:
            self.view.report_error(
                'Cannot determine filter type of field "{}"', str(self.model_field)
            )


# Model queryset filtering / ordering base.
class BaseFilterView(View):

    filter_key = 'list_filter'
    order_key = 'list_order_by'
    search_key = 'list_search'
    field_validator = FieldValidator
    # List / grid columns. Use '__all__' value to display all model fields as grid columns,
    # or specify the list of field names, where each value is str.
    # Tuple value ('field', 'Column name') may be used instead of str value to override field names displayed
    # in grid column.
    grid_fields = None
    allowed_sort_orders = None
    allowed_filter_fields = None
    search_fields = None
    model = None

    def __init__(self):
        super().__init__()
        # Query filter loaded from JSON. Field lookups are encoded as {'field': {'in': 1, 2, 3}}
        self.request_list_filter = {}
        # queryset.filter(*self.current_list_filter_args, **self.current_list_filter_kwargs)
        self.current_list_filter_args = None
        self.current_list_filter_kwargs = None
        # queryset.order_by(*self.current_sort_order)
        self.current_sort_order = None
        self.current_stripped_sort_order = None
        self.current_search_str = ''

        self.allowed_sort_orders = None
        self.allowed_filter_fields = None
        self.search_fields = None
        self.has_get_str_fields = False

    def get_grid_fields_attnames(self):
        return [field[0] if type(field) is tuple else field for field in self.grid_fields]

    def get_all_allowed_sort_orders(self):
        # If there are related grid fields explicitly defined in self.__class__.grid_fields attribute,
        # these will be automatically added to allowed sort orders.
        return self.get_all_fieldnames() if self.grid_fields is None else self.get_all_related_fields()

    def get_grid_fields(self):
        return []

    def get_related_fields(self, query_fields=None):
        if query_fields is None:
            query_fields = self.get_all_fieldnames()
        return list(set(self.get_grid_fields_attnames()) - set(query_fields))

    # A superset of self.get_all_fieldnames() which also returns foreign related fields, if any.
    # It is used to automatically include related query fields / sort orders.
    def get_all_related_fields(self):
        query_fields = self.get_all_fieldnames()
        related_fields = self.get_related_fields(query_fields)
        query_fields.extend(related_fields)
        return query_fields

    def get_field_validator(self, fieldname):
        return self.__class__.field_validator(self, fieldname)

    def get_allowed_sort_orders(self):
        # Do not need to duplicate both accending and descending ('-' prefix) orders.
        # Both are counted in.
        return []

    def get_allowed_filter_fields(self):
        # Be careful about enabling filters.
        # key is field name (may be one to many related field as well)
        # value is the list of field choice tuples, as specified in model field 'choices' kwarg.
        return {}

    def get_search_fields(self):
        # (('field1', 'contains'), ('field2', 'icontains'), ('field3', ''))
        # Ordered dict is also supported with the same syntax.
        return ()

    def get_contenttype_filter(self, *apps_models):
        filter_choices = []
        for app_label, model in apps_models:
            ct = ContentType.objects.filter(app_label=app_label, model=model).first()
            filter_choices.append((ct.pk, ct.name))
        return filter_choices

    def request_get(self, key, default=None):
        if key in self.request.POST:
            return self.request.POST.get(key)
        else:
            return self.request.GET.get(key, default)

    def get_all_fieldnames(self):
        return list(yield_model_fieldnames(self.__class__.model))

    # virtual / annotated fields may be added to row via overloading:
    #
    #   get_field_verbose_name()
    #   get_related_fields()
    #   get_model_fields()
    #   postprocess_row()
    #   get_row_str_fields()
    #
    def get_row_str_fields(self, obj, row=None):
        if self.has_get_str_fields:
            str_fields = obj.get_str_fields()
            for fieldname in self.grid_fields:
                if '__' in fieldname:
                    rel_path = fieldname.split('__')
                    rel_str = get_nested(str_fields, rel_path)
                    if rel_str is not None:
                        str_fields[fieldname] = rel_str
            return str_fields
        else:
            return None

    # Override in child class to customize output.
    def get_display_value(self, obj, field):
        if not hasattr(obj, '_display_value'):
            obj._display_value = self.get_row_str_fields(obj)
        normalized_field = normalize_fk_fieldname(field)
        field_val = getattr(obj, field)
        if isinstance(field_val, models.Model) and hasattr(field_val, 'get_canonical_link'):
            display_value = format_html('<a href="{1}">{0}</a>', *field_val.get_canonical_link())
        elif field in obj._display_value:
            display_value = obj._display_value[field]
        elif normalized_field in obj._display_value:
            display_value = obj._display_value[normalized_field]
        else:
            display_value = field_val
        if isinstance(display_value, dict):
            display_value = qtpl.print_list_group(display_value.values())
        return display_value

    @classmethod
    def init_allowed_filter_fields(cls, self):
        if cls.allowed_filter_fields is None:
            self.allowed_filter_fields = self.get_allowed_filter_fields()
        else:
            self.allowed_filter_fields = cls.allowed_filter_fields

    @classmethod
    def init_class(cls, self):

        if cls.grid_fields is None:
            self.grid_fields = self.get_grid_fields()
        elif cls.grid_fields == '__all__':
            self.grid_fields = self.get_all_fieldnames()
        else:
            self.grid_fields = cls.grid_fields

        if cls.allowed_sort_orders is None:
            self.allowed_sort_orders = self.get_allowed_sort_orders()
        elif cls.allowed_sort_orders == '__all__':
            self.allowed_sort_orders = self.get_all_allowed_sort_orders()
        else:
            self.allowed_sort_orders = cls.allowed_sort_orders

        cls.init_allowed_filter_fields(self)

        if cls.search_fields is None:
            self.search_fields = self.get_search_fields()
        else:
            self.search_fields = cls.search_fields

        model_class_members = get_object_members(self.__class__.model)
        self.has_get_str_fields = callable(model_class_members.get('get_str_fields'))

    def get_field_verbose_name(self, field_name):
        # str() is used to avoid "<django.utils.functional.__proxy__ object> is not JSON serializable" error.
        return str(get_verbose_name(self.__class__.model, field_name))

    def get_field_filter(self, fieldname, filter_def):
        vm_filter = {
            'field': fieldname,
            'name': self.get_field_verbose_name(fieldname),
        }
        if filter_def.get('type') is not None:
            vm_filter['type'] = filter_def['type']
        else:
            if isinstance(filter_def.get('choices'), (list, tuple)):
                vm_filter['type'] = 'choices'
            else:
                # Use App.ko.FkGridFilter to select filter choices.
                # Autodetect widget.
                field_validator = self.get_field_validator(fieldname)
                vm_filter.update(field_validator.detect_field_filter(filter_def))
        return vm_filter

    def process_field_filter_choices(self, vm_filter, filter_def):
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
        vm_filter['choices'] = vm_choices

    def get_filter(self, fieldname):
        filter_def = self.allowed_filter_fields[fieldname]
        # Make "canonical" canon_filter_def from filter_def.
        canon_filter_def = {
            'add_reset_choice': True,
            'active_choices': [],
        }
        if isinstance(filter_def, (list, tuple)):
            canon_filter_def['choices'] = filter_def
        elif isinstance(filter_def, dict):
            canon_filter_def.update(filter_def)
        # Autodetect widget.
        vm_filter = self.get_field_filter(fieldname, canon_filter_def)
        process_method = getattr(self, 'process_field_filter_{}'.format(vm_filter['type']), None)
        if callable(process_method):
            process_method(vm_filter, canon_filter_def)
        if 'multiple_choices' in canon_filter_def:
            vm_filter['multiple_choices'] = canon_filter_def['multiple_choices']
        return vm_filter

    def get_q_or(self, q_kwargs):
        q = None
        for k, v in q_kwargs.items():
            if q is None:
                q = models.Q(**{k: v})
            else:
                q |= models.Q(**{k: v})
        return q

    def get_filters(self):
        vm_filters = [self.get_filter(fieldname) for fieldname in self.allowed_filter_fields]
        return vm_filters

    def get_current_list_filter_multiple(self, fieldname, values):
        current_list_filter_args = []
        current_list_filter_kwargs = {}
        field_validator = self.get_field_validator(fieldname)
        field_validator.set_auto_id(None)
        for lookup, value in values.items():
            field_validator.set_auto_id(lookup)
            field_lookup = fieldname + '__' + lookup
            has_in_none = False
            if isinstance(value, list):
                lookup_filter = []
                for v in value:
                    cleaned_value, is_blank = field_validator.clean(v)
                    if cleaned_value is None:
                        if lookup == 'in':
                            has_in_none = True
                    elif not is_blank:
                        lookup_filter.append(cleaned_value)
                if len(lookup_filter) == 0 and not has_in_none:
                    continue
                if lookup == 'in':
                    if len(lookup_filter) == 0:
                        # has_in_none == True
                        current_list_filter_kwargs['{}__isnull'.format(fieldname)] = True
                    # Todo: support arbitrary OR via pipeline character '|fieldname' prefix.
                    elif len(lookup_filter) == 1:
                        if has_in_none:
                            current_list_filter_args.append(
                                self.get_q_or({
                                    '{}__isnull'.format(fieldname): True,
                                    fieldname: lookup_filter[0],
                                })
                            )
                        else:
                            current_list_filter_kwargs[fieldname] = lookup_filter[0]
                    else:
                        if has_in_none:
                            current_list_filter_args.append(
                                self.get_q_or({
                                    '{}__isnull'.format(fieldname): True,
                                    field_lookup: lookup_filter,
                                })
                            )
                        else:
                            current_list_filter_kwargs[field_lookup] = lookup_filter
                else:
                    current_list_filter_kwargs[field_lookup] = lookup_filter
            else:
                lookup_filter, is_blank = field_validator.clean(value)
                if is_blank:
                    continue
                current_list_filter_kwargs[field_lookup] = lookup_filter
        return current_list_filter_args, current_list_filter_kwargs

    def get_current_list_filter(self, list_filter):
        if type(list_filter) is not dict:
            self.report_error(
                'List of filters must be dictionary: {}', list_filter)
        current_list_filter_args = []
        current_list_filter_kwargs = {}
        for fieldname, values in list_filter.items():
            if fieldname not in self.allowed_filter_fields:
                self.report_error(
                    'Not allowed filter field: "{}"', fieldname
                )
            if not isinstance(values, dict):
                # Single value.
                field_validator = self.get_field_validator(fieldname)
                field_validator.set_auto_id(None)
                cleaned_value, is_blank = field_validator.clean(values)
                if is_blank:
                    continue
                if cleaned_value is None:
                    current_list_filter_kwargs['{}__isnull'.format(fieldname)] = True
                else:
                    current_list_filter_kwargs[fieldname] = cleaned_value
            else:
                # Multiple lookups and / or multiple values.
                a, k = self.get_current_list_filter_multiple(fieldname, values)
                current_list_filter_args.extend(a)
                current_list_filter_kwargs.update(k)
        return current_list_filter_args, current_list_filter_kwargs

    def get_current_query(self):
        sort_order = self.request_get(self.__class__.order_key)
        if sort_order is not None:
            try:
                sort_order = json.loads(sort_order)
            except ValueError:
                self.report_error(
                    'Invalid value of sort_order: {}', sort_order
                )
            if not isinstance(sort_order, list):
                sort_order = [sort_order]
            self.current_stripped_sort_order = self.strip_sort_order(sort_order)
            self.current_sort_order = sort_order

        list_filter_str = self.request_get(self.__class__.filter_key)
        if list_filter_str is not None:
            try:
                self.request_list_filter = json.loads(list_filter_str)
            except ValueError:
                self.report_error(
                    'Invalid value of list_filter: {}', list_filter_str
                )
            self.current_list_filter_args, self.current_list_filter_kwargs = \
                self.get_current_list_filter(self.request_list_filter)

        self.current_search_str = self.request_get(self.search_key, '')

    def dispatch(self, request, *args, **kwargs):
        self.__class__.init_class(self)
        self.get_current_query()
        return super().dispatch(request, *args, **kwargs)

    def strip_sort_order(self, sort_order):
        if type(sort_order) is not list:
            self.report_error('Invalid type of sorting order')
        # Tuple is not suitable because json.dumps() converts Python tuples to json lists.
        stripped_order = [order.lstrip('-') for order in sort_order]
        if (stripped_order not in self.allowed_sort_orders) and \
                (len(stripped_order) == 1 and stripped_order[0] not in self.allowed_sort_orders):
            self.report_error(
                'Not allowed sorting order: "{}"', stripped_order
            )
        return stripped_order

    def order_queryset(self, queryset):
        if self.current_sort_order is None:
            return queryset
        return queryset.order_by(*self.current_sort_order)

    def filter_queryset(self, queryset):
        has_args = self.current_list_filter_args is not None and len(self.current_list_filter_args) > 0
        has_kwargs = self.current_list_filter_kwargs is not None and len(self.current_list_filter_kwargs) > 0
        if has_args:
            if has_kwargs:
                return queryset.filter(*self.current_list_filter_args, **self.current_list_filter_kwargs)
            else:
                return queryset.filter(*self.current_list_filter_args)
        else:
            if has_kwargs:
                return queryset.filter(**self.current_list_filter_kwargs)
            else:
                return queryset

    def search_queryset(self, queryset):
        if self.current_search_str == '' or len(self.search_fields) == 0:
            return queryset
        else:
            q = None
            for field, operation in yield_ordered(self.search_fields):
                if operation != '':
                    field += '__' + operation
                q_kwargs = {
                    field: self.current_search_str
                }
                if q is None:
                    q = models.Q(**q_kwargs)
                else:
                    q |= models.Q(**q_kwargs)
            return queryset.filter(q)

    def distinct_queryset(self, queryset):
        return queryset.distinct()

    # This method is required because child class custom queryset.filter will not work after self.order_queryset().
    # Thus, filter ListView queryset by overriding this method, not get_queryset().
    def get_base_queryset(self):
        return super().get_queryset()

    def get_queryset(self):
        return \
            self.distinct_queryset(
                self.order_queryset(
                    self.filter_queryset(
                        self.search_queryset(
                            self.get_base_queryset()
                        )
                    )
                )
            )
