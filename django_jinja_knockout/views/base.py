import json
from collections import OrderedDict
from functools import wraps
from urllib.parse import urlparse
from ensure import ensure_annotations

from django.core.exceptions import ValidationError, FieldError
from django.conf import settings
from django.template.response import TemplateResponse
from django.utils.html import format_html, escape
from django.utils.translation import gettext as _
from django.utils.decorators import method_decorator
from django.db import models
from django.views.generic.base import ContextMixin, TemplateResponseMixin, View
from django.shortcuts import resolve_url
from django.contrib.auth import REDIRECT_FIELD_NAME
from django.contrib import contenttypes

from ..context_processors import create_page_context
from .. import http
from .. import tpl
from ..models import (
    normalize_fk_fieldname, get_verbose_name, get_related_field_val, yield_model_fieldnames
)
from ..obj_dict import ObjDict
from ..viewmodels import vm_list
from ..utils.sdv import yield_ordered, get_nested, FuncArgs
from ..forms.validators import FieldValidator


def page_context_decorator(view_title=None, client_data=None, client_routes=None, custom_scripts=None):
    def decorator(func):
        @wraps(func)
        def inner(request, *args, **kwargs):
            response = func(request, *args, **kwargs)
            if isinstance(response, TemplateResponse):
                if response.context_data is None:
                    response.context_data = {}
                response.context_data.setdefault('page_context', create_page_context(
                    request=request,
                    view_title=view_title,
                    client_data=client_data,
                    client_routes=client_routes,
                    custom_scripts=custom_scripts
                ))
            else:
                raise ValueError('TemplateResponse is required')
            return response
        return inner
    return decorator


def auth_redirect(request):
    if http.is_ajax(request):
        # Will use viewmodel framework to display client-side alert.
        return http.json_response({
            'view': 'alert_error',
            'message': format_html(
                '<div>{}</div><div>{}</div>',
                _('Access to current url is denied'),
                request.build_absolute_uri(),
            )
        })
    # Borrowed from django.contrib.auth.decorators.user_passes_test()
    path = request.build_absolute_uri()
    resolved_login_url = resolve_url(settings.LOGIN_URL)
    # If the login url is the same scheme and net location then just
    # use the path as the "next" url.
    login_scheme, login_netloc = urlparse(resolved_login_url)[:2]
    current_scheme, current_netloc = urlparse(path)[:2]
    if (not login_scheme or login_scheme == current_scheme) and \
            (not login_netloc or login_netloc == current_netloc):
        path = request.get_full_path()
    from django.contrib.auth.views import redirect_to_login
    return redirect_to_login(path, resolved_login_url, REDIRECT_FIELD_NAME)


# @note: Currently is unused, because url permission middleware checks "permission_required" from urls.py kwargs.
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
    has_active = False
    for nav in navs:
        if 'atts' not in nav:
            nav['atts'] = {}
        if 'class' in nav['atts']:
            css_classes = nav['atts']['class'].split(' ')
            if 'active' in css_classes:
                has_active = True
        else:
            nav['atts']['class'] = ''
    if not has_active:
        # Select active nav tab according to request.path, if any.
        for nav in navs:
            is_active = False
            if callable(nav.get('is_active')):
                is_active = nav['is_active'](request, nav)
            else:
                is_active = nav['url'] == request.path
            if is_active:
                nav['atts']['class'] += ' active'
            nav['atts']['class'].strip()


# NavsList allows to pass extra props to templates, which enables further customization of menu,
# for example different css classes depending on menu / context.
# Ordinary Python list is supported by BsTabsMixin as well via prepare_bs_navs() function.
class NavsList(list):

    def set_props(self, props):
        if not hasattr(self, 'props'):
            self.props = {}
        if props is not None:
            self.props.update(props)

    def prepare(self, request):
        prepare_bs_navs(self, request)

    def __add__(self, other):
        result = NavsList(list(self) + list(other))
        result.set_props(getattr(self, 'props', None))
        result.set_props(getattr(other, 'props', None))
        return result


class PageContextMixin(TemplateResponseMixin, ContextMixin, View):

    # Has to be set to None in base class otherwise UrlPath() would fail.
    # Set to valid string in the ancestor class.
    action_kwarg = None
    view_title = None
    client_data = None
    client_routes = None
    custom_scripts = None
    page_context = None

    def get_view_title(self):
        return self.view_title

    def create_page_context(self):
        if self.page_context is None:
            self.page_context = create_page_context(request=self.request)
        return self.page_context

    def update_page_context(self, view_title=None, client_data=None, client_routes=None, custom_scripts=None):
        if view_title is not None:
            self.page_context.set_view_title(view_title)
        if client_data is not None:
            self.page_context.add_client_data(client_data)
        if client_routes is not None:
            self.page_context.add_client_routes(client_routes)
        if custom_scripts is not None:
            self.page_context.add_custom_scripts(*custom_scripts)
        return self.page_context

    def render_to_response(self, context, **response_kwargs):
        self.create_page_context()
        context['page_context'] = self.update_page_context(
            view_title=self.view_title,
            client_data=self.client_data,
            client_routes=self.client_routes,
            custom_scripts=self.custom_scripts
        )
        return super().render_to_response(context, **response_kwargs)

    def dispatch(self, request, *args, **kwargs):
        try:
            return super().dispatch(request, *args, **kwargs)
        except Exception as e:
            if isinstance(e, http.ImmediateHttpResponse):
                return e.response
            else:
                return http.exception_response(request, e)

    def request_get(self, key, default=None):
        if key in self.request.POST:
            return self.request.POST.get(key)
        else:
            return self.request.GET.get(key, default)

    def request_get_int(self, key, default=None, minval=None, maxval=None):
        try:
            result = int(self.request_get(key, default))
        except ValueError:
            return default
        if minval is not None and result < minval:
            result = minval
        if maxval is not None and result > maxval:
            result = maxval
        return result

    def request_get_json(self, key, default=None):
        try:
            result = self.request_get(key, default)
            if isinstance(result, str):
                result = json.loads(result)
            return result
        except ValueError:
            return default


# GET request usually generates html template, POST - returns AJAX viewmodels.
class ViewmodelView(TemplateResponseMixin, ContextMixin, View):

    # Add generic __init__() otherwise tpl.discover_grid_options() may break.
    # See also: https://code.djangoproject.com/ticket/21111
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    @ensure_annotations
    def process_error_viewmodel(self, viewmodel: dict):
        viewmodel.setdefault('view', 'alert_error')

    @ensure_annotations
    def process_error_vm_list(self, vms: vm_list):
        for vm in vms:
            self.process_error_viewmodel(vm)

    @ensure_annotations
    def process_success_viewmodel(self, viewmodel: dict):
        viewmodel.setdefault('view', 'alert')

    @ensure_annotations
    def process_success_vm_list(self, vms: vm_list):
        for vm in vms:
            self.process_success_viewmodel(vm)

    # Can be called as self.vm_error(*vm_list) or as self.vm_error(**viewmodel_kwargs).
    # todo: Optional error accumulation.
    def vm_error(self, *args, **kwargs):
        if 'ex' in kwargs:
            ex = kwargs.pop('ex')
            kwargs['messages'] = ex.messages if isinstance(ex, ValidationError) else [str(ex)]
        if len(kwargs) > 0:
            vms = vm_list(dict(**kwargs))
        else:
            if isinstance(args, dict):
                vms = vm_list(*args)
            else:
                vms = vm_list(
                    title=_('Error'),
                    message=args,
                )
        self.process_error_vm_list(vms)
        raise http.ImmediateJsonResponse(vms)

    def get_report_error(self, message, *args, **kwargs):
        title = kwargs.pop('title') if 'title' in kwargs else _('Error')
        raise http.ImmediateHttpResponse(
            format_html(
                '{title}: {message}', title=title, message=format_html(
                    _(message), *args, **kwargs
                )
            )
        )

    def post_report_error(self, message, *args, **kwargs):
        title = kwargs.pop('title') if 'title' in kwargs else _('Error')
        self.vm_error(
            # Do not remove view='alert_error' as child class may overload process_error_viewmodel() then supply wrong
            # viewmodel name.
            view='alert_error',
            title=title,
            message=format_html(_(message), *args, **kwargs)
        )

    # Respond with AJAX viewmodel (general non-form field error).
    def report_error(self, message, *args, **kwargs):
        http_method = self.request.method.lower()
        handler_name = f"{http_method}_report_error"
        handler = getattr(self, handler_name, None)
        if callable(handler):
            handler(message, *args, **kwargs)
        else:
            raise NotImplementedError(handler_name)

    def dispatch(self, request, *args, **kwargs):
        response = super().dispatch(request, *args, **kwargs)
        if isinstance(response, dict):
            response = vm_list(response)
        if isinstance(response, vm_list):
            self.process_success_vm_list(response)
        return http.conditional_json_response(response)


# Supports both ancestors of DetailView and KoGridView.
# DetailView and it's ancestors are supported automatically.
# For KoGridView, one has to override .get() method and call .format_title() with appropriate args.
class FormatTitleMixin(PageContextMixin):

    format_view_title = False

    def format_title(self, *args, **kwargs):
        if self.format_view_title:
            self.create_page_context().set_title_format_args(*args, **kwargs)

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
class BsTabsMixin(PageContextMixin):

    def get_main_navs(self, object_id=None):
        main_navs = NavsList()
        """
        from django.urls import reverse
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
            None if not hasattr(self, 'object') or self.object is None else self.object.pk
        )
        if isinstance(main_navs, NavsList):
            main_navs.prepare(self.request)
        else:
            prepare_bs_navs(main_navs, self.request)
        context_data['main_navs'] = main_navs
        return context_data


# Forms and forms fields AJAX viewmodel response.
class FormViewmodelsMixin(ViewmodelView):

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
        # Alternative version, different from FieldRenderer default rendering.
        """
        return {
            'view': 'popover_error',
            'id': bound_field.auto_id,
            'message': tpl.print_bs_labels(bound_field.errors)
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


# Model queryset filtering / ordering base.
class BaseFilterView(PageContextMixin):

    filter_key = 'list_filter'
    order_key = 'list_order_by'
    search_key = 'list_search'
    field_validator = FieldValidator

    # List of grid columns. Use '__all__' value to display all model fields as grid columns,
    # or specify the list of field names:
    #   str value: field name;
    #   tuple value: ('field', 'Column name') override model field 'verbose_name' displayed in column header;
    #   list value: compound column;
    grid_fields = None

    allowed_sort_orders = None
    allowed_filter_fields = None
    # None value of exclude_fields means that only raw values of model fields that are defined as grid_fields will be
    # returned to client-side grid to increase security.
    # Use empty list value to include all raw values of model fields to have pre version 0.4.1 behavior.
    exclude_fields = None
    search_fields = None
    model = None

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.pk_field = None
        # Query filter loaded from JSON. Field lookups are encoded as {'field': {'in': 1, 2, 3}}
        self.request_list_filter = {}
        # queryset.filter(*self.current_list_filter.args, **self.current_list_filter.kwargs)
        self.current_list_filter = FuncArgs()
        # queryset.order_by(*self.current_sort_order)
        self.current_sort_order = None
        self.current_stripped_sort_order = None
        self.current_search_str = ''
        self.grid_fields = None
        # Filtered names of grid_fields (no excluded field names)
        self.grid_fields_attnames = None
        # Verbose names of fields
        self.field_names = {}
        self.allowed_sort_orders = None
        self.allowed_filter_fields = None
        self.search_fields = None
        self.has_get_str_fields = False

    # yields flattened fields from possibly nested .grid_fields (optional compound columns)
    def yield_fields(self):
        for column in self.grid_fields:
            if isinstance(column, list):
                for field in column:
                    yield field
            else:
                yield column

    def yield_fields_attnames(self):
        for field_def in self.yield_fields():
            if isinstance(field_def, dict):
                yield field_def['field']
            elif isinstance(field_def, tuple):
                yield field_def[0]
            else:
                yield field_def

    def get_grid_fields_attnames(self):
        return [field for field in self.yield_fields_attnames() if field not in self.exclude_fields]

    def set_grid_fields(self):
        self.grid_fields_attnames = self.get_grid_fields_attnames()

    def has_grid_field(self, fieldname):
        return fieldname in self.get_grid_fields_attnames()

    def get_all_allowed_sort_orders(self):
        # If there are related grid fields explicitly defined in self.grid_fields attribute,
        # these will be automatically added to allowed sort orders.
        return self.get_all_fieldnames() if self.grid_fields is None else self.get_all_related_fields()

    def get_grid_fields(self):
        if self.__class__.grid_fields is None:
            grid_fields = []
        elif self.__class__.grid_fields == '__all__':
            grid_fields = self.get_all_fieldnames()
        else:
            grid_fields = self.__class__.grid_fields
        return grid_fields

    def get_related_fields(self, query_fields=None):
        if query_fields is None:
            query_fields = self.get_all_fieldnames()
        return list(set(self.grid_fields_attnames) - set(query_fields))

    # A superset of self.get_all_fieldnames() which also returns foreign related fields, if any.
    # It is used to automatically include related query fields / sort orders.
    def get_all_related_fields(self):
        query_fields = self.get_all_fieldnames()
        related_fields = self.get_related_fields(query_fields)
        query_fields.extend(related_fields)
        return query_fields

    def get_field_validator(self, fieldname):
        return self.field_validator(self, fieldname)

    def get_allowed_sort_orders(self):
        # Do not need to duplicate both accending and descending ('-' prefix) orders.
        # Both are counted in.
        if self.__class__.allowed_sort_orders is None:
            allowed_sort_orders = []
        elif self.__class__.allowed_sort_orders == '__all__':
            allowed_sort_orders = self.get_all_allowed_sort_orders()
        else:
            allowed_sort_orders = self.__class__.allowed_sort_orders
        return allowed_sort_orders

    def get_allowed_filter_fields(self):
        # Be careful about enabling filters.
        # key is field name (may be one to many related field as well)
        # value is the list of field choice tuples, as specified in model field 'choices' kwarg.
        if self.__class__.allowed_filter_fields is None:
            allowed_filter_fields = OrderedDict()
        else:
            allowed_filter_fields = self.__class__.allowed_filter_fields
        return allowed_filter_fields

    def get_exclude_fields(self):
        if self.__class__.exclude_fields is None:
            # Exclude model field values that are not specified as grid fields by default.
            exclude_fields = set(self.get_all_fieldnames()) - set(self.yield_fields_attnames())
            if self.pk_field in exclude_fields:
                exclude_fields.remove(self.pk_field)
        else:
            # Exclude only model fields specified by self.__class__.exclude_fields list.
            # Set to [] to include all fields.
            exclude_fields = self.__class__.exclude_fields
        return exclude_fields

    def get_search_fields(self):
        # (('field1', 'contains'), ('field2', 'icontains'), ('field3', ''))
        # Ordered dict is also supported with the same syntax.
        if self.__class__.search_fields is None:
            search_fields = ()
        else:
            search_fields = self.__class__.search_fields
        return search_fields

    def get_contenttype_filter(self, *apps_models):
        filter_choices = []
        for app_label, model in apps_models:
            ct = contenttypes.models.ContentType.objects.filter(app_label=app_label, model=model).first()
            filter_choices.append((ct.pk, ct.name))
        return filter_choices

    def get_all_fieldnames(self):
        return list(yield_model_fieldnames(self.model))

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
            str_fields = OrderedDict()
            user = getattr(self.request, 'user', None)
            for fieldname, v in ObjDict.from_obj(obj=obj, request_user=user).get_str_fields().items():
                if fieldname not in self.exclude_fields:
                    str_fields[fieldname] = v
            for fieldname in self.grid_fields_attnames:
                if '__' in fieldname:
                    rel_path = fieldname.split('__')
                    rel_str = get_nested(str_fields, rel_path)
                    if rel_str is not None:
                        str_fields[fieldname] = rel_str
            return str_fields
        else:
            return {}

    def setup(self, request, *args, **kwargs):
        super().setup(request, *args, **kwargs)

        for field in self.model._meta.fields:
            if field.primary_key:
                self.pk_field = field.attname
                break

        self.grid_fields = self.get_grid_fields()

        list_filter_str = self.request_get(self.filter_key)
        if list_filter_str is not None:
            try:
                self.request_list_filter = json.loads(list_filter_str)
                if not isinstance(self.request_list_filter, dict):
                    raise ValueError('request list_filter query argument JSON value must be a dict')
            except ValueError:
                self.report_error(
                    'Invalid value of list filter: {}', list_filter_str
                )

        self.exclude_fields = self.get_exclude_fields()
        self.set_grid_fields()
        self.allowed_sort_orders = self.get_allowed_sort_orders()
        self.allowed_filter_fields = self.get_allowed_filter_fields()
        self.search_fields = self.get_search_fields()

        self.has_get_str_fields = hasattr(self.model, 'get_str_fields')

    def get_field_verbose_name(self, field_name):
        if field_name in self.field_names:
            return self.field_names[field_name]
        else:
            # str() is used to avoid "<django.utils.functional.__proxy__ object> is not JSON serializable" error.
            return str(get_verbose_name(self.model, field_name))

    # Override in child class to customize output.
    def get_display_value(self, obj, field):
        if not hasattr(obj, '_display_value'):
            obj._display_value = self.get_row_str_fields(obj)
        normalized_field = normalize_fk_fieldname(field)
        field_val = get_related_field_val(obj, field)
        if isinstance(field_val, models.Model) and hasattr(field_val, 'get_absolute_url'):
            display_value = tpl.ModelLinker(request_user=self.request.user, obj=field_val).__html__()
        elif field in obj._display_value:
            display_value = obj._display_value[field]
        elif normalized_field in obj._display_value:
            display_value = obj._display_value[normalized_field]
        else:
            display_value = field_val
        if isinstance(display_value, dict):
            display_value = tpl.print_list_group(display_value.values())
        return display_value

    def ioc_field_filter(self, fieldname, vm_filter):
        raise NotImplementedError

    def build_field_filter(self, field_filter, canon_filter_def):
        return field_filter.build(canon_filter_def)

    def get_field_filter(self, fieldname):
        filter_def = self.allowed_filter_fields[fieldname]
        canon_filter_def = {}
        if isinstance(filter_def, (list, tuple)):
            canon_filter_def['choices'] = filter_def
        elif isinstance(filter_def, dict):
            canon_filter_def.update(filter_def)
        vm_filter = {
            'field': fieldname,
            'name': self.get_field_verbose_name(fieldname),
        }
        if canon_filter_def.get('type') is not None:
            vm_filter['type'] = canon_filter_def['type']
        else:
            if isinstance(canon_filter_def.get('choices'), (list, tuple)):
                vm_filter['type'] = 'choices'
            else:
                # Use FkGridFilter to select filter choices.
                # Autodetect widget.
                field_validator = self.get_field_validator(fieldname)
                vm_filter_autodetect = field_validator.detect_field_filter(canon_filter_def)
                if isinstance(vm_filter_autodetect, ValidationError):
                    vm_filter.update({
                        'type': 'error',
                        'ex': vm_filter_autodetect,
                    })
                else:
                    vm_filter.update(vm_filter_autodetect)
        field_filter = self.ioc_field_filter(fieldname, vm_filter)
        return self.build_field_filter(field_filter, canon_filter_def)

    def get_q_or(self, q_kwargs):
        q = None
        for k, v in q_kwargs.items():
            if q is None:
                q = models.Q(**{k: v})
            else:
                q |= models.Q(**{k: v})
        return q

    def get_filters(self):
        vm_filters = [self.get_field_filter(fieldname) for fieldname in self.allowed_filter_fields]
        return vm_filters

    def get_scalar_lookup_in(self, fieldname, lookup_filter, list_filter):
        field_lookup = fieldname + '__in'
        list_filter.kwargs[field_lookup] = [lookup_filter]

    def get_list_lookup_in(self, fieldname, lookup_filter, list_filter):
        field_lookup = fieldname + '__in'
        if len(lookup_filter) == 0:
            # None in lookup_filter is True
            list_filter.kwargs[f'{fieldname}__isnull'] = True
        # Todo: support arbitrary OR via pipeline character '|fieldname' prefix.
        elif len(lookup_filter) == 1:
            if None in lookup_filter:
                list_filter.args += (
                    self.get_q_or({
                        f'{fieldname}__isnull': True,
                        fieldname: lookup_filter[0],
                    }),
                )
            else:
                list_filter.kwargs[fieldname] = lookup_filter[0]
        else:
            if None in lookup_filter:
                list_filter.args += (
                    self.get_q_or({
                        f'{fieldname}__isnull': True,
                        field_lookup: lookup_filter,
                    }),
                )
            else:
                list_filter.kwargs[field_lookup] = lookup_filter

    def get_list_lookup_range(self, fieldname, lookup_filter, list_filter):
        field_lookup = fieldname + '__range'
        if len(lookup_filter) != 2:
            self.report_error(
                'Range lookup requires exactly two arguments: "{}"', lookup_filter
            )
        else:
            list_filter.kwargs[field_lookup] = lookup_filter

    def get_current_list_filter_multiple(self, fieldname, values):
        current_list_filter = FuncArgs()
        field_validator = self.get_field_validator(fieldname)
        field_validator.set_auto_id(None)
        for lookup, value in values.items():
            field_validator.set_auto_id(lookup)
            has_in_none = False
            if isinstance(value, list):
                lookup_filter = []
                for v in value:
                    result = field_validator.clean(v)
                    if result is None:
                        continue
                    cleaned_value, is_blank = result
                    if cleaned_value is None:
                        if lookup == 'in':
                            has_in_none = True
                    elif not is_blank:
                        lookup_filter.append(cleaned_value)
                if len(lookup_filter) == 0 and not has_in_none:
                    continue
                lookup_method = getattr(self, f'get_list_lookup_{lookup}', None)
                if callable(lookup_method):
                    lookup_method(fieldname, lookup_filter, current_list_filter)
                else:
                    self.report_error(
                        _("Invalid value of list filter: {}"), lookup_filter
                    )
                    # current_list_filter.kwargs[field_lookup] = lookup_filter
            else:
                result = field_validator.clean(value)
                if result is None:
                    continue
                lookup_filter, is_blank = result
                if is_blank:
                    continue
                lookup_method = getattr(self, f'get_scalar_lookup_{lookup}', None)
                if callable(lookup_method):
                    lookup_method(fieldname, lookup_filter, current_list_filter)
                else:
                    field_lookup = fieldname + '__' + lookup
                    current_list_filter.kwargs[field_lookup] = lookup_filter
        return current_list_filter

    def get_current_list_filter(self, request_list_filter):
        if not isinstance(request_list_filter, dict):
            self.report_error('Invalid type of list filter')
        current_list_filter = FuncArgs()
        for fieldname, values in request_list_filter.items():
            if fieldname not in self.allowed_filter_fields:
                self.report_error(
                    'Not allowed filter field: "{}"', fieldname
                )
            if not isinstance(values, dict):
                # Single value.
                field_validator = self.get_field_validator(fieldname)
                field_validator.set_auto_id(None)
                result = field_validator.clean(values)
                if result is None:
                    continue
                cleaned_value, is_blank = result
                if is_blank:
                    continue
                if cleaned_value is None:
                    current_list_filter.kwargs[f'{fieldname}__isnull'] = True
                else:
                    current_list_filter.kwargs[fieldname] = cleaned_value
            else:
                # Multiple lookups and / or multiple values.
                sub_filter = self.get_current_list_filter_multiple(fieldname, values)
                current_list_filter.add(sub_filter)
        return current_list_filter

    def get_current_query(self):
        sort_order = self.request_get(self.order_key)
        if sort_order is not None:
            try:
                sort_order = json.loads(sort_order)
            except ValueError:
                self.report_error(
                    'Invalid value of sorting order: {}', sort_order
                )
            if not isinstance(sort_order, list):
                sort_order = [sort_order]
            self.current_stripped_sort_order = self.strip_sort_order(sort_order)
            self.current_sort_order = sort_order

        self.current_list_filter = self.get_current_list_filter(self.request_list_filter)

        self.current_search_str = self.request_get(self.search_key, '')

    def strip_sort_order(self, sort_order):
        if not isinstance(sort_order, list):
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
        if self.current_sort_order is None or len(self.current_sort_order) == 0:
            return queryset
        return queryset.order_by(*self.current_sort_order)

    def filter_queryset(self, queryset):
        return self.current_list_filter.apply(queryset.filter)

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
        self.get_current_query()
        try:
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
        except FieldError as e:
            self.report_error(str(e))
