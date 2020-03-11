from copy import copy, deepcopy
import types
from datetime import date, datetime

from django.utils.translation import gettext as _
from django.utils.safestring import mark_safe
from django.utils.encoding import force_text
from django.utils.html import format_html
from django.forms.utils import flatatt
from django.forms.widgets import (CheckboxInput, Widget, ChoiceWidget, Textarea, MultiWidget)
from django.db.models.query import RawQuerySet, QuerySet

from .apps import DjkAppConfig
from .models import model_fields_verbose_names
from .query import ListQuerySet
from .tpl import (
    Renderer, PrintList, print_list_group, print_bs_well,
    add_css_classes_to_dict, remove_css_classes_from_dict,
    format_local_date,
    resolve_grid
)
from .utils import sdv
from .viewmodels import to_json


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


class PrefillDropdown(Widget):
    # todo: convert to template
    outer_html = (
        '<span class="prefill-field input-group-append input-group-addon pointer" {attrs}>'
        '<div class="dropdown-toggle" data-toggle="dropdown" type="button" aria-expanded="false">'
        '<span class="iconui iconui-chevron-down"></span>'
        '</div>'
        '<ul class="dropdown-menu dropdown-menu-right dropdown-menu-vscroll">{content}</ul>'
        '</span>'
    )
    inner_html = '<li><a name="#">{choice_label}</a></li>'

    def __init__(self, attrs, choices):
        self.choices = choices
        super().__init__(attrs)

    def render(self, name, value, attrs=None, renderer=None):
        self.attrs.update(attrs)
        if 'id' in self.attrs:
            self.attrs['id'] += '-PREFILL_CHOICES'
        output = []
        for _i, choice in enumerate(self.choices):
            choice_value, choice_label = choice
            output.append(
                format_html(self.inner_html, choice_value=choice_value, choice_label=choice_label)
            )
        return format_html(
            self.outer_html, content=mark_safe('\n'.join(output)), attrs=flatatt(self.attrs)
        )


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
class DisplayText(Widget):

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
            return force_text(value)

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
                str_fields = field.get_str_fields()
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


class BaseGridWidget(ChoiceWidget):

    allow_multiple_selected = None
    js_classpath = ''
    template_name = 'widget_fk_grid.htm'
    template_id = 'ko_fk_grid_widget'
    renderer_class = Renderer
    js_classpath = 'App.FkGridWidget'

    def __init__(self, attrs=None, grid_options: dict = None, template_options: dict = None):
        if grid_options is None:
            grid_options = {}
        self.component_options = {'fkGridOptions': deepcopy(grid_options)}
        self.template_options = template_options
        if 'classPath' in self.component_options:
            self.js_classpath = self.component_options.pop('classPath')
        super().__init__(attrs=attrs)

    def get_initial_fk_grid_queryset(self, widget_view, value):
        raise NotImplementedError

    def get_component_attrs(self):
        return {
            'class': 'component',
            'data-component-class': self.js_classpath,
            'data-component-options': to_json(self.component_options),
            'data-template-id': self.template_id,
        }

    def get_widget_view_kwargs(self):
        # It could fail when related_view kwargs are incompatible to view kwargs so use with care.
        return self.request.resolver_match.kwargs

    def get_context(self, name, value, attrs):
        context = super().get_context(name, value, attrs)
        widget_ctx = context['widget']
        remove_css_classes_from_dict(widget_ctx['attrs'], 'form-control')
        widget_ctx['attrs']['type'] = 'hidden'
        widget_ctx['value'] = value

        # Autodetect foreign key widgets fkGridOptions.
        ContextMiddleware = DjkAppConfig.get_context_middleware()
        self.request = ContextMiddleware.get_request()
        widget_view_cls = resolve_grid(
            request=self.request,
            view_options=self.component_options['fkGridOptions']
        )
        foreign_key_grid_options = widget_view_cls.discover_grid_options(self.request, self.template_options)
        foreign_key_grid_options['selectMultipleRows'] = self.allow_multiple_selected
        widget_view = widget_view_cls()
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
            'initialFkRows': initial_fk_rows,
            'name': name,
        })

        # Update widget grid_options with recursively detected fkGridOptions, if any.
        sdv.nested_update(self.component_options['fkGridOptions'], foreign_key_grid_options)
        widget_ctx.update({
            'component_attrs': self.get_component_attrs()
        })
        return context

    def ioc_renderer(self, context):
        return self.renderer_class(self.request, template=self.template_name, context=context)

    def render(self, name, value, attrs=None, renderer=None):
        """Render the widget as an HTML string."""
        context = self.get_context(name, value, attrs)
        renderer = self.ioc_renderer(context['widget'])
        return renderer.__str__()


#  Similar to django.admin FilteredSelectMultiple but is Knockout.js driven.
class MultipleKeyGridWidget(BaseGridWidget):

    allow_multiple_selected = True

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
