from copy import copy
import types
import inspect
from datetime import date, datetime

from django.utils.translation import gettext as _
from django.utils.encoding import force_text
from django.utils.html import format_html
from django.forms.utils import flatatt
from django.forms.widgets import (
    ChoiceInput, CheckboxInput, RadioFieldRenderer,
    Widget, RadioSelect, Textarea, MultiWidget
)

from .apps import DjkAppConfig
from .models import model_fields_verbose_names
from .tpl import (
    print_list, print_list_group, print_bs_well,
    add_css_classes_to_dict, remove_css_classes_from_dict,
    format_local_date,
    resolve_cbv
)
from .viewmodels import to_json


class OptionalWidget(MultiWidget):

    def __init__(self, widget_class=Textarea, attrs=None):
        if attrs is None:
            attrs = {}
        add_css_classes_to_dict(attrs, 'optional-input')
        # Separate classes for child widgets are unused because it seems that Django 1.8 does not support these.
        # Ugly fix is provided in plugins.js instead.
        widgets = (CheckboxInput(), widget_class(),)
        super().__init__(widgets, attrs=attrs)

    def decompress(self, value):
        if not value:
            return [False, '']
        return [value != '', value]


class PrefillChoice(ChoiceInput):

    def render(self, name=None, value=None, attrs=None, choices=()):
        attrs = dict(self.attrs, **attrs) if attrs else self.attrs
        return format_html('{}', self.choice_label)


class PrefillFieldRenderer(RadioFieldRenderer):
    '<span class="icon-bar"></span>'
    '<span class="icon-bar"></span>'

    choice_input_class = PrefillChoice
    outer_html = (
        '<span class="input-group-addon">'
        '<div class="dropdown-toggle pointer" data-toggle="dropdown" type="button" aria-expanded="false">'
        '<span class="glyphicon glyphicon-chevron-down"></span>'
        '</div>'
        '<ul class="prefill-field dropdown-menu dropdown-menu-right dropdown-menu-vscroll" {id_attr}>{content}</ul>'
        '</span>'
    )
    inner_html = '<li><a name="#">{choice_value}{sub_widgets}</a></li>'

    def __init__(self, name, value, final_attrs, choices):
        if 'id' in final_attrs:
            final_attrs['id'] += '-PREFILL_CHOICES'
        super().__init__(name, value, final_attrs, choices)

    def _render(self):
        id_ = self.attrs.get('id', None)
        output = []
        for i, choice in enumerate(self.choices):
            choice_value, choice_label = choice
            if isinstance(choice_label, (tuple, list)):
                pass


class PrefillRadioSelect(RadioSelect):

    renderer = PrefillFieldRenderer


class PrefillWidget(Widget):

    def __init__(self, widget_class=Textarea, widget_attrs={}, choices=None, choices_attrs={}):
        add_css_classes_to_dict(widget_attrs, 'form-control')
        if widget_class is Textarea:
            add_css_classes_to_dict(widget_attrs, 'autogrow')
            if 'rows' not in widget_attrs:
                widget_attrs['rows'] = '2'
        self.data_widget = widget_class(widget_attrs)
        self.choices_widget = PrefillRadioSelect(attrs=choices_attrs, choices=choices)
        super().__init__(attrs=widget_attrs)

    # todo: Support Django 1.11 renderer.
    def render(self, name, value, attrs=None, renderer=None):
        entries = [
            '<div class="input-group">',
            self.data_widget.render(name, value, attrs),
            self.choices_widget.render(name + '-PREFILL_CHOICES', value + '-PREFILL_CHOICES', attrs),
            '</div>'
        ]
        return '\n'.join(entries)


# Read-only widget for existing models.
class DisplayText(Widget):

    def __init__(self, attrs=None, scalar_display=None, get_text_fn=None, get_text_method=None, layout='table'):
        self.name = None
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
            return force_text(value)

    def add_list_attrs(self, final_attrs):
        add_css_classes_to_dict(final_attrs, 'list-group')

    def add_scalar_attrs(self, final_attrs):
        add_css_classes_to_dict(final_attrs, 'preformatted')

    def render_list(self, final_attrs, values, display_values):
        return print_list(
            # @note: when changing to elem_tpl, one has to set flatatt() name index.
            top_tpl='<ul{0}>{1}</ul>\n'.format(flatatt(final_attrs), '{0}'),
            elem_tpl='<li class="list-group-item preformatted">{0}</li>\n',
            row=display_values,
            cb=lambda value: self.get_text(value)
        )

    def render_scalar(self, final_attrs, value, display_value):
        return format_html(
            '<div{}>{}</div>',
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

    # todo: Support Django 1.11 renderer.
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
                str_fields = field.get_str_fields()
                print_list_kwargs = self.get_print_list_kwargs(field)
                if len(str_fields) < 4:
                    return print_list_group(str_fields, **print_list_kwargs)
                else:
                    return print_bs_well(str_fields, **print_list_kwargs)

        is_list = isinstance(value, list)
        display_values = self.get_display_values(value) if is_list else self.get_display_values([value])
        if 'base_attrs' in inspect.signature(self.build_attrs).parameters:
            # Django 1.11
            final_attrs = self.build_attrs(attrs, {'name': name})
        else:
            # Django 1.8..1.10
            final_attrs = self.build_attrs(attrs, name=name)
        remove_css_classes_from_dict(final_attrs, 'form-control')

        if is_list:
            self.add_list_attrs(final_attrs)
            return self.render_list(final_attrs, value, display_values)
        else:
            self.add_scalar_attrs(final_attrs)
            return self.render_scalar(final_attrs, value, display_values[0])


class ForeignKeyGridWidget(DisplayText):

    # Setting 'model' argument is required only for non-AJAX form submissions.
    def __init__(self, attrs=None, scalar_display=None, model=None, grid_options={}):
        super().__init__(attrs=attrs, scalar_display=scalar_display, layout='div')
        self.model = model
        self.grid_options = grid_options
        if 'classPath' not in self.grid_options:
            self.grid_options['classPath'] = 'App.FkGridWidget'

    def add_list_attrs(self, final_attrs):
        raise ValueError('ForeignKeyGridWidget cannot have multiple values')

    def render_list(self, final_attrs, values, display_values):
        raise ValueError('ForeignKeyGridWidget cannot have multiple values')

    def add_scalar_attrs(self, final_attrs):
        add_css_classes_to_dict(final_attrs, 'fk-value')

    def render_scalar(self, final_attrs, value, display_value):
        final_attrs['type'] = 'hidden'
        # Do not map None value to empty string, it will cause Django field int() conversion error.
        final_attrs['value'] = 0 if value is None else value

        # Autodetect foreign key widgets fkGridOptions.
        pageRouteKwargs = self.grid_options.get('pageRouteKwargs', {})
        pageRouteKwargs['action'] = ''
        widget_view = resolve_cbv(self.grid_options['pageRoute'], pageRouteKwargs)
        ContextMiddleware = DjkAppConfig.get_context_middleware()
        foreign_key_grid_options = widget_view.discover_grid_options(ContextMiddleware.get_request())

        # Update widget grid_options with recursively detected fkGridOptions, if any.
        self.grid_options.update(foreign_key_grid_options)
        if 'classPath' in self.grid_options:
            js_class_path = self.grid_options.pop('classPath')
        else:
            js_class_path = 'App.FkGridWidget'
        return format_html(
            '<div {wrapper_attrs}>'
            '<input {final_attrs}/>'
            '<div class="fk-display preformatted">{display_value}</div>'
            '<button class="fk-choose btn btn-info default-margin">{change}</button>'
            '</div>',
            wrapper_attrs=flatatt({
                'class': 'component',
                'data-component-class': js_class_path,
                'data-component-options': to_json(self.grid_options),
            }),
            final_attrs=flatatt(final_attrs),
            display_value=self.get_text(display_value),
            change=_('Change')
        )

    def to_display_value(self, value):
        if value == '0':
            return '-------'
        if self.model is not None:
            obj = self.model.objects.filter(pk=value).first()
            if obj is not None:
                if hasattr(self.model, 'get_str_fields'):
                    return print_bs_well(obj.get_str_fields(), **self.get_print_list_kwargs(obj.__class__))
                else:
                    return str(obj)
        return value
