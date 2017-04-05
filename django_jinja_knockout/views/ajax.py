from collections import OrderedDict
from copy import copy
from math import ceil
from ensure import ensure_annotations

from django.conf import settings
from django.utils.html import format_html
from django.utils.translation import gettext as _
from django.template import loader as tpl_loader
from django.views.generic import TemplateView

from ..utils import sdv
from .. import tpl as qtpl
from ..models import (
    get_meta, get_verbose_name, model_fields_verbose_names, model_values, get_object_description, yield_related_models
)
from ..viewmodels import vm_list
from .base import BaseFilterView, FormViewmodelsMixin


class ViewmodelView(TemplateView):

    @ensure_annotations
    def process_error_viewmodel(self, viewmodel: dict):
        if 'view' not in viewmodel:
            viewmodel['view'] = 'alert_error'

    @ensure_annotations
    def process_error_vm_list(self, vms: vm_list):
        for vm in vms:
            self.process_error_viewmodel(vm)

    @ensure_annotations
    def process_success_viewmodel(self, viewmodel: dict):
        if 'view' not in viewmodel:
            viewmodel['view'] = 'alert'

    @ensure_annotations
    def process_success_vm_list(self, vms: vm_list):
        for vm in vms:
            self.process_success_viewmodel(vm)

    # Can be called as self.error(*vm_list) or as self.error(**viewmodel_kwargs).
    # todo: Optional error accumulation.
    def error(self, *args, **kwargs):
        from ..middleware import ImmediateJsonResponse
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
            message=format_html(_(message), *args, **kwargs)
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
    show_nested_fieldnames = True
    # Currently is used only to get verbose / localized foreign key field names and is not required to be filled.
    # Relation in queries are followed automatically via Django ORM.
    # Set to dict with key fieldname: value related_model to use prefixed field names,
    # Set to list of two-element tuples to use duplicate prefixed field names for related models (eg. generic relationships).
    # Set to list of related models to use non-prefixed root field names.
    # See also .get_related_model_fields_verbose_names() and App.ko.GridColumnOrder.renderRowValue() implementations.
    related_models = None

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
            'last_action': form_action,
            'title': format_html(
                '{}: {}',
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
            'last_action': form_action,
            'title': format_html(
                '{}: {}',
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

    # Used to get local verbose names of the foreign fields.
    def get_related_models(self):
        if self.related_models is None:
            related_models = {}
            for field_name, related_model in yield_related_models(self.model, self.get_all_related_fields()):
                related_models[field_name] = related_model
            return related_models
        else:
            return self.related_models

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
            'description': self.get_objects_descriptions(objects),
        }
        if self.action_delete_is_allowed(objects):
            viewmodel.update({
                'title': format_html('{}', self.get_action_local_name()),
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
                'deleted_pks': pks
            })
        else:
            return vm_list({
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
            vm = {}
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
            vm = {}
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

    def get_model_fields_verbose_names(self, field_name_prefix=None, model=None):
        if model is None:
            model = self.model
        verbose_names = model_fields_verbose_names(model)
        if field_name_prefix is not None and not isinstance(field_name_prefix, int):
            # Use prefixed field names to disambiguate possible different related models with the same field name.
            verbose_names = {
                field_name_prefix + '›' + k: v for k, v in verbose_names.items()
            }
        return verbose_names

    # Collect field names verbose_name or i18n of field names from related model classes when available.
    # These usually are stored into App.ko.Grid.meta.fkNestedListOptions.i18n
    def get_related_model_fields_verbose_names(self):
        # Grid model fields are not rendered as nested fields in grid, thus are not included into result of this call.
        related_verbose_names = {}
        related_models = self.get_related_models()
        # See the description of related_models class attribute.
        # The value of field_name will be used at client-side as App.renderNestedList() options.keyPrefix attribute.
        # See ko-grid.js for more details.
        for field_name, model in sdv.iter_enumerate(related_models, repeated_keys=True):
            verbose_names = self.get_model_fields_verbose_names(field_name, model)
            sdv.nested_update(related_verbose_names, verbose_names)
        return related_verbose_names

    # meta is used in Knockout.js templates for visual data binding such as model-related strings / numbers.
    def get_ko_meta(self):
        meta = {
            'hasSearch': len(self.search_fields) > 0,
            'pkField': self.pk_field,
            # str() is used because django.contrib.auth.models.User uses instances of
            # django.utils.functional.lazy.<locals>.__proxy__ object, which are not JSON serializable.
            'verboseName': str(self.get_model_meta('verbose_name')),
            'verboseNamePlural': str(self.get_model_meta('verbose_name_plural'))
        }
        ordering = [
            {ordering.lstrip('-'): '-' if ordering.startswith('-') else '+'}
            for ordering in self.get_model_meta('ordering')
        ]
        # todo: support multiple order_by.
        if len(ordering) == 1 and list(ordering[0].keys())[0] in self.allowed_sort_orders:
            meta['orderBy'] = ordering[0]
        if self.force_str_desc:
            meta['strDesc'] = self.force_str_desc
        if self.show_nested_fieldnames:
            meta['fkNestedListOptions'] = {
                'showKeys': True,
            }
            i18n = self.get_related_model_fields_verbose_names()
            if len(i18n) > 0:
                meta['fkNestedListOptions']['i18n'] = i18n
            # Current model verbose / local field names used by client-side App.FkGridWidget.setDisplayValue() call.
            meta['listOptions'] = {
                'showKeys': True,
                'i18n': self.get_model_fields_verbose_names()
            }

        return meta

    def action_meta(self):
        vm = {
            'action_kwarg': self.__class__.action_kwarg,
            'sortOrders': self.allowed_sort_orders,
            'meta': self.get_ko_meta(),
            'actions': self.vm_get_actions(),
            'gridFields': self.vm_get_grid_fields(),
            'filters': self.get_filters()
        }
        if self.__class__.mark_safe_fields is not None:
            vm['markSafe'] = self.__class__.mark_safe_fields
        return vm

    def action_list(self):
        rows = self.get_rows()
        vm = {
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
# To browse specified Django model rows and columns.
#
# HTTP GET response is 'Content-Type: text/html' generated from template_name, which should have App.ko.Grid client-side
# component defined. See 'cbv_grid.htm' for example of component definition. It is optional and is not required.
#
# HTTP POST response is AJAX JSON for App.ko.Grid / App.FkGridWidget Javascript components.
#
class KoGridView(ViewmodelView, BaseFilterView, GridActionsMixin, FormViewmodelsMixin):

    context_object_name = 'model'
    template_name = 'cbv_grid.htm'
    model = None

    # query all fields by default.
    query_fields = None

    # None value of exclude_fields means that only raw values of model fields that are defined as grid_fields will be
    # returned to client-side grid to increase security.
    # Use empty list value to include all raw values of model fields to have pre version 0.4.1 behavior.
    exclude_fields = None

    current_page = 1
    objects_per_page = getattr(settings, 'OBJECTS_PER_PAGE', 10)
    force_str_desc = False
    # optional value of ko_grid() Jinja2 macro 'grid_options' argument.
    grid_options = None

    # Override in child class to set value of ko_grid() Jinja2 macro 'grid_options' argument.
    @classmethod
    def get_grid_options(cls):
        return {} if cls.grid_options is None else cls.grid_options

    # It is possible to get related fields:
    # https://code.djangoproject.com/ticket/5768
    # https://github.com/django/django/commit/9b432cb67b
    # Also, one may override self.get_base_queryset() to include .select_related() for performance optimization.
    def get_query_fields(self):
        return self.get_all_related_fields()

    def get_allowed_filter_fields(self):
        return OrderedDict()

    @classmethod
    def process_qs(cls, request, qs):
        self = cls()
        self.request = request
        cls.init_class(self)
        return self.postprocess_qs(qs)

    @classmethod
    def discover_grid_options(cls, request):
        grid_options = cls.get_grid_options()
        if 'fkGridOptions' not in grid_options:
            # Autodiscover 'fkGridOptions'.
            # It's more robust to setup 'fkGridOptions' manually, but it's much more cumbersome
            # in case grid has nested relations. Thus this method was introduced.
            view = cls()
            view.request = request
            # It could fail when related_view kwargs are incompatible to view kwargs so use with care.
            view.kwargs = request.view_kwargs
            view.init_allowed_filter_fields(view)
            for filter_field, filter_def in view.allowed_filter_fields.items():
                if isinstance(filter_def, dict) and 'pageRoute' in filter_def:
                    # 'type': 'fk' filter field with 'pageRoute' autodiscovery.
                    pageRouteKwargs = filter_def.get('pageRouteKwargs', {})
                    pageRouteKwargs['action'] = ''
                    related_view = qtpl.resolve_cbv(filter_def['pageRoute'], pageRouteKwargs)
                    if 'fkGridOptions' not in grid_options:
                        grid_options['fkGridOptions'] = {}
                    field_fkGridOptions = copy(filter_def)
                    if 'type' in field_fkGridOptions:
                        del field_fkGridOptions['type']
                    # Apply relations to fkGridOptions recursively.
                    field_fkGridOptions.update(related_view.discover_grid_options(request))
                    grid_options['fkGridOptions'][filter_field] = field_fkGridOptions
            return grid_options
        else:
            return grid_options

    def get_exclude_fields(self):
        if self.__class__.exclude_fields is None:
            # Exclude model field values that are not specified as grid fields by default.
            exclude_fields = set(self.get_all_fieldnames()) - set(self.get_grid_fields_attnames())
            if self.pk_field in exclude_fields:
                exclude_fields.remove(self.pk_field)
        else:
            # Exclude only model fields specified by self.__class__.exclude_fields list.
            # Set to [] to include all fields.
            exclude_fields = self.__class__.exclude_fields
        return exclude_fields

    @classmethod
    def init_class(cls, self):
        super(KoGridView, cls).init_class(self)

        if cls.query_fields is None:
            self.query_fields = self.get_query_fields()
        else:
            self.query_fields = cls.query_fields

        self.exclude_fields = self.get_exclude_fields()

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
        # Do not return hidden field values to client-side response for better security.
        for exclude_field in self.exclude_fields:
            del row[exclude_field]
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
        result = handler()
        if result is None:
            result = vm_list()
        elif not isinstance(result, list):
            result = vm_list(result)
        # Apply default viewmodel name, in case it was not set by action handler.
        for vm in result:
            if 'view' not in vm:
                vm['view'] = self.__class__.viewmodel_name
        return result

    def get_base_queryset(self):
        return self.__class__.model.objects.all()


class KoGridInline(KoGridView):

    template_name = 'cbv_grid_inline.htm'
