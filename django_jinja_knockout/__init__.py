__version__ = '0.2.0'

from django.core.exceptions import ImproperlyConfigured

# Required by Bootstrap datetimepicker to work with 'en' locales.
def set_datetime_12_hour_format():
    from django.conf import settings
    from django.utils.formats import get_format, _format_cache
    try:
        get_format('DATETIME_INPUT_FORMATS', settings.LANGUAGE_CODE, settings.USE_L10N)
    except ImproperlyConfigured:
        # Not an error, but a pypi package installation mode.
        return
    for key in _format_cache:
        if key[0] == 'DATETIME_INPUT_FORMATS':
            _format_cache[key] += ('%m/%d/%Y %I:%M %p',)

set_datetime_12_hour_format()
