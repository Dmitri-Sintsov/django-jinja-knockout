import types
from django.utils.translation import gettext as _
from django.utils.encoding import force_text
from django.utils.html import format_html
from django.forms.utils import flatatt
from django.forms.widgets import Widget, CheckboxInput, Textarea, MultiWidget
from .utils import sdv
from .tpl import print_list, add_css_classes_to_dict, remove_css_classes_from_dict
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


# Read-only widget for existing models.
class DisplayText(Widget):

    def __init__(self, attrs=None, scalar_display=None, get_text_cb=None, layout='table'):
        self.name = None
        self.scalar_display = {
            None: '',
            True: _('Yes'),
            False: _('No')
        }
        if scalar_display is not None:
            self.scalar_display.update(scalar_display)
        self.get_text_cb = get_text_cb
        self.layout = layout
        super().__init__(attrs)

    def get_text(self, value):
        return force_text(value)

    def add_list_attrs(self, final_attrs):
        add_css_classes_to_dict(final_attrs, 'list-group')

    def add_scalar_attrs(self, final_attrs):
        add_css_classes_to_dict(final_attrs, 'preformatted')

    def render_list(self, final_attrs, values):
        return print_list(
            # @note: when changing to elem_tpl, one has to set flatatt() name index.
            top_tpl='<ul{0}>{1}</ul>\n'.format(flatatt(final_attrs), '{0}'),
            elem_tpl='<li class="list-group-item preformatted">{0}</li>\n',
            row=values,
            cb=lambda value: self.get_text(value)
        )

    def render_scalar(self, final_attrs, value):
        return format_html(
            '<div{}>{}</div>',
            flatatt(final_attrs),
            self.get_text(value)
        )

    def render(self, name, values, attrs=None):
        """
        if hasattr(self, 'instance'):
            sdv.dbg('instance', self.instance)
        sdv.dbg('name', name)
        if name == 'projectmember_set-0-profile':
            sdv.dbg('name', name)
        """
        # Save self.name so it may be used in get_text_cb callback.
        self.name = name
        is_list = type(values) is list
        if not is_list:
            values = [values]
        if hasattr(self, 'choices'):
            for value_key, value in enumerate(values):
                for choice_val, choice_display in self.choices:
                    if choice_val == value:
                        value = choice_display
                        break
                if value in self.scalar_display:
                    value = self.scalar_display[value]
                values[value_key] = value
        else:
            for value_key, value in enumerate(values):
                if value in self.scalar_display:
                    value = self.scalar_display[value]
                values[value_key] = value
        final_attrs = self.build_attrs(attrs, name=name)
        remove_css_classes_from_dict(final_attrs, 'form-control')
        if callable(self.get_text_cb):
            self.get_text = types.MethodType(self.get_text_cb, self)
        if is_list:
            self.add_list_attrs(final_attrs)
            return self.render_list(final_attrs, values)
        else:
            self.add_scalar_attrs(final_attrs)
            return self.render_scalar(final_attrs, values[0])


class ForeignKeyGridWidget(DisplayText):

    def __init__(self, attrs=None, scalar_display=None, grid_options={}):
        super().__init__(attrs=attrs, scalar_display=scalar_display, layout='div')
        self.grid_options = grid_options
        if 'classPath' not in self.grid_options:
            self.grid_options['classPath'] = 'App.FkGridWidget'

    def add_list_attrs(self, final_attrs):
        raise ValueError('ForeignKeyGridWidget cannot have multiple values')

    def render_list(self, final_attrs, values):
        raise ValueError('ForeignKeyGridWidget cannot have multiple values')

    def add_scalar_attrs(self, final_attrs):
        pass

    def render_scalar(self, final_attrs, value):
        final_attrs['type'] = 'hidden'
        return format_html(
            '<div {wrapper_attrs}>'
                '<input {final_attrs}/>'
                '<div class="render badge preformatted">{value}</div>'
                '<button class="btn btn-info default-margin">{change}</button>'
            '</div>',
            wrapper_attrs=flatatt({
                'class': 'component',
                'data-component-options': to_json(self.grid_options),
            }),
            change=_('Change'),
            value=self.get_text(value),
            final_attrs=flatatt(final_attrs)
        )
