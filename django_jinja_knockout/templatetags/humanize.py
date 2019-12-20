from django.contrib.humanize.templatetags import humanize


filters = {
    'ordinal': humanize.ordinal,
    'intcomma': humanize.intcomma,
    'intword': humanize.intword,
    'apnumber': humanize.apnumber,
    'naturalday': humanize.naturalday,
    'naturaltime': humanize.naturaltime,
}
