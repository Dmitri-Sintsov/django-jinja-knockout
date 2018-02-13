from collections import OrderedDict
from copy import deepcopy
from math import ceil
from ensure import ensure_annotations

from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils.html import format_html
from django.utils.translation import gettext as _
from django.template import loader as tpl_loader
from django.views.generic import TemplateView

from ..validators import ViewmodelValidator
from ..utils import sdv
from .. import tpl as qtpl
from ..models import (
    get_meta, get_verbose_name, model_fields_verbose_names, model_values, get_object_description, yield_related_models
)
from ..query import ListQuerySet
from ..viewmodels import vm_list, to_vm_list
from .base import BaseFilterView, GetPostMixin, FormViewmodelsMixin


MIN_OBJECTS_PER_PAGE = getattr(settings, 'OBJECTS_PER_PAGE', 10)
MAX_OBJECTS_PER_PAGE = MIN_OBJECTS_PER_PAGE * 5


# GET request usually generates html template, POST - returns AJAX viewmodels.
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
        if 'ex' in kwargs:
            ex = kwargs.pop('ex')
            kwargs['messages'] = ex.messages if isinstance(ex, ValidationError) else [str(ex)]
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


# ViewmodelView with actions router.
class ActionsView(ViewmodelView, GetPostMixin):

    # Set to valid string in the ancestor class.
    viewmodel_name = 'action'
    action_kwarg = 'action'
    default_action_name = 'meta'

    def get_actions(self):
        return {
            'built_in': OrderedDict([
                (self.default_action_name, {
                    'enabled': False
                }),
            ])
        }

    def get_default_action_name(self):
        return self.default_action_name

    def get_current_action_name(self):
        return self.kwargs.get(self.action_kwarg, '').strip('/')

    # Add extra kwargs here if these are defined in urls.py.
    def get_view_kwargs(self):
        return deepcopy(self.kwargs)

    def get_action_url(self, action, query: dict=None):
        if query is None:
            query = {}
        kwargs = self.get_view_kwargs()
        kwargs[self.action_kwarg] = '/{}'.format(action)
        return qtpl.reverseq(
            self.request.url_name,
            kwargs=kwargs,
            query=query
        )

    def get_action(self, action_name):
        for type, actions_map in self.actions.items():
            if action_name in actions_map:
                return actions_map[action_name]
        return None

    def get_action_local_name(self, action_name=None):
        if action_name is None:
            action_name = self.current_action_name
        action = self.get_action(action_name)
        return action['localName'] if action is not None and 'localName' in action else action_name

    # Converts OrderedDict to list of dicts for each action type because JSON / Javascript does not support dict
    # ordering, to preserve visual ordering of actions.
    def vm_get_actions(self):
        vm_actions = {}
        for action_type, actions_map in self.actions.items():
            if action_type not in vm_actions:
                vm_actions[action_type] = []
            for action_name, action in actions_map.items():
                action['name'] = action_name
                vm_actions[action_type].append(action)
        return vm_actions

    def get_ko_meta(self):
        return {}

    def action_meta(self):
        vm = {
            'action_kwarg': self.action_kwarg,
            'meta': self.get_ko_meta(),
            'actions': self.vm_get_actions(),
        }
        return vm

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

    def get(self, request, *args, **kwargs):
        request.client_routes.add(request.url_name)
        return super().get(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        self.actions = self.get_actions()
        self.request = request
        self.args = args
        self.kwargs = kwargs
        self.current_action_name = self.get_current_action_name()
        if self.current_action_name == '':
            self.current_action_name = self.get_default_action_name()
        current_action = self.get_action(self.current_action_name)
        if current_action is None:
            handler = self.action_not_implemented
        elif current_action.get('enabled', True):
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
                vm['view'] = self.viewmodel_name
        return result


class ModelFormActionsView(ActionsView, FormViewmodelsMixin):

    context_object_name = 'model'
    form_template = 'bs_form.htm'
    inline_template = 'bs_inline_formsets.htm'
    pk_url_kwarg = None
    model = None
    model_fields_i18n = True
    initial = {}
    # Set prefix to string value to minimize the possibility of input ID clash with non-AJAX forms / formsets
    # in the 'form_error' viewmodel handler.
    prefix = None
    form = None
    formset = None
    form_with_inline_formsets = None

    def get_default_action_name(self):
        return 'edit_inline' if self.form is None else 'edit_form'

    def dispatch(self, request, *args, **kwargs):
        if self.model is None:
            if self.form is not None:
                self.model = self.form._meta.model
            elif self.form_with_inline_formsets is not None:
                form_class = self.form_with_inline_formsets(request).get_form_class()
                if form_class is None:
                    raise ValueError('Neither a model class attribute nor form_with_inline_formsets defines model class')
                self.model = form_class._meta.model
            else:
                raise ValueError('model class attribute is undefined')
        return super().dispatch(request, *args, **kwargs)

    def get_actions(self):
        return {
            'built_in': OrderedDict([
                ('meta', {
                    'enabled': False
                }),
                ('save_form', {}),
                ('save_inline', {}),
                ('create_form', {
                    'localName': _('Add'),
                    'enabled': any([
                        self.get_create_form()
                    ])
                }),
                ('create_inline', {
                    'localName': _('Add'),
                    'enabled': any([
                        self.get_create_form_with_inline_formsets()
                    ])
                }),
                ('edit_form', {
                    'localName': _('Change'),
                    'enabled': any([
                        self.get_edit_form()
                    ])
                }),
                ('edit_inline', {
                    'localName': _('Change'),
                    'enabled': any([
                        self.get_edit_form_with_inline_formsets()
                    ])
                }),
            ]),
        }

    def get_model_meta(self, key):
        return get_meta(self.model, key)

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

    def get_object_desc(self, obj):
        return get_object_description(obj)

    def render_object_desc(self, obj):
        i18n = self.get_model_fields_verbose_names() if self.model_fields_i18n else None
        return qtpl.print_bs_badges(self.get_object_desc(obj), show_keys=None if i18n is None else 1, i18n=i18n)

    # Create one model object.
    def get_create_form(self):
        return self.form

    # Edit one model object.
    def get_edit_form(self):
        return self.form

    # Create one model object with related objects.
    def get_create_form_with_inline_formsets(self):
        return self.form_with_inline_formsets

    # Edit one model object with related objects.
    def get_edit_form_with_inline_formsets(self):
        return self.form_with_inline_formsets

    # KoGridView uses .request_get() value because one grid may edit different model objects.
    # ModelFormActionsView may use either pk_url_kwarg value or .request_get() value.
    # See also App.EditForm.init() / .runComponent() at client-side.
    def get_pk_val(self):
        return self.request_get('pk_val') if self.pk_url_kwarg is None else self.kwargs[self.pk_url_kwarg]

    def get_object_for_action(self):
        return self.model.objects.filter(pk=self.get_pk_val()).first()

    def get_queryset_for_action(self):
        # jQuery / PHP like array post.
        pks = self.request.POST.getlist('pk_vals[]')
        if len(pks) == 0:
            validator = ViewmodelValidator(val=self.request_get('pk_vals')).load_json_ids()
            if validator.has_errors():
                # Single value, no array.
                pks = [self.get_pk_val()]
            else:
                # JSON array post.
                pks = validator.val()
        return self.model.objects.filter(pk__in=pks)

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

    def get_ko_meta(self):
        ko_meta = super().get_ko_meta()
        if self.model_fields_i18n:
            # Can be used with self.vm_save_form() 'message' key result
            # to display localized verbose field names of newly saved objects.
            ko_meta['i18n'] = self.get_model_fields_verbose_names()
        return ko_meta

    def event(self, name, **kwargs):
        handler_name = 'event_{}'.format(name)
        if callable(getattr(self, handler_name, None)):
            getattr(self, handler_name)(**kwargs)

    def vm_form(self, form, template=None, verbose_name=None, form_action='save_form', action_query: dict=None):
        if template is None:
            template = self.form_template
        if action_query is None:
            action_query = {}
        t = tpl_loader.get_template(template)
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

    def vm_inline(self, ff, template=None, verbose_name=None, form_action='save_inline', action_query: dict=None):
        if template is None:
            template = self.inline_template
        if action_query is None:
            action_query = {}
        t = tpl_loader.get_template(template)
        ff_html = t.render(request=self.request, context={
            '_render_': True,
            'form': ff.form,
            'formsets': ff.formsets,
            'action': self.get_action_url(form_action, query=action_query),
            'html': self.get_bs_form_opts()
        })
        if verbose_name is None:
            verbose_name = get_verbose_name(ff.get_form_class().Meta.model)
        return vm_list({
            'last_action': form_action,
            'title': format_html(
                '{}: {}',
                self.get_action_local_name(),
                verbose_name
            ),
            'message': ff_html
        })

    def get_initial(self):
        return self.initial.copy()

    def get_prefix(self):
        return self.prefix

    def get_form_kwargs(self, form_class):
        return {
            'initial': self.get_initial(),
            'prefix': self.get_prefix(),
        }

    def get_form_with_inline_formsets_kwargs(self, ff_class):
        return {
            'prefix': self.get_prefix(),
        }

    def get_action_query(self, obj):
        return {'pk_val': obj.pk}

    def action_create_form(self):
        form_class = self.get_create_form()
        form = form_class(**self.get_form_kwargs(form_class))
        return self.vm_form(form)

    def action_edit_form(self, obj=None):
        """
        :param obj: None when called from .post(), use to override when calling super().action_edit_form(obj)
        :return: vm_list
        """
        if obj is None:
            obj = self.get_object_for_action()
        form_class = self.get_edit_form()
        form = form_class(instance=obj, **self.get_form_kwargs(form_class))
        return self.vm_form(
            form, verbose_name=self.render_object_desc(obj), action_query=self.get_action_query(obj)
        )

    def action_create_inline(self):
        ff_class = self.get_create_form_with_inline_formsets()
        ff = ff_class(self.request, **self.get_form_with_inline_formsets_kwargs(ff_class))
        ff.get()
        return self.vm_inline(ff)

    def action_edit_inline(self, obj=None):
        """
        :param obj: None when called from .post(), use to override when calling super().action_edit_inline(obj)
        :return: vm_list
        """
        if obj is None:
            obj = self.get_object_for_action()
        ff_class = self.get_edit_form_with_inline_formsets()
        ff = ff_class(self.request, **self.get_form_with_inline_formsets_kwargs(ff_class))
        ff.get(instance=obj)
        return self.vm_inline(
            ff, verbose_name=self.render_object_desc(obj), action_query=self.get_action_query(obj)
        )

    def vm_save_form(self, old_obj, new_obj, form=None, ff=None):
        vm = {
            'view': 'alert',
            'title': get_verbose_name(new_obj),
            'message': self.get_object_desc(new_obj),
        }
        if self.model_fields_i18n:
            vm['nestedListOptions'] = {
                'showKeys': True,
                'i18n': self.get_model_fields_verbose_names()
            }
        return vm_list(
            vm,
            # 'view': self.viewmodel_name indicates that the BootstrapDialog has to be closed.
            {
                'view': self.viewmodel_name,
                'pkVal': new_obj.pk,
            }
        )

    # Supports both 'create_form' and 'edit_form' actions.
    def action_save_form(self):
        old_obj = self.get_object_for_action()
        form_class = self.get_create_form() if old_obj is None else self.get_edit_form()
        form = form_class(self.request.POST, instance=old_obj, **self.get_form_kwargs(form_class))
        if form.is_valid():
            if form.has_changed():
                new_obj = form.save()
                self.event('save_form_success', old_obj=old_obj, form=form)
                vms = self.vm_save_form(old_obj, new_obj, form=form)
            else:
                vms = vm_list()
            return vms
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
        ff = ff_class(self.request, create=old_obj is None, **self.get_form_with_inline_formsets_kwargs(ff_class))
        new_obj = ff.save(instance=old_obj)
        if new_obj is not None:
            if ff.has_changed():
                self.event('save_inline_success', old_obj=old_obj, ff=ff)
                vms = self.vm_save_form(old_obj, new_obj, ff=ff)
            else:
                vms = vm_list()
            return vms
        else:
            return self.ajax_form_invalid(ff.form, ff.formsets)


class GridActionsMixin(ModelFormActionsView):

    viewmodel_name = 'grid_page'
    default_action_name = 'list'
    enable_deletion = False
    enable_rows_per_page = True
    enable_switch_highlight = True
    mark_safe_fields = None
    show_nested_fieldnames = True
    # Currently is used only to get verbose / localized foreign key field names and is not required to be filled.
    # Relation in queries are followed automatically via Django ORM.
    # Set to dict with key fieldname: value related_model to use prefixed field names,
    # Set to list of two-element tuples to use duplicate prefixed field names for related models (eg. generic relationships).
    # Set to list of related models to use non-prefixed root field names.
    # See also .get_related_model_fields_verbose_names() and App.ko.GridColumnOrder.renderRowValue() implementations.
    related_models = None

    def get_actions(self):
        return {
            'built_in': OrderedDict([
                ('meta', {}),
                ('list', {}),
                ('update', {}),
                ('meta_list', {}),
                ('save_form', {}),
                ('save_inline', {}),
                ('delete_confirmed', {
                    'enabled': self.enable_deletion
                })
            ]),
            # Extendable UI actions.
            'button': OrderedDict([
                ('create_form', {
                    'localName': _('Add'),
                    'css': {
                        'button': 'btn-primary',
                        'glyphicon': 'glyphicon-plus'
                    },
                    'enabled': any([
                        self.get_create_form()
                    ])
                }),
                ('create_inline', {
                    'localName': _('Add'),
                    'css': {
                        'button': 'btn-primary',
                        'glyphicon': 'glyphicon-plus'
                    },
                    'enabled': any([
                        self.get_create_form_with_inline_formsets()
                    ])
                })
            ]),
            'button_footer': OrderedDict(),
            'pagination': OrderedDict([
                ('rows_per_page', {
                    'classPath': 'App.ko.RowsPerPageAction',
                    'localName': _('Rows per page'),
                    'css': {
                        'glyphicon': 'glyphicon-th-list'
                    },
                    'range': {
                        'min': MIN_OBJECTS_PER_PAGE,
                        'max': MAX_OBJECTS_PER_PAGE,
                        'step': MIN_OBJECTS_PER_PAGE,
                    },
                    'enabled': self.enable_rows_per_page
                }),
                ('switch_highlight', {
                    'localName': _('Highlight mode'),
                    'css': {
                        'glyphicon': 'glyphicon-th'
                    },
                    'enabled': self.enable_switch_highlight
                })
            ]),
            'click': OrderedDict([
                ('edit_form', {
                    'localName': _('Change'),
                    'css': 'btn-primary',
                    'enabled': any([
                        self.get_edit_form()
                    ])
                }),
                ('edit_inline', {
                    'localName': _('Change'),
                    'css': 'btn-primary',
                    'enabled': any([
                        self.get_edit_form_with_inline_formsets()
                    ])
                }),
                ('edit_formset', {
                    'localName': _('Change'),
                    'css': 'btn-primary',
                    'enabled': any([
                        self.get_edit_formset()
                    ])
                })
            ]),
            'glyphicon': OrderedDict([
                # Delete one or many model object.
                ('delete', {
                    'localName': _('Remove'),
                    'css': 'glyphicon-remove',
                    'enabled': self.enable_deletion
                })
            ])
        }

    # Edit multiple selected model objects.
    def get_edit_formset(self):
        return self.formset

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

    def get_title_action_not_allowed(self):
        return _('Action "%(action)s" is not allowed') % \
            {'action': self.get_action_local_name()}

    def vm_save_form(self, old_obj, new_obj, form=None, ff=None):
        vm = {}
        row = self.postprocess_row(
            self.get_model_row(new_obj),
            new_obj
        )
        if old_obj is None:
            vm['prepend_rows'] = [row]
        else:
            vm['update_rows'] = [row]
        return to_vm_list(vm)

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
            self.event('delete_is_allowed', objects=objects)
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

    def vm_add_grid_fields(self, grid_fields, vm_grid_fields):
        if not isinstance(grid_fields, list):
            self.report_error('grid_fields must be list')
        for field_def in grid_fields:
            if isinstance(field_def, tuple):
                vm_grid_fields.append({
                    'field': field_def[0],
                    'name': field_def[1]
                })
            elif isinstance(field_def, str):
                vm_grid_fields.append({
                    'field': field_def,
                    'name': self.get_field_verbose_name(field_def)
                })
            elif isinstance(field_def, list):
                vm_compound_fields = []
                self.vm_add_grid_fields(field_def, vm_compound_fields)
                vm_grid_fields.append(vm_compound_fields)
            else:
                self.report_error('grid_fields list values must be instances of str or tuple or list')

    def vm_get_grid_fields(self):
        vm_grid_fields = []
        self.vm_add_grid_fields(self.grid_fields, vm_grid_fields)
        return vm_grid_fields

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
            'verboseName': self.get_model_meta('verbose_name'),
            'verboseNamePlural': self.get_model_meta('verbose_name_plural'),
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
            'action_kwarg': self.action_kwarg,
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
        rows, page_num, objects_per_page = self.get_rows()
        vm = {
            'entries': list(rows),
            'page': page_num,
            'rowsPerPage': objects_per_page,
            'totalPages': ceil(self.total_rows / objects_per_page),
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
class KoGridView(BaseFilterView, GridActionsMixin):

    template_name = 'cbv_grid.htm'

    # query all fields by default.
    query_fields = None

    # None value of exclude_fields means that only raw values of model fields that are defined as grid_fields will be
    # returned to client-side grid to increase security.
    # Use empty list value to include all raw values of model fields to have pre version 0.4.1 behavior.
    exclude_fields = None

    current_page = 1
    min_objects_per_page = MIN_OBJECTS_PER_PAGE
    max_objects_per_page = MAX_OBJECTS_PER_PAGE
    objects_per_page = MIN_OBJECTS_PER_PAGE
    force_str_desc = False
    # optional value of ko_grid() Jinja2 macro 'grid_options' argument.
    grid_options = None

    # Override in child class to set value of ko_grid() Jinja2 macro 'grid_options' argument.
    @classmethod
    def get_grid_options(cls):
        return {} if cls.grid_options is None else deepcopy(cls.grid_options)

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
        grid_options = {
            'rowsPerPage': cls.objects_per_page
        }
        grid_options.update(cls.get_grid_options())
        if 'fkGridOptions' not in grid_options:
            # Autodiscover 'fkGridOptions'.
            # It's more robust to setup 'fkGridOptions' manually, but it's much more cumbersome
            # in case grid has nested relations. Thus this method was introduced.
            view = cls()
            view.request = request
            # It could fail when related_view kwargs are incompatible to view kwargs so use with care.
            view.kwargs = getattr(request, 'view_kwargs', {})
            view.init_allowed_filter_fields(view)
            for filter_field, filter_def in view.allowed_filter_fields.items():
                if isinstance(filter_def, dict) and 'pageRoute' in filter_def:
                    # 'type': 'fk' filter field with 'pageRoute' autodiscovery.
                    pageRouteKwargs = filter_def.get('pageRouteKwargs', {})
                    pageRouteKwargs['action'] = ''
                    related_view = qtpl.resolve_cbv(filter_def['pageRoute'], pageRouteKwargs)
                    if 'fkGridOptions' not in grid_options:
                        grid_options['fkGridOptions'] = {}
                    field_fkGridOptions = deepcopy(filter_def)
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

    def set_row_related_fields(self, row):
        row_related = {}
        related_fields = self.get_related_fields()
        for related_field in related_fields:
            row_related[related_field] = row.pop(related_field)
        for field, value in row_related.items():
            row[field] = value
        return row

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
        kw = {
            'minval': self.min_objects_per_page,
            'maxval': self.max_objects_per_page
        }
        objects_per_page = self.request_get_int('rows_per_page', default=self.objects_per_page, **kw)
        prev_objects_per_page = self.request_get_int('prev_rows_per_page', default=objects_per_page, **kw)
        page_num = self.request_get('page', 1)
        try:
            page_num = int(page_num)
        except ValueError:
            self.report_error(
                title='Invalid page number',
                message=format_html('Page number: {}', page_num)
            )
        if page_num > 0:
            first_elem = (page_num - 1) * prev_objects_per_page
            if objects_per_page != prev_objects_per_page:
                # Rows per page was just changed.
                page_num = first_elem // objects_per_page + 1
            last_elem = first_elem + objects_per_page
        else:
            page_num = first_elem = last_elem = 0
        qs = self.get_queryset()
        self.total_rows = qs.count()
        paginated_qs = ListQuerySet(qs[first_elem:last_elem])
        paginated_qs_iter = paginated_qs.__iter__()
        rows = [
            self.postprocess_row(
                self.set_row_related_fields(row), next(paginated_qs_iter)
            )
            for row in paginated_qs.values(*self.query_fields)
        ]
        return rows, page_num, objects_per_page

    def postprocess_qs(self, qs):
        return [
            self.postprocess_row(self.get_model_row(obj), obj) for obj in qs
        ]

    def get_base_queryset(self):
        return self.model.objects.all()


class KoGridInline(KoGridView):

    template_name = 'cbv_grid_inline.htm'
