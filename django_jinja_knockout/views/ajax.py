from collections import OrderedDict
from copy import deepcopy
from math import ceil

from django.conf import settings
from django.utils.html import format_html
from django.utils.translation import gettext as _
from django.forms import model_to_dict

from ..validators import ViewmodelValidator
from ..forms.vm_renderers import FormViewmodel, InlineViewmodel
from ..utils import sdv
from .. import tpl
from ..models import (
    get_meta, get_verbose_name, model_fields_verbose_names, model_values, get_object_description, yield_related_models
)
from ..query import ListQuerySet
from ..viewmodels import vm_list, to_vm_list
from .base import FormatTitleMixin, ViewmodelView, BaseFilterView, FormViewmodelsMixin


MIN_OBJECTS_PER_PAGE = getattr(settings, 'OBJECTS_PER_PAGE', 10)
MAX_OBJECTS_PER_PAGE = MIN_OBJECTS_PER_PAGE * 5


# ViewmodelView with actions router.
class ActionsView(FormatTitleMixin, ViewmodelView):

    # Set to valid string in the ancestor class.
    viewmodel_name = 'action'
    action_kwarg = 'action'
    default_action_name = 'meta'

    def setup(self, request, *args, **kwargs):
        super().setup(request, *args, **kwargs)
        self.actions = self.get_actions()

    def filter_our_viewmodels(self, vms):
        if isinstance(vms, list):
            for vm in vms:
                if vm.get('view', self.viewmodel_name) == self.viewmodel_name:
                    yield vm
        elif isinstance(vms, dict):
            yield from self.filter_our_viewmodels([vms])

    def get_actions(self):
        return {
            'built_in': OrderedDict([
                (self.get_default_action_name(), {
                    'enabled': False
                }),
            ])
        }

    def get_default_action_name(self):
        return self.default_action_name

    def get_current_action_name(self):
        if self.action_kwarg is None:
            return self.get_default_action_name()
        else:
            action_name = self.kwargs.get(self.action_kwarg, '').strip('/')
            return self.get_default_action_name() if action_name == '' else action_name

    # Add extra kwargs here if these are defined in urls.py.
    def get_view_kwargs(self):
        return deepcopy(self.kwargs)

    def get_action_url(self, action, query: dict = None):
        if query is None:
            query = {}
        kwargs = self.get_view_kwargs()
        kwargs[self.action_kwarg] = f'/{action}'
        return tpl.reverseq(
            self.request.resolver_match.view_name,
            kwargs=kwargs,
            query=query
        )

    def get_action(self, action_name):
        for actions_map in self.actions.values():
            if action_name in actions_map:
                return actions_map[action_name]
        return None

    def get_action_local_name(self, action_name=None):
        if action_name is None:
            action_name = self.current_action_name
        action = self.get_action(action_name)
        return action['localName'] if action is not None and 'localName' in action else action_name

    def conditional_action(self, action_name):
        if action_name == self.get_current_action_name():
            return self.get_action_handler()()
        else:
            return False

    # Converts OrderedDict to list of dicts for each action type because JSON / Javascript does not support dict
    # ordering, to preserve visual ordering of actions.
    def vm_get_actions(self, only_action_type=None):
        vm_actions = {}
        for action_type, actions_map in self.actions.items():
            if only_action_type is None or action_type == only_action_type:
                actions = []
                for action_name, action in actions_map.items():
                    if action.get('enabled', True):
                        action['name'] = action_name
                        actions.append(action)
                if len(actions) > 0:
                    vm_actions[action_type] = actions
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

    def get_action_is_denied(self):
        # Warning: the result is valid only for GET handler.
        return False

    def get_action_not_implemented(self):
        # Warning: the result is valid only for GET handler.
        return None

    def post_action_is_denied(self):
        self.post_report_error(
            title=_('Action is denied'),
            message=format_html(
                _('Action "{}" is denied'), self.current_action_name
            )
        )

    def post_action_not_implemented(self):
        self.post_report_error(
            title=_('Unknown action'),
            message=format_html(
                _('Action "{}" is not implemented'), self.get_action_local_name()
            )
        )

    def render_to_response(self, context, **response_kwargs):
        self.create_page_context().add_client_routes(self.request.resolver_match.view_name)
        return super().render_to_response(context, **response_kwargs)

    def get_action_handler(self):
        self.current_action_name = self.get_current_action_name()
        current_action = self.get_action(self.current_action_name)
        http_method = self.request.method.lower()
        if current_action is None:
            handler = getattr(self, f"{http_method}_action_not_implemented")
        elif current_action.get('enabled', True):
            handler = getattr(
                self, f'{http_method}_action_{self.current_action_name}', getattr(
                    self, f'action_{self.current_action_name}', getattr(
                        self, f"{http_method}_action_not_implemented"
                    )
                )
            )
        else:
            handler = getattr(self, f"{http_method}_action_is_denied")
        return handler

    def post(self, request, *args, **kwargs):
        self.request = request
        self.args = args
        self.kwargs = kwargs
        result = self.get_action_handler()()
        if result is None:
            # Will process client-side Actions class "callback_{viewmodel_name}"  method.
            result = vm_list(view=self.viewmodel_name)
        elif result is False:
            # Will suppress client-side Actions class "callback_{viewmodel_name}" method.
            result = vm_list()
        elif not isinstance(result, list):
            result = vm_list(result)
        # Apply default viewmodel name, in case it was not set by action handler.
        for vm in result:
            vm.setdefault('view', self.viewmodel_name)
        return result


class ModelFormActionsView(ActionsView, FormViewmodelsMixin):

    context_object_name = 'model'
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
    instance = None
    vm_form = None
    vm_inline = None

    # GET request usually generates html template, POST - returns AJAX viewmodels.
    def get(self, request, *args, **kwargs):
        context = self.get_context_data(**kwargs)
        return self.render_to_response(context)

    def get_default_action_name(self):
        return 'edit_inline' if self.form is None else 'edit_form'

    def setup(self, request, *args, **kwargs):
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
        super().setup(request, *args, **kwargs)

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

    def get_all_verbose_names(self):
        return self.get_model_fields_verbose_names() if self.model_fields_i18n else None

    # Create one model object.
    def get_create_form(self):
        return self.form

    # Edit one model object.
    def get_edit_form(self):
        return self.form

    def ioc_vm_form(self, form, instance=None, source_action=None):
        vm_form_cls = FormViewmodel if self.vm_form is None else self.vm_form
        if source_action is None:
            source_action = self.current_action_name
        return vm_form_cls(self, form, instance, source_action)

    def ioc_vm_inline(self, ff, instance=None, source_action=None):
        vm_inline_cls = InlineViewmodel if self.vm_inline is None else self.vm_inline
        if source_action is None:
            source_action = self.current_action_name
        return vm_inline_cls(self, ff, instance, source_action)

    # Create one model object with related objects.
    def get_create_form_with_inline_formsets(self):
        return self.form_with_inline_formsets

    # Edit one model object with related objects.
    def get_edit_form_with_inline_formsets(self):
        return self.form_with_inline_formsets

    # KoGridView uses .request_get() value because one grid may edit different model objects.
    # ModelFormActionsView may use either pk_url_kwarg value or .request_get() value.
    # See also EditForm.init() / .runComponent() at client-side.
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
    # BootstrapDialog card might render with overlapped layout without these options.
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
        handler_name = f'event_{name}'
        if callable(getattr(self, handler_name, None)):
            getattr(self, handler_name)(**kwargs)

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

    def get_action_query(self, action, obj=None):
        return {} if obj is None else {'pk_val': obj.pk}

    def get_call_create_form_kwargs(self):
        return {}

    def action_create_form(self):
        form_class = self.get_create_form()
        form = form_class(**self.get_form_kwargs(form_class))
        return self.ioc_vm_form(
            form=form
        )(**self.get_call_create_form_kwargs())

    def get_call_edit_form_kwargs(self):
        return {}

    def action_edit_form(self, obj=None):
        """
        :param obj: None when called from .post(), use to override when calling super().action_edit_form(obj)
        :return: vm_list
        """
        self.instance = self.get_object_for_action() if obj is None else obj
        form_class = self.get_edit_form()
        form = form_class(instance=self.instance, **self.get_form_kwargs(form_class))
        return self.ioc_vm_form(
            form=form,
            instance=self.instance
        )(**self.get_call_edit_form_kwargs())

    def get_call_create_inline_kwargs(self):
        return {}

    def action_create_inline(self):
        ff_class = self.get_create_form_with_inline_formsets()
        ff = ff_class(self.request, **self.get_form_with_inline_formsets_kwargs(ff_class))
        ff.get()
        return self.ioc_vm_inline(
            ff=ff
        )(**self.get_call_create_inline_kwargs())

    def get_call_edit_inline_kwargs(self):
        return {}

    def action_edit_inline(self, obj=None):
        """
        :param obj: None when called from .post(), use to override when calling super().action_edit_inline(obj)
        :return: vm_list
        """
        self.instance = self.get_object_for_action() if obj is None else obj
        ff_class = self.get_edit_form_with_inline_formsets()
        ff = ff_class(self.request, **self.get_form_with_inline_formsets_kwargs(ff_class))
        ff.get(instance=self.instance)
        return self.ioc_vm_inline(
            ff=ff,
            instance=self.instance,
        )(**self.get_call_edit_inline_kwargs())

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

    def form_is_valid(self, form):
        return form.is_valid()

    def save_form(self, form):
        return form.save()

    # Supports both 'create_form' and 'edit_form' actions.
    def action_save_form(self):
        self.instance = old_obj = self.get_object_for_action()
        if old_obj is None:
            form_class = self.get_create_form()
        else:
            # Save old obj for comparsion. Setting .pk = None will not work.
            old_obj = model_to_dict(old_obj, exclude=['id'])
            form_class = self.get_edit_form()
        form = form_class(self.request.POST, self.request.FILES, instance=self.instance, **self.get_form_kwargs(form_class))
        if self.form_is_valid(form):
            if form.has_changed():
                self.instance = self.save_form(form)
                self.event('save_form_success', old_obj=old_obj, form=form)
                vms = self.vm_save_form(old_obj, self.instance, form=form)
            else:
                vms = vm_list()
            return vms
        else:
            form_vms = vm_list()
            self.add_form_viewmodels(form, form_vms)
            return form_vms

    # Supports both 'create_inline' and 'edit_inline' actions.
    def action_save_inline(self):
        self.instance = old_obj = self.get_object_for_action()
        if old_obj is None:
            ff_class = self.get_create_form_with_inline_formsets()
        else:
            # Save old obj for comparsion. Setting .pk = None will not work.
            old_obj = model_to_dict(old_obj, exclude=['id'])
            ff_class = self.get_edit_form_with_inline_formsets()
        ff = ff_class(self.request, create=self.instance is None, **self.get_form_with_inline_formsets_kwargs(ff_class))
        self.instance = ff.save(instance=self.instance)
        if self.instance is not None:
            if ff.has_changed():
                self.event('save_inline_success', old_obj=old_obj, ff=ff)
                vms = self.vm_save_form(old_obj, self.instance, ff=ff)
            else:
                vms = vm_list()
            return vms
        else:
            return self.ajax_form_invalid(ff.form, ff.formsets)

    def add_field_error(self, model_field, form_field, value):
        self.vm_error(
            {
                'view': self.viewmodel_name,
                'has_errors': True,
            },
            self.get_field_error_viewmodel(form_field)
        )


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
    # See also .get_related_model_fields_verbose_names() and GridColumnOrder.renderRowValue() implementations.
    related_models = None
    virtual_fields = None

    def setup(self, request, *args, **kwargs):
        super().setup(request, *args, **kwargs)

    def get_enable_deletion(self):
        return self.enable_deletion

    def get_actions(self):
        enable_deletion = self.get_enable_deletion()
        return {
            'built_in': OrderedDict([
                ('meta', {}),
                ('list', {}),
                ('update', {}),
                ('meta_list', {}),
                ('save_form', {}),
                ('save_inline', {}),
                ('delete_confirmed', {
                    'enabled': enable_deletion
                })
            ]),
            # Extendable UI actions.
            'button': OrderedDict([
                ('create_form', {
                    'localName': _('Add'),
                    'css': {
                        'button': 'btn-primary',
                        'iconui': 'iconui-plus'
                    },
                    'enabled': any([
                        self.get_create_form()
                    ])
                }),
                ('create_inline', {
                    'localName': _('Add'),
                    'css': {
                        'button': 'btn-primary',
                        'iconui': 'iconui-plus'
                    },
                    'enabled': any([
                        self.get_create_form_with_inline_formsets()
                    ])
                })
            ]),
            'button_footer': OrderedDict(),
            'button_pagination': OrderedDict(),
            'pagination': OrderedDict([
                ('rows_per_page', {
                    'classPath': 'GridRowsPerPageAction',
                    'localName': _('Rows per page'),
                    'css': {
                        'iconui': 'iconui-th-list'
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
                        'iconui': 'iconui-th'
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
            'iconui': OrderedDict([
                # Delete one or many model object.
                ('delete', {
                    'localName': _('Remove'),
                    'css': 'iconui-remove',
                    'enabled': enable_deletion
                })
            ])
        }

    def get_all_verbose_names(self):
        i18n = super().get_all_verbose_names()
        if i18n is not None:
            sdv.nested_update(i18n, self.get_related_model_fields_verbose_names(add_field_related=False))
        return i18n

    # Edit multiple selected model objects.
    def get_edit_formset(self):
        return self.formset

    def get_objects_descriptions(self, objects):
        return [self.get_object_desc(obj) for obj in objects]

    # Used to get local verbose names of the foreign fields.
    # For client-side rendering, set add_field_related=True.
    # For server-side rendering, set add_field_related=False,
    def get_related_models(self, add_field_related=None):
        if self.related_models is None:
            related_models = {}
            for field_name, related_model in yield_related_models(self.model, self.get_all_related_fields()):
                if field_name.endswith('_id'):
                    if add_field_related in (None, True):
                        related_models[field_name] = related_model
                    if add_field_related in (None, False):
                        related_models[field_name[:-len('_id')]] = related_model
                else:
                    related_models[field_name] = related_model

            return related_models
        else:
            return self.related_models

    def get_title_action_not_allowed(self, objects):
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
                'title': self.get_title_action_not_allowed(objects)
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
                'title': self.get_title_action_not_allowed(objects),
                'description': self.get_objects_descriptions(objects)
            })

    def vm_add_grid_fields(self, grid_fields, vm_grid_fields):
        if not isinstance(grid_fields, list):
            self.vm_error('grid_fields must be list')
        for field_def in grid_fields:
            vm_field = None
            if isinstance(field_def, dict):
                vm_field = {
                    'field': field_def['field'],
                    'name': field_def['name'] if 'name' in field_def else self.get_field_verbose_name(field_def['field']),
                }
            elif isinstance(field_def, tuple):
                vm_field = {
                    'field': field_def[0],
                    'name': field_def[1]
                }
            elif isinstance(field_def, str):
                vm_field = {
                    'field': field_def,
                    'name': self.get_field_verbose_name(field_def)
                }
            if vm_field is None:
                if isinstance(field_def, list):
                    vm_compound_fields = []
                    self.vm_add_grid_fields(field_def, vm_compound_fields)
                    vm_grid_fields.append(vm_compound_fields)
                else:
                    self.vm_error('grid_fields list values must be instances of str / tuple / list / dict')
            else:
                vm_grid_fields.append(vm_field)
                self.field_names[vm_field['field']] = vm_field['name']

    def vm_get_grid_fields(self):
        vm_grid_fields = []
        self.vm_add_grid_fields(self.grid_fields, vm_grid_fields)
        return vm_grid_fields

    # Collect field names verbose_name or i18n of field names from related model classes when available.
    # These usually are stored into Grid.meta.fkNestedListOptions.i18n
    def get_related_model_fields_verbose_names(self, add_field_related=None):
        # Grid model fields are not rendered as nested fields in grid, thus are not included into result of this call.
        related_verbose_names = {}
        related_models = self.get_related_models(add_field_related=add_field_related)
        # See the description of related_models class attribute.
        # The value of field_name will be used at client-side as renderNestedList() options.keyPrefix attribute.
        # See grid.js for more details.
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
            i18n = self.get_related_model_fields_verbose_names(add_field_related=True)
            if len(i18n) > 0:
                meta['fkNestedListOptions']['i18n'] = i18n
            # Current model verbose / local field names used by client-side FkGridWidget.setDisplayValue() call.
            meta['listOptions'] = {
                'showKeys': True,
                'i18n': self.get_model_fields_verbose_names()
            }

        return meta

    def action_meta(self):
        # self.get_filters may fail in case self.vm_get_grid_fields() is not called first.
        vm_grid_fields = self.vm_get_grid_fields()
        vm = {
            'action_kwarg': self.action_kwarg,
            'sortOrders': self.allowed_sort_orders,
            'meta': self.get_ko_meta(),
            'actions': self.vm_get_actions(),
            'gridFields': vm_grid_fields,
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


# AJAX version of filtered / sorted ListView which uses client-side grid.js script.
#
# In urls.py define:
#
#     from django_jinja_knockout.urls import UrlPath
#     UrlPath(MyModelGrid)(name='my_model_grid')
# To browse specified Django model rows and columns.
#
# HTTP GET response is 'Content-Type: text/html' generated from template_name, which should have Grid client-side
# component defined. See 'cbv_grid.htm' for example of component definition. It is optional and is not required.
#
# HTTP POST response is AJAX JSON for Grid / FkGridWidget Javascript components.
#
class KoGridView(BaseFilterView, GridActionsMixin):

    template_name = 'cbv_grid.htm'
    # Do not update .template_options as these are mutable, override them via .set_template_options() method instead.
    template_options = dict()

    # query all fields by default.
    query_fields = None

    current_page = 1
    min_objects_per_page = MIN_OBJECTS_PER_PAGE
    max_objects_per_page = MAX_OBJECTS_PER_PAGE
    objects_per_page = MIN_OBJECTS_PER_PAGE
    force_str_desc = False
    # optional value of ko_grid() Jinja2 macro 'grid_options' argument.
    grid_options = None
    preload_meta_list = False

    # AJAX filters. See ListSortingView for traditional seriver-side version.
    def ioc_field_filter(self, fieldname, vm_filter):
        if vm_filter['type'] == 'choices':
            from ..field_filters.choices import ChoicesFilter
            field_filter_cls = ChoicesFilter
        elif vm_filter['type'] == 'error':
            raise vm_filter['ex']
        else:
            from ..field_filters.base import MultiFilter
            field_filter_cls = MultiFilter
        return field_filter_cls(self, fieldname, vm_filter)

    # Override in child class to set value of ko_grid() Jinja2 macro 'grid_options' argument.
    def get_grid_options(self):
        return {} if self.grid_options is None else deepcopy(self.grid_options)

    # It is possible to get related fields:
    # https://code.djangoproject.com/ticket/5768
    # https://github.com/django/django/commit/9b432cb67b
    # Also, one may override self.get_base_queryset() to include .select_related() for performance optimization.
    def get_query_fields(self):
        all_related_fields = self.get_all_related_fields()
        # Do not return hidden field values to client-side response for better security.
        return [field for field in all_related_fields if field not in self.exclude_fields]

    @classmethod
    def process_qs(cls, request, qs):
        self = cls()
        self.setup(request)
        return self.postprocess_qs(qs)

    def get_preloaded_meta_list(self):
        self.preloading_meta_list = True
        self.kwargs['firstLoad'] = '1'
        self.actions = self.get_actions()
        self.get_current_query()
        return self.action_meta_list()

    # Automatically setup recusrive 'fkGridOptions' for nested BaseGridWidget relations.
    # It's more robust to setup 'fkGridOptions' manually, but it's much more cumbersome
    # in case grid has nested relations. Thus this method was introduced.
    def discover_grid_options(self, request, template_options=None):
        if template_options is None:
            template_options = {}
        grid_options = {
            'rowsPerPage': self.objects_per_page
        }
        grid_options.update(self.get_grid_options())
        if 'fkGridOptions' not in grid_options:
            # Autodiscover 'fkGridOptions'.
            # It could fail when related_view kwargs are incompatible to view kwargs so use with care.
            self.set_template_options(template_options)
            if request.resolver_match is not None:
                view_kwargs = deepcopy(request.resolver_match.kwargs)
            else:
                view_kwargs = {}
            if 'pageRouteKwargs' in template_options:
                view_kwargs.update(template_options['pageRouteKwargs'])
            self.setup(request, **view_kwargs)
            view_allowed_filter_fields = self.get_allowed_filter_fields()
            for filter_field, filter_def in view_allowed_filter_fields.items():
                if isinstance(filter_def, dict) and 'pageRoute' in filter_def:
                    # 'type': 'fk' filter field with 'pageRoute' autodiscovery.
                    related_view_cls, related_view_kwargs = tpl.resolve_grid(
                        request,
                        view_options=filter_def
                    )
                    if 'fkGridOptions' not in grid_options:
                        grid_options['fkGridOptions'] = {}
                    field_fkGridOptions = deepcopy(filter_def)
                    if 'type' in field_fkGridOptions:
                        del field_fkGridOptions['type']
                    # Apply relations to fkGridOptions recursively.
                    related_view = related_view_cls(**related_view_kwargs)
                    field_fkGridOptions.update(related_view.discover_grid_options(request))
                    grid_options['fkGridOptions'][filter_field] = field_fkGridOptions
            if self.preload_meta_list:
                grid_options['preloadedMetaList'] = self.get_preloaded_meta_list()
        grid_options.update(template_options)
        return grid_options

    # template_options are set for the .get_allowed_filter_fields() custom autodetection.
    # They are unused by default.
    # They are not available for the consequent AJAX requests.
    def set_template_options(self, template_options):
        self.template_options = template_options

    def get_route_kwarg(self, k):
        if k in self.kwargs:
            # AJAX call.
            return self.kwargs[k]
        else:
            # Initial BaseGridWidget.get_context() / .discover_grid_options() server-side call.
            return self.template_options['pageRouteKwargs'][k]

    def set_grid_fields(self):
        self.grid_fields_attnames = []
        self.virtual_fields = set()
        for field_def in self.yield_fields():
            if isinstance(field_def, dict):
                self.grid_fields_attnames.append(field_def['field'])
                if field_def.get('virtual', False):
                    self.virtual_fields.add(field_def['field'])
            elif isinstance(field_def, tuple):
                self.grid_fields_attnames.append(field_def[0])
            else:
                self.grid_fields_attnames.append(field_def)

    def setup(self, request, *args, **kwargs):
        super().setup(request, *args, **kwargs)
        self.preloading_meta_list = False
        if self.query_fields is None:
            self.query_fields = self.get_query_fields()

    def get_filters(self):
        if not isinstance(self.allowed_filter_fields, OrderedDict):
            self.vm_error('KoGridView.allowed_filter_fields must be instance of OrderedDict')
        return super().get_filters()

    def get_related_fields(self, query_fields=None):
        query_fields = super().get_related_fields(query_fields)
        # Remove virtual fields from queryset values().
        for field_name in self.virtual_fields:
            if self.has_grid_field(field_name):
                query_fields.remove(field_name)
        return query_fields

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

    # Will add special '__str_fields' key if model class has get_str_fields() method, which should return the dictionary
    # where the keys are field names while the values are end-user formatted display values (not raw values).
    def postprocess_row(self, row, obj):
        str_fields = self.get_row_str_fields(obj, row)
        if str_fields is None or self.__class__.force_str_desc:
            row['__str'] = str(obj)
        if str_fields is not None:
            row['__str_fields'] = str_fields
        return row

    def serialize_qs(self, qs, query_fields):
        return qs.values(*query_fields)

    def get_rows(self):
        kw = {
            'minval': self.min_objects_per_page,
            'maxval': self.max_objects_per_page
        }
        objects_per_page = self.request_get_int('rows_per_page', default=self.objects_per_page, **kw)
        prev_objects_per_page = self.request_get_int('prev_rows_per_page', default=objects_per_page, **kw)
        page_num = 1 if self.preloading_meta_list else self.request_get('page', 1)
        try:
            page_num = int(page_num)
        except ValueError:
            self.vm_error(
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
            for row in self.serialize_qs(paginated_qs, self.query_fields)
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


# Used by BaseGridWidget
class KoGridRelationView(KoGridView):

    delete_relation = True

    def can_delete_relation(self, obj):
        return self.delete_relation

    def postprocess_row(self, row, obj):
        row = super().postprocess_row(row, obj)
        if '__perm' not in row:
            row['__perm'] = {}
        row['__perm']['canDeleteFk'] = self.can_delete_relation(obj)
        return row
