__version__ = '0.2.0'


# Required by Bootstrap datetimepicker to work with 'en' locales.
def set_datetime_12_hour_format():
    from django.conf import settings
    from django.utils.formats import get_format, _format_cache
    datetime_formats = get_format('DATETIME_INPUT_FORMATS', settings.LANGUAGE_CODE, settings.USE_L10N)
    for key in _format_cache:
        if key[0] == 'DATETIME_INPUT_FORMATS':
            _format_cache[key] += ('%m/%d/%Y %I:%M %p',)

set_datetime_12_hour_format()
