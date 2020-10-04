from django import forms
from .. import widgets #DisplayText, PrefillWidget


def is_visible_field(model_field):
    return not isinstance(model_field, forms.HiddenInput)


def is_triggered_field(model_field):
    return \
        is_checkbox_field(model_field) or \
        is_radio_field(model_field) or \
        isinstance(model_field.widget, forms.CheckboxSelectMultiple)


def is_select_multiple_field(model_field):
    return isinstance(model_field.widget, forms.SelectMultiple) and \
        not isinstance(model_field.widget, forms.CheckboxSelectMultiple)


def is_displaytext_field(model_field):
    return isinstance(model_field.widget, widgets.DisplayText)


def is_prefill_field(model_field):
    return isinstance(model_field.widget, widgets.PrefillWidget)


def filter_get_display_layout(field):
    return field.field.widget.layout if is_displaytext_field(field.field) else ''


def is_checkbox_field(model_field):
    return isinstance(model_field.widget, forms.CheckboxInput)


def filter_is_checkbox(field):
    return is_checkbox_field(field.field)


def is_multiple_checkbox_field(model_field):
    return isinstance(model_field.widget, forms.CheckboxSelectMultiple)


def filter_is_multiple_checkbox(field):
    return is_multiple_checkbox_field(field.field)


def is_radio_field(model_field):
    return isinstance(model_field.widget, forms.RadioSelect)


def filter_is_radio(field):
    return is_radio_field(field.field)


def is_file_field(model_field):
    return isinstance(model_field.widget, forms.FileInput)


def filter_is_file(field):
    return is_file_field(field.field)


filters = {
    'get_display_layout': filter_get_display_layout,
    'is_checkbox': filter_is_checkbox,
    'is_file': filter_is_file,
    'is_multiple_checkbox': filter_is_multiple_checkbox,
    'is_radio': filter_is_radio,
}
