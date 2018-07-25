# Derived from https://github.com/samuelcolvin/django-jinja-bootstrap-form
# Copyright (c) Samuel Colvin, Ming Hsien Tzang and individual contributors.
# All rights reserved.

import bleach
from django.utils.html import escape
from django import forms
from django_jinja import library
from .. import tpl
from django.utils.translation import ugettext as _
from django.utils.safestring import mark_safe
from ..widgets import DisplayText, PrefillWidget
from ..viewmodels import to_json

# http://niwinz.github.io/django-jinja/#_registring_filters_in_a_django_way


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


@library.filter
def is_displaytext(field):
    return is_displaytext_field(field.field)


@library.filter
def get_display_layout(field):
    return field.field.widget.layout if is_displaytext_field(field.field) else ''


def is_checkbox_field(model_field):
    return isinstance(model_field.widget, forms.CheckboxInput)


@library.filter
def is_checkbox(field):
    return is_checkbox_field(field.field)


def is_multiple_checkbox_field(model_field):
    return isinstance(model_field.widget, forms.CheckboxSelectMultiple)


@library.filter
def is_multiple_checkbox(field):
    return is_multiple_checkbox_field(field.field)


def is_radio_field(model_field):
    return isinstance(model_field.widget, forms.RadioSelect)


@library.filter
def is_radio(field):
    return is_radio_field(field.field)


def is_file_field(model_field):
    return isinstance(model_field.widget, forms.FileInput)


@library.filter
def is_file(field):
    return is_file_field(field.field)


@library.filter
def get_type(val):
    return val.__class__.__name__


@library.filter
def linkify(text):
    return mark_safe(bleach.linkify(escape(text)))


@library.filter
def escapejs(val, view_error=False):
    if view_error:
        try:
            json_str = to_json(val)
        except TypeError as e:
            json_str = to_json({
                'onloadViewModels': {
                    'view': 'alert_error',
                    'title': 'escapejs TypeError',
                    'message': str(e)
                }
            })
    else:
        json_str = to_json(val)
    return mark_safe(
        json_str.replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')
    )
