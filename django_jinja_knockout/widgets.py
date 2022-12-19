from copy import copy, deepcopy
import types
from datetime import date, datetime

from django.utils.translation import gettext as _
from django.utils.encoding import force_str
from django.utils.html import format_html
from django.forms.utils import flatatt
from django.forms.widgets import (CheckboxInput, Widget, Textarea, MultiWidget)
from django.db.models.query import RawQuerySet, QuerySet

from djk_ui.widgets import UiBaseGridWidget

from . import apps
from .models import model_fields_verbose_names
from .obj_dict import ObjDict
from .query import ListQuerySet
from .tpl import (
    Renderer, PrintList, print_list_group, print_bs_well,
    add_css_classes_to_dict, remove_css_classes_from_dict,
    format_html_attrs, format_local_date,
    resolve_grid
)
from .utils import sdv
from .viewmodels import to_json


class RequestWidget(Widget):

    def get_request(self):
        if not hasattr(self, 'request'):
            ContextMiddleware = apps.DjkAppConfig.get_context_middleware()
            self.request = ContextMiddleware.get_request()
        return self.request


class RendererWidget(RequestWidget):

    renderer_class = Renderer
    template_name = None

    def ioc_renderer(self, context):
        request = self.get_request()
        return self.renderer_class(request, template=self.template_name, context=context)

    def render(self, name, value, attrs=None, renderer=None):
        """Render the widget as an HTML string."""
        context = self.get_context(name, value, attrs)
        renderer = self.ioc_renderer(context['widget'])
        return renderer.__str__()


class OptionalWidget(MultiWidget):

    def __init__(self, widget_class=Textarea, attrs=None):
        if attrs is None:
            attrs = {}
        add_css_classes_to_dict(attrs, 'optional-input')
        # Separate classes for child widgets are unused because it seems that Django does not support these.
        # Ugly fix is provided in plugins.js instead.
        widgets = (CheckboxInput(), widget_class(),)
        super().__init__(widgets, attrs=attrs)

    def render(self, name, value, attrs=None, renderer=None):
        output = super().render(name, value, attrs)
        add_css_classes_to_dict(attrs, 'optional-input-wrap form-control')
        return format_html('<div {}>{}</div>', flatatt(attrs), output)

    def decompress(self, value):
        if not value:
            return [False, '']
        return [value != '', value]


class PrefillDropdown(RendererWidget):

    template_name = 'widget_prefill_dropdown.htm'

    def __init__(self, attrs, choices):
        self.choices = choices
        super().__init__(attrs)

    def get_context(self, name, value, attrs):
        context = super().get_context(name, value, attrs)
        widget_ctx = context['widget']
        if 'id' in widget_ctx['attrs']:
            widget_ctx['attrs']['id'] += '-PREFILL_CHOICES'
        widget_ctx['choices'] = self.choices
        return context


class PrefillWidget(Widget):

    def __init__(
            self, data_widget=None, widget_class=Textarea, attrs: dict = None, choices=None, choices_attrs: dict = None
    ):
        # todo: Use templates instead of hardcoding.
        # todo: Support AJAX pulling the list of choices.
        if attrs is None:
            attrs = {}
        if choices_attrs is None:
            choices_attrs = {}
        add_css_classes_to_dict(attrs, 'form-control')
        if data_widget is None:
            if widget_class is Textarea:
                add_css_classes_to_dict(attrs, 'autogrow')
                if 'rows' not in attrs:
                    attrs['rows'] = '2'
            self.data_widget = widget_class(attrs=attrs)
        else:
            self.data_widget = data_widget
        self.choices_widget = PrefillDropdown(attrs=choices_attrs, choices=choices)
        super().__init__(attrs=attrs)

    def value_from_datadict(self, data, files, name):
        value = self.data_widget.value_from_datadict(data, files, name)
        return value

    # todo: Support Django renderer.
    def render(self, name, value, attrs=None, renderer=None):
        entries = [
            '<div class="input-group">',
            self.data_widget.render(name, value, attrs),
            self.choices_widget.render(name + '-PREFILL_CHOICES', value, attrs),
            '</div>'
        ]
        return '\n'.join(entries)


# Read-only widget for existing models.
class DisplayText(RequestWidget):

    print_list_tpl = {
        # @note: when changing to ['tpl']['v'], one has to set flatatt() name index.
        'top': '<ul{0}>{1}</ul>\n',
        'v': '<li class="list-group-item preformatted">{v}</li>\n',
    }

    def __init__(
            self, attrs=None, scalar_display=None, get_text_fn=None, get_text_method=None, layout='table',
            print_list_tpl=None
    ):
        if print_list_tpl is not None:
            self.print_list_tpl = print_list_tpl
        self.name = None
        self.skip_output = False
        self.scalar_display = {
            None: '',
            True: _('Yes'),
            False: _('No')
        }
        if scalar_display is not None:
            self.scalar_display.update(scalar_display)
        self.get_text_fn = get_text_fn
        self.get_text_method = get_text_method
        self.layout = layout
        super().__init__(attrs)

    def get_text(self, value):
        if isinstance(value, (date, datetime)):
            return format_local_date(value)
        else:
            return force_str(value)

    def add_list_attrs(self, final_attrs):
        add_css_classes_to_dict(final_attrs, 'list-group')

    def add_scalar_attrs(self, final_attrs):
        add_css_classes_to_dict(final_attrs, 'preformatted')

    def render_list(self, final_attrs, values, display_values):
        print_list_tpl = self.print_list_tpl.copy()
        print_list_tpl['top'] = print_list_tpl['top'].format(flatatt(final_attrs), '{0}')
        return PrintList(
            tpl=print_list_tpl,
            cb=lambda value: self.get_text(value)
        ).nested(display_values)

    def render_scalar(self, final_attrs, value, display_value):
        return format_html(
            '<span{}>{}</span>',
            flatatt(final_attrs),
            self.get_text(display_value)
        )

    def get_print_list_kwargs(self, model):
        kwargs = {
            'show_keys': True,
            'i18n': model_fields_verbose_names(model)
        }
        return kwargs

    def to_display_value(self, value):
        if hasattr(self, 'choices'):
            for choice_val, choice_display in self.choices:
                if choice_val == value:
                    return choice_display
        return value

    def get_display_values(self, values):
        display_values = copy(values)
        for value_key, value in enumerate(values):
            display_value = self.to_display_value(value)
            if display_value in self.scalar_display:
                display_value = self.scalar_display[display_value]
            display_values[value_key] = display_value
        return display_values

    # todo: Support Django renderer.
    def render(self, name, value, attrs=None, renderer=None):
        """
        if hasattr(self, 'instance'):
            sdv.dbg('instance', self.instance)
        sdv.dbg('name', name)
        if name == 'projectmember_set-0-profile':
            sdv.dbg('name', name)
        """
        # Save self.name so it may be used in get_text callback.
        self.name = name

        if self.get_text_method is not None:
            self.get_text = types.MethodType(self.get_text_method, self)
        elif self.get_text_fn is not None:
            self.get_text = self.get_text_fn
        elif hasattr(self, 'instance') and hasattr(self.instance, name):
            field = getattr(self.instance, name)
            if hasattr(field, 'get_str_fields'):
                request = self.get_request()
                str_fields = ObjDict.from_obj(obj=field, request_user=request.user).get_str_fields()
                print_list_kwargs = self.get_print_list_kwargs(field)
                if len(str_fields) < 4:
                    return print_list_group(str_fields, **print_list_kwargs)
                else:
                    return print_bs_well(str_fields, **print_list_kwargs)

        is_list = isinstance(value, list)
        display_values = self.get_display_values(value) if is_list else self.get_display_values([value])
        final_attrs = self.build_attrs(attrs, {'name': name})
        remove_css_classes_from_dict(final_attrs, 'form-control')

        if is_list:
            self.add_list_attrs(final_attrs)
            return self.render_list(final_attrs, value, display_values)
        else:
            self.add_scalar_attrs(final_attrs)
            return self.render_scalar(final_attrs, value, display_values[0])


class BaseGridWidget(UiBaseGridWidget, RequestWidget):

    allow_multiple_selected = None
    required = None
    template_options = None

    def __init__(self, attrs=None, grid_options=None, widget_view_kwargs=None):
        if grid_options is None:
            grid_options = {}
        self.widget_view_kwargs = widget_view_kwargs
        if attrs is not None:
            if 'required' in attrs:
                self.required = attrs.pop('required')
            if 'classPath' in attrs:
                self.js_classpath = attrs.pop('classPath')
            if 'data-template-id' in attrs:
                self.template_id = attrs.pop('data-template-id')
            if 'data-template-options' in attrs:
                self.template_options = attrs.pop('data-template-options')
        self.component_options = {'fkGridOptions': deepcopy(grid_options)}
        super().__init__(attrs=attrs)

    def get_initial_fk_grid_queryset(self, widget_view, value):
        raise NotImplementedError

    def get_component_attrs(self):
        component_attrs = {
            'class': 'component',
            'data-component-options': to_json(self.component_options),
        }
        if self.js_classpath is not None:
            component_attrs['data-component-class'] = self.js_classpath
        if self.template_id is not None:
            component_attrs['data-template-id'] = self.template_id
        if self.template_options is not None:
            component_attrs['data-template-options'] = self.template_options
        return component_attrs

    # When current view kwargs are incompatible to widget view kwargs, override these via .widget_view_kwargs.
    def get_widget_view_kwargs(self):
        if self.widget_view_kwargs is None:
            return {} if self.request.resolver_match is None else self.request.resolver_match.kwargs
        else:
            return self.widget_view_kwargs

    def get_context(self, name, value, attrs):
        # Do not call ChoiceWidget.get_context() as it would try to serialize the whole fk queryset, which may be huge.
        context = Widget.get_context(self, name, value, attrs)
        widget_ctx = context['widget']
        remove_css_classes_from_dict(widget_ctx['attrs'], 'form-control')
        widget_ctx['attrs']['type'] = 'hidden'
        widget_ctx['value'] = value

        # Autodetect foreign key widgets fkGridOptions.
        self.request = self.get_request()
        widget_view_cls, widget_view_kwargs = resolve_grid(
            request=self.request,
            view_options=self.component_options['fkGridOptions']
        )
        widget_view = widget_view_cls(**widget_view_kwargs)
        foreign_key_grid_options = widget_view.discover_grid_options(
            self.request, self.component_options['fkGridOptions']
        )
        foreign_key_grid_options['selectMultipleRows'] = self.allow_multiple_selected
        widget_view.setup(self.request, **self.get_widget_view_kwargs())
        foreign_key_grid_options['pkField'] = widget_view.pk_field

        if value is None:
            initial_fk_rows = []
        else:
            if isinstance(value, (QuerySet, RawQuerySet, ListQuerySet)):
                fk_qs = value
            else:
                fk_qs = self.get_initial_fk_grid_queryset(widget_view, value)
            initial_fk_rows = widget_view.postprocess_qs(fk_qs)

        self.component_options.update({
            'attrs': widget_ctx['attrs'],
            'isRequired': widget_ctx['required'] if self.required is None else self.required,
            'initialFkRows': initial_fk_rows,
            'clickActions': widget_view.vm_get_actions('click'),
            'name': name,
        })

        # Update widget grid_options with recursively detected fkGridOptions, if any.
        sdv.nested_update(self.component_options['fkGridOptions'], foreign_key_grid_options)
        widget_ctx['component_attrs'] = self.get_component_attrs()
        return context

    def render(self, name, value, attrs=None, renderer=None):
        context = self.get_context(name, value, attrs)
        result = format_html_attrs(
            self.component_template_str, **context['widget']
        )
        return result


#  Similar to django.admin FilteredSelectMultiple but is Knockout.js driven.
class MultipleKeyGridWidget(BaseGridWidget):

    allow_multiple_selected = True
    required = False

    def get_initial_fk_grid_queryset(self, widget_view, value):
        filter_kwargs = {
            widget_view.pk_field + '__in': value
        }
        return widget_view.get_base_queryset().filter(**filter_kwargs)


# Similar to django.admin ForeignKeyRawIdWidget but is Knockout.js driven.
class ForeignKeyGridWidget(BaseGridWidget):

    allow_multiple_selected = False

    def get_initial_fk_grid_queryset(self, widget_view, value):
        filter_kwargs = {
            widget_view.pk_field: value
        }
        return widget_view.get_base_queryset().filter(**filter_kwargs)
