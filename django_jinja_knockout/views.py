from collections import OrderedDict
from copy import copy
import json
from math import ceil
import traceback
from ensure import ensure_annotations

from django.core.exceptions import ValidationError
from django.conf import settings
from django.utils.encoding import force_text
from django.utils.html import format_html, escape
from django.forms.utils import flatatt
from django import forms
from django.utils.six.moves.urllib.parse import urlparse
from django.utils.translation import gettext as _, ugettext as _u
from django.utils.decorators import method_decorator
from django.http import HttpResponseRedirect, HttpResponseBadRequest, JsonResponse
from django.template import loader as tpl_loader
from django.db import models
from django.views.generic.base import View
from django.views.generic import TemplateView, DetailView, ListView, UpdateView
from django.shortcuts import resolve_url
from django.contrib.auth import REDIRECT_FIELD_NAME
from django.contrib.contenttypes.models import ContentType

from . import tpl as qtpl
from .models import (
    normalize_fk_fieldname, get_meta, get_verbose_name, get_related_field,
    yield_model_fieldnames, model_values, get_object_description
)
from .viewmodels import vm_list
from .utils.sdv import yield_ordered, get_object_members, get_nested


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


class FoldingPaginationMixin:

    always_visible_links = False
    delta_visible_pages = 3

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.selected_pages = []

    def add_page(self, page_num, is_active, link_text):
        self.selected_pages.append((page_num, is_active, link_text))

    # is_active = True means page is selected (current or meaningless to click) thus is not clickable.
    def add_clickable_page(self, page_num, is_active, link_text):
        if self.__class__.always_visible_links or not is_active:
            self.selected_pages.append((page_num, is_active, link_text))

    def get_context_data(self, **kwargs):
        context_data = super().get_context_data(**kwargs)
        page_obj = context_data['page_obj']

        starting_page = page_obj.number - self.__class__.delta_visible_pages
        if starting_page < 1:
            starting_page = 1

        ending_page = starting_page + self.__class__.delta_visible_pages * 2
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
            self.request.view_title = self.request.view_title.format(*args)
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


class FormDetailView(FormatTitleMixin, UpdateView):

    template_name = 'form_detail_view.htm'


# Automatic template context processor for bs_navs() jinja2 macro. #
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


# See also https://github.com/AndrewIngram/django-extra-views
class FormWithInlineFormsetsMixin(FormViewmodelsMixin):
    # @note: Required to define ONLY when form_with_inline_formsets has FormClass is None
    # ("edit many related formsets without master form" mode).
    form_with_inline_formsets = None

    def get_form_action_url(self):
        return ''

    # Do not just remove bs_form() options.
    # BootstrapDialog panel might render with overlapped layout without these options.
    def get_bs_form_opts(self):
        return {}
        """
        return {
            'is_ajax': True,
            'layout_classes': {
                'label': 'col-md-4',
                'field': 'col-md-6'
            }
        }
        """

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
            return self.ajax_form_invalid(form, formsets)
        else:
            return self.render_to_response(
                self.get_context_data(form=self.ff.form, formsets=self.ff.formsets)
            )

    def get_object_from_url(self):
        raise NotImplementedError('Abstract method')

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


class InlineCreateView(FormWithInlineFormsetsMixin, FormatTitleMixin, TemplateView):

    template_name = 'cbv_edit_inline.htm'

    def get_form_with_inline_formsets(self, request):
        return self.__class__.form_with_inline_formsets(request, create=True)

    def get_object_from_url(self):
        return None


# @note: Suitable both for CREATE and for VIEW actions (via form metaclass=DisplayModelMetaclass).
class InlineDetailView(FormatTitleMixin, FormWithInlineFormsetsMixin, DetailView):

    template_name = 'cbv_edit_inline.htm'


# Used to validate values of submitted filter fields.
class FieldValidator:

    field_types = (
        # Order is important, because DateTimeField is ancestor of DateField.
        ('DateTimeField', None),
        ('DateField', None),
        ('DecimalField', None)
    )

    def __init__(self, view, fieldname, model_class=None):
        self.view = view
        self.model_field = get_related_field(view.model if model_class is None else model_class, fieldname)
        self.form_field, self.field_filter_type = self.get_form_field()

    def get_form_field(self):
        for model_field_type, form_field_type in self.__class__.field_types:
            model_field = getattr(models, model_field_type)
            if isinstance(self.model_field, model_field):
                field_filter_type = model_field_type.lower().split('field')[0]
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
                self.view.error({
                        'view': self.view.__class__.viewmodel_name,
                        'has_errors': True,
                    },
                    self.view.get_field_error_viewmodel(self.form_field)
                )

    # Detect type of filter.
    # Override in child class to add new type of custom filters.
    # Implement "App.ko.Grid.iocKoFilter_custom_type" method at client-side.
    def detect_field_filter(self, filter_def):
        if self.field_filter_type is not None:
            return {
                'type': self.field_filter_type
            }
        elif isinstance(self.model_field, models.ForeignKey):
            # Use App.ko.FkGridFilter to select filter choices.
            return {
                'type': 'fk',
                'multiple_choices': True
            }
        elif isinstance(self.model_field, models.BooleanField):
            filter_def['choices'] = (
                (True, _('Yes')),
                (False, _('No'))
            )
            return {
                'type': 'choices'
            }
        elif hasattr(self.model_field, 'choices'):
            filter_def['choices'] = self.model_field.choices
            return {
                'type': 'choices',
            }
        else:
            self.view.report_error(
                'Cannot determine filter type of field "{}"'.format(str(self.model_field))
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
        # queryset.filter(**self.current_list_filter)
        self.current_list_filter = None
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

    # Respond with exception (non-AJAX mode).
    def report_error(self, message, *args, **kwargs):
        raise ValueError(message.format(*args, **kwargs))

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
    def get_row_str_fields(self, obj, row={}):
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

        if cls.allowed_filter_fields is None:
            self.allowed_filter_fields = self.get_allowed_filter_fields()
        else:
            self.allowed_filter_fields = cls.allowed_filter_fields

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
                'value': None,
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
        if isinstance(filter_def, dict):
            canon_filter_def.update(filter_def)
        # Autodetect widget.
        vm_filter = self.get_field_filter(fieldname, canon_filter_def)
        process_method = getattr(self, 'process_field_filter_{}'.format(vm_filter['type']), None)
        if callable(process_method):
            process_method(vm_filter, canon_filter_def)
        if 'multiple_choices' in canon_filter_def:
            vm_filter['multiple_choices'] = canon_filter_def['multiple_choices']
        return vm_filter

    def get_filters(self):
        vm_filters = [self.get_filter(fieldname) for fieldname in self.allowed_filter_fields]
        return vm_filters

    def get_current_list_filter(self, list_filter):
        if type(list_filter) is not dict:
            self.report_error('List of filters must be dictionary: {0}', list_filter)
        current_list_filter = {}
        for fieldname, values in list_filter.items():
            if fieldname not in self.allowed_filter_fields:
                self.report_error('Non-allowed filter field: {0}', fieldname)
            field_validator = self.get_field_validator(fieldname)
            if not isinstance(values, dict):
                # Single value.
                field_validator.set_auto_id(None)
                cleaned_value, is_blank = field_validator.clean(values)
                if is_blank:
                    continue
                current_list_filter[fieldname] = cleaned_value
            else:
                # Multiple lookups and / or multiple values.
                for lookup, value in values.items():
                    field_validator.set_auto_id(lookup)
                    field_lookup = fieldname + '__' + lookup
                    if isinstance(value, list):
                        lookup_filter = []
                        for v in value:
                            cleaned_value, is_blank = field_validator.clean(v)
                            if not is_blank:
                                lookup_filter.append(cleaned_value)
                        if len(lookup_filter) == 0:
                            continue
                    else:
                        lookup_filter, is_blank = field_validator.clean(value)
                        if is_blank:
                            continue
                    if lookup == 'in':
                        if isinstance(lookup_filter, list):
                            if len(lookup_filter) == 1:
                                current_list_filter[fieldname] = lookup_filter[0]
                            else:
                                current_list_filter[field_lookup] = lookup_filter
                        else:
                            current_list_filter[fieldname] = lookup_filter
                    else:
                        current_list_filter[field_lookup] = lookup_filter
        return current_list_filter

    def get_current_query(self):
        sort_order = self.request_get(self.__class__.order_key)
        if sort_order is not None:
            sort_order = json.loads(sort_order)
            if not isinstance(sort_order, list):
                sort_order = [sort_order]
            self.current_stripped_sort_order = self.strip_sort_order(sort_order)
            self.current_sort_order = sort_order

        list_filter = self.request_get(self.__class__.filter_key)
        if list_filter is not None:
            self.current_list_filter = self.get_current_list_filter(json.loads(list_filter))

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
            self.report_error('Non-allowed sorting order: {0}', stripped_order)
        return stripped_order

    def order_queryset(self, queryset):
        if self.current_sort_order is None:
            return queryset
        return queryset.order_by(*self.current_sort_order)

    def filter_queryset(self, queryset):
        if self.current_list_filter is None or len(self.current_list_filter) == 0:
            return queryset
        else:
            return queryset.filter(**self.current_list_filter)

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


# Traditional server-side (non-AJAX) generated filtered / sorted ListView.
class ListSortingView(FoldingPaginationMixin, BaseFilterView, ListView):

    paginate_by = getattr(settings, 'OBJECTS_PER_PAGE', 10)
    template_name = 'cbv_list.htm'

    def get_heading(self):
        return get_meta(self.__class__.model, 'verbose_name_plural')

    def get_json_order_result(self, sort_order):
        return {
            self.__class__.order_key: json.dumps(
                sort_order[0] if len(sort_order) == 1 else sort_order
            )
        }

    def get_current_sort_order_querypart(self, query={}):
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

    def get_negate_sort_order_querypart(self, sort_order, query={}):
        if sort_order is None:
            return query
        stripped_sort_order = self.strip_sort_order(sort_order)
        if self.current_sort_order == sort_order:
            # Negate current sort order.
                sort_order = [self.negate_sort_order_key(order_key) for order_key in sort_order]
        result = self.get_json_order_result(sort_order)
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

    def render_filter_choices(self, filter_field, vm_filter):
        curr_list_filter = copy(self.current_list_filter)
        navs = []
        display = []
        for choice_def in vm_filter['choices']:
            if choice_def['value'] is None:
                # Reset filter.
                link = {'atts': {}}
                if self.current_list_filter is None:
                    link['atts']['class'] = 'active'
                    curr_list_filter = {}
                elif filter_field in curr_list_filter:
                    del curr_list_filter[filter_field]
                else:
                    link['atts']['class'] = 'active'
                link.update({
                    'url': qtpl.reverseq(
                        self.request.url_name,
                        kwargs=self.kwargs,
                        query=self.get_current_sort_order_querypart(
                            query=self.get_list_filter_querypart(
                                list_filter=curr_list_filter
                            )
                        )
                    ),
                    'text': _('All')
                })
            else:
                curr_list_filter[filter_field] = choice_def['value']
                link = {
                    'url': qtpl.reverseq(
                        self.request.url_name,
                        kwargs=self.kwargs,
                        query=self.get_current_sort_order_querypart(
                            query=self.get_list_filter_querypart(
                                list_filter=curr_list_filter
                            )
                        )
                    ),
                    'text': choice_def['name'],
                    'atts': {}
                }
            if self.has_current_filter(filter_field, choice_def['value']):
                display.append(choice_def['name'])
                link['atts']['class'] = 'active'
            navs.append(link)
        return navs, display

    # Get current filter links suitable for bs_navs() or bs_breadcrumbs() template.
    # Currently supports only filter fields of type='choices'.
    # Todo: Implement more non-AJAX filter types (see KoGridView AJAX implementation).
    def get_filter_navs(self, filter_field):
        vm_filter = self.get_filter(filter_field)
        process_method = getattr(self, 'render_filter_{}'.format(vm_filter['type']), None)
        return process_method(filter_field, vm_filter)

    def get_sort_order_link(self, sort_order, kwargs=None, query={}, text=None, viewname=None):
        if type(sort_order) is str:
            sort_order = [sort_order]
        if kwargs is None:
            kwargs = self.kwargs
        if viewname is None:
            viewname = self.request.url_name
        if text is None:
            text = self.get_field_verbose_name(sort_order[0])
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
            'filter_title': {},
            'filter_navs': {},
            'filter_display': {}
        })
        for fieldname in self.allowed_filter_fields:
            context_data['filter_title'][fieldname] = self.get_field_verbose_name(fieldname)
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

    # Respond with AJAX viewmodel (general non-form field error).
    def report_error(self, message, *args, **kwargs):
        title = kwargs.pop('title') if 'title' in kwargs else _('Error')
        self.error(
            # Do not remove view='alert_error' as child class may overload process_error_viewmodel() then supply wrong
            # viewmodel name.
            view='alert_error',
            title=title,
            message=message.format(*args, **kwargs)
        )

    def dispatch(self, request, *args, **kwargs):
        result = super().dispatch(request, *args, **kwargs)
        if type(result) is dict:
            result = vm_list(result)
        if type(result) is vm_list:
            self.process_success_vm_list(result)
        return result


class GridActionsMixin:

    viewmodel_name = 'grid_page'
    action_kwarg = 'action'
    form = None
    formset = None
    form_with_inline_formsets = None
    enable_deletion = False
    mark_safe_fields = None

    def get_model_meta(self, key):
        return get_meta(self.__class__.model, key)

    # Create one model object.
    def get_create_form(self):
        return self.__class__.form

    # Edit one model object.
    def get_edit_form(self):
        return self.__class__.form

    # Edit multiple selected model objects.
    def get_edit_formset(self):
        return self.__class__.formset

    # Create one model object with related objects.
    def get_create_form_with_inline_formsets(self):
        return self.__class__.form_with_inline_formsets

    # Edit one model object with related objects.
    def get_edit_form_with_inline_formsets(self):
        return self.__class__.form_with_inline_formsets

    def get_actions(self):
        return {
            'built_in': OrderedDict([
                ('meta', {
                    'enabled': True
                }),
                ('list', {
                    'enabled': True
                }),
                ('update', {
                    'enabled': True
                }),
                ('meta_list', {
                    'enabled': True
                }),
                ('save_form', {
                    'enabled': True
                }),
                ('save_inline', {
                    'enabled': True
                }),
                ('delete_confirmed', {
                    'enabled': self.__class__.enable_deletion
                })
            ]),
            'button': OrderedDict([
                # Extendable UI actions (has 'type' key).
                ('create_form', {
                    'localName': _('Add'),
                    'class': {
                        'button': 'btn-primary',
                        'glyphicon': 'glyphicon-plus'
                    },
                    'enabled': any([
                        self.get_create_form()
                    ])
                }),
                ('create_inline', {
                    'localName': _('Add'),
                    'class': {
                        'button': 'btn-primary',
                        'glyphicon': 'glyphicon-plus'
                    },
                    'enabled': any([
                        self.get_create_form_with_inline_formsets()
                    ])
                })
            ]),
            'click': OrderedDict([
                ('edit_form', {
                    'localName': _('Change'),
                    'class': 'btn-primary',
                    'enabled': any([
                        self.get_edit_form()
                    ])
                }),
                ('edit_inline', {
                    'localName': _('Change'),
                    'class': 'btn-primary',
                    'enabled': any([
                        self.get_edit_form_with_inline_formsets()
                    ])
                }),
                ('edit_formset', {
                    'localName': _('Change'),
                    'class': 'btn-primary',
                    'enabled': any([
                        self.get_edit_formset()
                    ])
                })
            ]),
            'glyphicon': OrderedDict([
                # Delete one or many model object.
                ('delete', {
                    'localName': _('Remove'),
                    'class': 'glyphicon-remove',
                    'enabled': self.__class__.enable_deletion
                })
            ])
        }

    def get_current_action_name(self):
        return self.kwargs.get(self.__class__.action_kwarg, '').strip('/')

    # Add extra kwargs here if these are defined in urls.py.
    def get_view_kwargs(self):
        return copy(self.kwargs)

    def get_action_url(self, action, query={}):
        kwargs = self.get_view_kwargs()
        kwargs[self.__class__.action_kwarg] = '/{}'.format(action)
        return qtpl.reverseq(
            self.request.url_name,
            kwargs=kwargs,
            query=query
        )

    def get_action(self, action_name):
        for type, actions_list in self.actions.items():
            if action_name in actions_list:
                return actions_list[action_name]
        return None

    def get_action_local_name(self, action_name=None):
        if action_name is None:
            action_name = self.current_action_name
        action = self.get_action(action_name)
        return action['localName'] if action is not None and 'localName' in action else action_name

    def action_is_denied(self):
        self.report_error(
            title=_('Action is denied'),
            message=format_html(
                _('Action "{}" is denied'), self.current_action_name
            )
        )

    def action_not_implemented(self):
        self.report_error(
            title=_('Unknown action'),
            message=format_html(
                _('Action "{}" is not implemented'), self.get_action_local_name()
            )
        )

    def get_object_for_action(self):
        return self.__class__.model.objects.filter(pk=self.request_get('pk_val')).first()

    def get_queryset_for_action(self):
        pks = self.request.POST.getlist('pk_vals[]')
        if len(pks) == 0:
            pks = [self.request_get('pk_val')]
        return self.__class__.model.objects.filter(pk__in=pks)

    def vm_form(self, form, verbose_name=None, form_action='save_form', action_query={}):
        t = tpl_loader.get_template('bs_form.htm')
        form_html = t.render(request=self.request, context={
            '_render_': True,
            'form': form,
            'action': self.get_action_url(form_action, query=action_query),
            'opts': self.get_bs_form_opts()
        })
        if verbose_name is None:
            verbose_name = get_verbose_name(form.Meta.model)
        return vm_list({
            'view': self.__class__.viewmodel_name,
            'last_action': form_action,
            'title': format_html('{}: {}',
                self.get_action_local_name(),
                verbose_name
            ),
            'message': form_html
        })

    def action_create_form(self):
        form = self.get_create_form()()
        return self.vm_form(form)

    def action_edit_form(self):
        obj = self.get_object_for_action()
        form = self.get_edit_form()(instance=obj)
        return self.vm_form(
            form, verbose_name=self.render_object_desc(obj), action_query={'pk_val': obj.pk}
        )

    def vm_inline(self, ff, verbose_name=None, form_action='save_inline', action_query={}):
        t = tpl_loader.get_template('bs_inline_formsets.htm')
        ff_html = t.render(request=self.request, context={
            '_render_': True,
            'form': ff.form,
            'formsets': ff.formsets,
            'action': self.get_action_url(form_action, query=action_query),
            'html': self.get_bs_form_opts()
        })
        if verbose_name is None:
            verbose_name = get_verbose_name(ff.__class__.FormClass.Meta.model)
        return vm_list({
            'view': self.__class__.viewmodel_name,
            'last_action': form_action,
            'title': format_html('{}: {}',
                self.get_action_local_name(),
                verbose_name
            ),
            'message': ff_html
        })

    def action_create_inline(self):
        ff = self.get_create_form_with_inline_formsets()(self.request)
        ff.get()
        return self.vm_inline(ff)

    def action_edit_inline(self):
        obj = self.get_object_for_action()
        ff = self.get_edit_form_with_inline_formsets()(self.request)
        ff.get(instance=obj)
        return self.vm_inline(
            ff, verbose_name=self.render_object_desc(obj), action_query={'pk_val': obj.pk}
        )

    def get_object_desc(self, obj):
        return get_object_description(obj)

    def get_objects_descriptions(self, objects):
        return [self.get_object_desc(obj) for obj in objects]

    def render_object_desc(self, obj):
        return qtpl.print_bs_badges(self.get_object_desc(obj))

    def get_title_action_not_allowed(self):
        return _('Action "%(action)s" is not allowed') % \
               {'action': self.get_action_local_name()}

    def action_delete_is_allowed(self, objects):
        return True

    def action_delete(self):
        objects = self.get_queryset_for_action()
        viewmodel = {
            'view': self.__class__.viewmodel_name,
            'description': self.get_objects_descriptions(objects),
        }
        if self.action_delete_is_allowed(objects):
            viewmodel.update({
                'title': format_html('{}',
                     self.get_action_local_name()
                ),
                'pkVals': list(objects.values_list('pk', flat=True))
            })
        else:
            viewmodel.update({
                'has_errors': True,
                'title': self.get_title_action_not_allowed()
            })
        return vm_list(viewmodel)

    def action_delete_confirmed(self):
        objects = self.get_queryset_for_action()
        pks = list(objects.values_list('pk', flat=True))
        if self.action_delete_is_allowed(objects):
            objects.delete()
            return vm_list({
                'view': self.__class__.viewmodel_name,
                'deleted_pks': pks
            })
        else:
            return vm_list({
                'view': self.__class__.viewmodel_name,
                'has_errors': True,
                'title': self.get_title_action_not_allowed(),
                'description': self.get_objects_descriptions(objects)
            })

    # Supports both 'create_form' and 'edit_form' actions.
    def action_save_form(self):
        old_obj = self.get_object_for_action()
        form_class = self.get_create_form() if old_obj is None else self.get_edit_form()
        form = form_class(self.request.POST, instance=old_obj)
        if form.is_valid():
            vm = {'view': self.__class__.viewmodel_name}
            if form.has_changed():
                new_obj = form.save()
                row = self.postprocess_row(
                    self.get_model_row(new_obj),
                    new_obj
                )
                if old_obj is None:
                    vm['prepend_rows'] = [row]
                else:
                    vm['update_rows'] = [row]
            return vm_list(vm)
        else:
            form_vms = vm_list()
            self.add_form_viewmodels(form, form_vms)
            return form_vms

    # Supports both 'create_inline' and 'edit_inline' actions.
    def action_save_inline(self):
        old_obj = self.get_object_for_action()
        if old_obj is None:
            ff_class = self.get_create_form_with_inline_formsets()
        else:
            ff_class = self.get_edit_form_with_inline_formsets()
        ff = ff_class(self.request, create=old_obj is None)
        new_obj = ff.save(instance=old_obj)
        if new_obj is not None:
            vm = {'view': self.__class__.viewmodel_name}
            if ff.has_changed():
                row = self.postprocess_row(
                    self.get_model_row(new_obj),
                    new_obj
                )
                if old_obj is None:
                    vm['prepend_rows'] = [row]
                else:
                    vm['update_rows'] = [row]
            return vm_list(vm)
        else:
            return self.ajax_form_invalid(ff.form, ff.formsets)

    def vm_get_grid_fields(self):
        vm_grid_fields = []
        if not isinstance(self.grid_fields, list):
            self.report_error('grid_fields must be list')
        for field_def in self.grid_fields:
            if type(field_def) is tuple:
                field, name = field_def
            elif type(field_def) is str:
                field = field_def
                name = self.get_field_verbose_name(field)
            else:
                self.report_error('grid_fields list values must be str or tuple')
            vm_grid_fields.append({
                'field': field,
                'name': name
            })
        return vm_grid_fields

    # Converts OrderedDict to list of dicts for each action type because JSON / Javascript does not support dict
    # ordering, to preserve visual ordering of actions.
    def vm_get_actions(self):
        vm_actions = {}
        for action_type, actions_list in self.actions.items():
            if action_type not in vm_actions:
                vm_actions[action_type] = []
            for action_name, action in actions_list.items():
                action['name'] = action_name
                vm_actions[action_type].append(action)
        return vm_actions

    def action_meta(self):
        pk_field = ''
        for field in self.__class__.model._meta.fields:
            if field.primary_key:
                pk_field = field.attname
                break
        vm = {
            'view': self.__class__.viewmodel_name,
            'action_kwarg': self.__class__.action_kwarg,
            'sortOrders': self.allowed_sort_orders,
            'meta': {
                'hasSearch': len(self.search_fields) > 0,
                'pkField': pk_field,
                # str() is used because django.contrib.auth.models.User uses instances of
                # django.utils.functional.lazy.<locals>.__proxy__ object, which are not JSON serializable.
                'verboseName': str(self.get_model_meta('verbose_name')),
                'verboseNamePlural': str(self.get_model_meta('verbose_name_plural'))
            },
            'actions': self.vm_get_actions(),
            'gridFields': self.vm_get_grid_fields(),
            'filters': self.get_filters()
        }
        ordering = [
            {ordering.lstrip('-'): '-' if ordering.startswith('-') else '+'}
            for ordering in self.get_model_meta('ordering')
        ]
        # todo: support multiple order_by.
        if len(ordering) == 1 and list(ordering[0].keys())[0] in self.allowed_sort_orders:
            vm['meta']['orderBy'] = ordering[0]
        if self.__class__.force_str_desc:
            vm['meta']['strDesc'] = self.__class__.force_str_desc
        if self.__class__.mark_safe_fields is not None:
            vm['markSafe'] = self.__class__.mark_safe_fields
        return vm

    def action_list(self):
        rows = self.get_rows()
        vm = {
            'view': self.__class__.viewmodel_name,
            'entries': list(rows),
            'totalPages': ceil(self.total_rows / self.__class__.objects_per_page),
        }
        return vm

    def action_update(self):
        vm = self.action_list()
        vm['update'] = True
        return vm

    def action_meta_list(self):
        vm = self.action_meta()
        vm.update(self.action_list())
        return vm


# Knockout.js ko-grid.js filtered / sorted ListView.
#
# In urls.py define
#     url(r'^my-model-grid(?P<action>/?\w*)/$', MyModelGrid.as_view(), name='my_model_grid')
# To browse specified Django model.
#
# HTTP GET response is HTML generated from template_name, which has Javascript component html.
# It is optional and is not required.
#
# HTTP POST response is AJAX JSON for App.ko.Grid / App.FkGridWidget Javascript components.
#
class KoGridView(ViewmodelView, BaseFilterView, GridActionsMixin, FormViewmodelsMixin):

    context_object_name = 'model'
    template_name = 'cbv_grid.htm'
    model = None
    # query all fields by default.
    query_fields = None
    current_page = 1
    objects_per_page = getattr(settings, 'OBJECTS_PER_PAGE', 10)
    force_str_desc = False

    # Override in child class to set default value of ko_grid() Jinja2 macro 'grid_options' argument.
    @classmethod
    def get_default_grid_options(cls):
        return {}

    # It is possible to get related fields:
    # https://code.djangoproject.com/ticket/5768
    # https://github.com/django/django/commit/9b432cb67b
    # Also, one may override self.get_base_queryset() to include .select_related() for performance optimization.
    def get_query_fields(self):
        return self.get_all_related_fields()

    def get_allowed_filter_fields(self):
        return OrderedDict()

    @classmethod
    def init_class(cls, self):
        super(KoGridView, cls).init_class(self)

        if cls.query_fields is None:
            self.query_fields = self.get_query_fields()
        else:
            self.query_fields = cls.query_fields

    def get_filters(self):
        if not isinstance(self.allowed_filter_fields, OrderedDict):
            self.report_error('KoGridView.allowed_filter_fields must be instance of OrderedDict')
        return super().get_filters()

    def object_from_row(self, row):
        row_related = {}
        related_fields = self.get_related_fields()
        for related_field in related_fields:
            row_related[related_field] = row.pop(related_field)
        obj = self.__class__.model(**row)
        for field, value in row_related.items():
            row[field] = value
        return obj

    def get_model_fields(self):
        return self.query_fields

    def get_model_row(self, obj):
        return model_values(obj, self.get_model_fields(), strict_related=False)

    # Will add special '__str_fields' key if model class has get_str_fields() method, which should return the dictionary where
    # the keys are field names while the values are Django-formatted display values (not raw values).
    def postprocess_row(self, row, obj):
        str_fields = self.get_row_str_fields(obj, row)
        if str_fields is None or self.__class__.force_str_desc:
            row['__str'] = str(obj)
        if str_fields is not None:
            row['__str_fields'] = str_fields
        return row

    def get_rows(self):
        page_num = self.request_get('page', 1)
        try:
            page_num = int(page_num)
        except:
            self.report_error(
                title='Invalid page number',
                message=format_html('Page number: {}', page_num)
            )
        if page_num > 0:
            first_elem = (page_num - 1) * self.__class__.objects_per_page
            last_elem = first_elem + self.__class__.objects_per_page
        else:
            first_elem = last_elem = 0
        qs = self.get_queryset()
        self.total_rows = qs.count()
        return [
            self.postprocess_row(row, self.object_from_row(row))
            for row in qs[first_elem:last_elem].values(*self.query_fields)
        ]

    def postprocess_qs(self, qs):
        return [
            self.postprocess_row(self.get_model_row(obj), obj) for obj in qs
        ]

    # Do not just remove bs_form() options.
    # BootstrapDialog panel might render with overlapped layout without these options.
    def get_bs_form_opts(self):
        return {
            'is_ajax': True,
            'layout_classes': {
                'label': 'col-md-4',
                'field': 'col-md-6'
            }
        }

    def get(self, request, *args, **kwargs):
        request.client_routes.append(request.url_name)
        return super().get(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        self.actions = self.get_actions()
        self.request = request
        self.args = args
        self.kwargs = kwargs
        self.current_action_name = self.get_current_action_name()
        if self.current_action_name == '':
            self.current_action_name = 'list'
        current_action = self.get_action(self.current_action_name)
        if current_action is None:
            handler = self.action_not_implemented
        elif current_action['enabled']:
            handler = getattr(self, 'action_{}'.format(self.current_action_name), self.action_not_implemented)
        else:
            handler = self.action_is_denied
        return handler()

    def get_base_queryset(self):
        return self.__class__.model.objects.all()


class KoGridInline(KoGridView):

    template_name = 'cbv_grid_inline.htm'
