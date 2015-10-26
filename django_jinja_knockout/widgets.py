from QuestPC import sdv
from .tpl import print_list, add_css_classes_to_dict, remove_css_classes_from_dict
import types
from django.utils.encoding import force_text
from django.utils.html import format_html
from django.forms.utils import flatatt
from django.forms.widgets import Widget, CheckboxInput, Textarea, MultiWidget


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
        self.scalar_display = {
            None: '',
            True: 'Да',
            False: 'Нет'
        }
        if scalar_display is not None:
            self.scalar_display.update(scalar_display)
        self.get_text_cb = get_text_cb
        self.layout = layout
        super().__init__(attrs)

    def get_text(self, value):
        return force_text(value)

    def render(self, name, values, attrs=None):
        """
        if hasattr(self, 'instance'):
            sdv.dbg('instance', self.instance)
        sdv.dbg('name', name)
        if name == 'projectmember_set-0-profile':
            sdv.dbg('name', name)
        """
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
            add_css_classes_to_dict(final_attrs, 'list-group')
            return print_list(
                # @note: when changing to elem_tpl, one has to set flatatt() name index.
                top_tpl='<ul{0}>{1}</ul>\n'.format(flatatt(final_attrs), '{0}'),
                elem_tpl='<li class="list-group-item preformatted">{0}</li>\n',
                row=values,
                cb=lambda value: self.get_text(value)
            )
        else:
            add_css_classes_to_dict(final_attrs, 'preformatted')
            return format_html(
                '<div{}>{}</div>',
                flatatt(final_attrs),
                self.get_text(values[0])
            )
