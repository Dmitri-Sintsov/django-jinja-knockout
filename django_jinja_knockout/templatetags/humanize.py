from django.contrib.humanize.templatetags import humanize


def filter_ordinal(source):
    return humanize.ordinal(source)


def filter_intcomma(source, use_l10n=True):
    return humanize.intcomma(source, use_l10n)


def filter_intword(source):
    return humanize.intword(source)


def filter_apnumber(source):
    return humanize.apnumber(source)


def filter_naturalday(source, arg=None):
    return humanize.naturalday(source, arg)


def filter_naturaltime(source):
    return humanize.naturaltime(source)


filters = {
    'ordinal': filter_ordinal,
    'intcomma': filter_intcomma,
    'intword': filter_intword,
    'apnumber': filter_apnumber,
    'naturalday': filter_naturalday,
    'naturaltime': filter_naturaltime,
}
