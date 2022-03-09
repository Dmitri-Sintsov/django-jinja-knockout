__version__ = '2.0.0'

# Patch for Django datetime 'en' locales format to work with Bootstrap datetimepicker.
# Currently is disabled, because Bootstrap datetimepicker is patched instead
# in document.js via DatetimeWidget.formatFixes which is a more portable approach.
"""
def set_datetime_12_hour_format(lang_code, use_l10n):
    from django.utils.formats import get_format, _format_cache

    get_format('DATETIME_INPUT_FORMATS', lang_code, use_l10n)
    for key in _format_cache:
        if key[0] == 'DATETIME_INPUT_FORMATS':
            _format_cache[key] += ('%m/%d/%Y %I:%M %p',)


try:
    from django.core.exceptions import ImproperlyConfigured
    from django.conf import settings

    try:
        set_datetime_12_hour_format(settings.LANGUAGE_CODE, settings.USE_L10N)
    except ImproperlyConfigured:
        # Django is not configured yet.
        pass

except ImportError:
    # Django is not installed yet.
    pass
"""
