from django import forms
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _
from django.db import models

from ..admin import empty_value_display
from ..models import get_related_field


# Used to validate values of submitted filter fields.
class FieldValidator:

    field_types = (
        # Order is important, because DateTimeField is ancestor of DateField.
        (
            'DateTimeField',
            'datetime',
            None
        ),
        (
            'DateField',
            'date',
            None
        ),
        (
            'DecimalField',
            'number',
            None
        ),
        (
            'IntegerField',
            'number',
            None
        ),
    )

    def __init__(self, view, fieldname, model_class=None):
        self.view = view
        self.model_field = get_related_field(view.model if model_class is None else model_class, fieldname)
        self.form_field, self.field_filter_type = self.get_form_field()

    def get_form_field(self):
        for model_field_type, field_filter_type, form_field_type in self.field_types:
            model_field = getattr(models, model_field_type)
            if isinstance(self.model_field, model_field):
                # Use the same field type from forms by default.
                if form_field_type is None:
                    return model_field().formfield(localize=True, required=False), field_filter_type
                else:
                    return (
                        getattr(forms, form_field_type)(localize=True, required=False),
                        field_filter_type
                    )
        return None, None

    def set_auto_id(self, lookup):
        if self.form_field is None:
            return
        self.form_field.auto_id = None
        if lookup == 'gte':
            self.form_field.auto_id = 'id_range_from'
        elif lookup == 'lte':
            self.form_field.auto_id = 'id_range_to'

    def clean(self, value):
        try:
            if self.form_field is None:
                return value, False
            else:
                cleaned_value = self.form_field.clean(value)
                is_blank = cleaned_value is None and self.form_field.required is not True
                return cleaned_value, is_blank
        except ValidationError as e:
            if self.form_field.auto_id is None:
                self.view.report_error(str(e))
            else:
                self.form_field.errors = e.messages
                self.view.error(
                    {
                        'view': self.view.viewmodel_name,
                        'has_errors': True,
                    },
                    self.view.get_field_error_viewmodel(self.form_field)
                )

    # Detect type of filter.
    # Override in child class to add new type of custom filters.
    # Implement "App.ko.Grid.iocKoFilter_custom_type" method at client-side.
    def detect_field_filter(self, filter_def):
        # Model.choices should have preference over self.field_filter_type because integer fields
        # may have choice attribute, which should have preference over 'number' filter.
        if hasattr(self.model_field, 'choices') and len(self.model_field.choices) > 0:
            filter_def['choices'] = self.model_field.choices
            return {
                'type': 'choices',
            }
        elif self.field_filter_type is not None:
            return {
                'type': self.field_filter_type
            }
        elif isinstance(self.model_field, models.ForeignKey):
            # Use App.ko.FkGridFilter to select filter choices.
            return {
                'type': 'fk',
                'multiple_choices': True
            }
        elif isinstance(self.model_field, (models.BooleanField, models.NullBooleanField)):
            filter_def['choices'] = [
                (True, _('Yes')),
                (False, _('No'))
            ]
            if isinstance(self.model_field, models.NullBooleanField):
                filter_def['choices'].append(
                    (None, str(empty_value_display))
                )
            return {
                'type': 'choices'
            }
        else:
            self.view.report_error(
                'Cannot determine the type of filter for the field "{}"', str(self.model_field)
            )
