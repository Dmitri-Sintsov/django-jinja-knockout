# Derived from https://github.com/samuelcolvin/django-jinja-bootstrap-form
# Copyright (c) Samuel Colvin, Ming Hsien Tzang and individual contributors.
# All rights reserved.

from django import forms
from .. import tpl
from django.utils.translation import ugettext as _
from ..widgets import DisplayText, PrefillWidget


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


def add_input_classes_to_field(model_field):
    classes = model_field.widget.attrs.get('class', '').strip()
    classnames = [] if classes == '' else classes.split(' ')
    # Do not add 'form-control' to bootstrap checkbox / radio, otherwise
    # they will look ugly.
    if 'form-control' not in classnames and is_visible_field(model_field) and not is_triggered_field(model_field):
        classnames.append('form-control')
    # Support autogrow plugin.
    if 'autogrow' not in classnames and isinstance(model_field.widget, forms.widgets.Textarea):
        classnames.append('autogrow')
        model_field.widget.attrs['rows'] = 2
    # Support bootstrap date / datetime plugin.
    if 'date-control' not in classnames and isinstance(model_field.widget, forms.widgets.DateInput):
        classnames.append('date-control')
    if 'datetime-control' not in classnames and isinstance(model_field.widget, forms.widgets.DateTimeInput):
        classnames.append('datetime-control')
    # Support PrefillWidget.
    if isinstance(model_field.widget, PrefillWidget):
        tpl.add_css_classes_to_dict(model_field.widget.data_widget.attrs, 'form-control')
    model_field.widget.attrs['class'] = ' '.join(classnames)
    if is_select_multiple_field(model_field):
        msg = _('Hold down "Control", or "Command" on a Mac, to select more than one.')
        help_text = model_field.help_text
        model_field.help_text = tpl.format_lazy('{} {}', help_text, msg) if help_text else msg


def is_displaytext_field(model_field):
    return isinstance(model_field.widget, DisplayText)


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


class BootstrapFilters:

    filters = {
        'get_display_layout': filter_get_display_layout,
        'is_checkbox': filter_is_checkbox,
        'is_file': filter_is_file,
        'is_multiple_checkbox': filter_is_multiple_checkbox,
        'is_radio': filter_is_radio,
    }
