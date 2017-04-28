import json
import re
import pytz
import lxml.html
from lxml import etree
from ensure import ensure_annotations
from datetime import date, datetime
from urllib.parse import urlencode

from django.utils import formats, timezone
from django.utils.html import escape, mark_safe
from django.forms.utils import flatatt
try:
    # Django 1.11.
    import django.urls as urls
except ImportError:
    # Django 1.8..1.10.
    import django.core.urlresolvers as urls
for attr in ('resolve', 'reverse', 'NoReverseMatch', 'get_resolver', 'get_script_prefix'):
    globals()[attr] = getattr(urls, attr)

from .utils.sdv import iter_enumerate, get_cbv_from_dispatch_wrapper
from .utils.regex import finditer_with_separators


def limitstr(value, maxlen=50, suffix='...'):
    return '{0}{1}'.format(value[:maxlen - len(suffix)], suffix) if len(value) > maxlen else value


# Insert separator to s between each specified left to right.
@ensure_annotations
def repeat_insert(s: str, separator: str=' ', each: int=3):
    return ' '.join(s[i:i + each] for i in range(0, len(s), each))


# Insert separator to s between each specified right to left.
@ensure_annotations
def repeat_insert_rtl(s: str, separator: str=' ', each: int=3):
    reversed_insert = repeat_insert(s[::-1], separator, each)
    return reversed_insert[::-1]


PRINT_LIST_NO_KEYS = 0
PRINT_LIST_KEYS = 1
PRINT_LIST_REPEATED_KEYS = 2

# Print nested HTML list.
def print_list(
    row,
    elem_tpl='<li>{}</li>\n',
    key_tpl='<li><div>{k}</div>{v}</li>',
    top_tpl='<ul>{}</ul>\n',
    cb=escape, show_keys=PRINT_LIST_NO_KEYS, i18n={}
):
    result = []
    for key, elem in iter_enumerate(row, show_keys == PRINT_LIST_REPEATED_KEYS):
        if hasattr(elem, '__iter__') and not isinstance(elem, (str, bytes)):
            result.append(print_list(elem, elem_tpl, key_tpl, top_tpl, cb, show_keys, i18n))
        else:
            if show_keys > PRINT_LIST_NO_KEYS and not isinstance(key, int):
                key_val = i18n.get(key, key)
                result.append(
                    key_tpl.format(
                        k=cb(key_val) if callable(cb) else str(key_val),
                        v=elem
                    )
                )
            else:
                result.append(
                    elem_tpl.format(cb(elem) if callable(cb) else elem)
                )
    return top_tpl.format(''.join(result))


# Print uniform 2D table.
def print_table(
        rows,
        top_tpl='<table>{}</table>\n',
        row_tpl='<tr>{}</tr>\n',
        key_tpl='<td><div>{k}</div>{v}</td>\n',
        elem_tpl='<td>{}</td>\n',
        cb=escape, show_keys=PRINT_LIST_NO_KEYS, i18n={}
):
    rows_str = ''.join([
        print_list(
            row,
            elem_tpl=elem_tpl, key_tpl=key_tpl, top_tpl=row_tpl,
            cb=cb, show_keys=show_keys, i18n=i18n
        ) for row in rows
    ])
    return top_tpl.format(rows_str)


def print_bs_labels(row, bs_type='info', cb=escape, show_keys=PRINT_LIST_NO_KEYS, i18n={}):
    # See app.css how .conditional-display can be displayed as block element or inline element
    # via outer .display-block / .display-inline classes.
    return mark_safe(
        print_list(
            row,
            elem_tpl='<span class="label label-' + bs_type + ' preformatted">{}</span><span class="conditional-display"></span>',
            key_tpl='<span class="label label-' + bs_type + ' preformatted">{k}: {v}</span><span class="conditional-display"></span>',
            top_tpl='{}',
            cb=cb,
            show_keys=show_keys,
            i18n=i18n
        )
    )


def print_bs_badges(row, cb=escape, show_keys=PRINT_LIST_NO_KEYS, i18n={}):
    # See app.css how .conditional-display can be displayed as block element or inline element
    # via outer .display-block / .display-inline classes.
    return mark_safe(
        print_list(
            row,
            elem_tpl='<span class="badge preformatted">{}</span><span class="conditional-display"></span>',
            key_tpl='<span class="badge preformatted">{k}: {v}</span><span class="conditional-display"></span>',
            top_tpl='{}',
            cb=cb,
            show_keys=show_keys,
            i18n=i18n
        )
    )


def print_bs_well(row, cb=escape, show_keys=PRINT_LIST_NO_KEYS, i18n={}):
    # See app.css how .conditional-display can be displayed as block element or inline element
    # via outer .display-block / .display-inline classes.
    return mark_safe(
        print_list(
            row,
            elem_tpl='<span class="badge preformatted">{}</span><span class="conditional-display"></span>',
            key_tpl='<span class="badge preformatted">{k}: {v}</span><span class="conditional-display"></span>',
            top_tpl='<div class="well well-condensed well-sm">{}</div>',
            cb=cb,
            show_keys=show_keys,
            i18n=i18n
        )
    )


def print_list_group(row, cb=escape, show_keys=PRINT_LIST_NO_KEYS, i18n={}):
    return mark_safe(
        print_list(
            row,
            elem_tpl='<li class="list-group-item">{}</li>\n',
            key_tpl='<ul class="list-group"><div class="list-group-item list-group-item-success">{k}</div><div class="list-group-item list-group-item-info">{v}</div></ul>\n',
            top_tpl='<ul class="list-group">{}</ul>\n',
            cb=cb,
            show_keys=show_keys,
            i18n=i18n
        )
    )


def flatten_dict(d: dict, separator=' › ', only_keys=None, enclosure_fmt='({})'):
    r = d.__class__()
    for key in d:
        if (only_keys is not None and key not in only_keys) or not isinstance(d[key], dict):
            r[key] = d[key]
        else:
            r[key] = d[key].__class__()
            for k, v in d[key].items():
                if isinstance(v, dict):
                    rkv = str_dict(d[key][k], separator, None, enclosure_fmt)
                    if len(d[key][k]) > 1 and enclosure_fmt is not None:
                        rkv = enclosure_fmt.format(rkv)
                else:
                    rkv = d[key][k]
                r[key][k] = rkv
            kv = separator.join([str(val) for val in r[key].values()])
            if len(d[key]) > 1 and enclosure_fmt is not None:
                kv = enclosure_fmt.format(kv)
            r[key] = kv
    return r


def str_dict(d: dict, separator=' › ', only_keys=None, enclosure_fmt='({})'):
    flat_d = flatten_dict(d, separator, only_keys, enclosure_fmt)
    return separator.join(flat_d.values())


def add_css_classes(existing_classes=None, new_classes=''):
    existing_list = [] if existing_classes is None else existing_classes.split(' ')
    new_list = new_classes.split(' ')
    result_dict = {css_class: False for css_class in set(existing_list) | set(new_list)}
    result_list = []
    for css_class in existing_list + new_list:
        if result_dict[css_class] is False:
            result_dict[css_class] = True
            result_list.append(css_class)
    result = ' '.join(result_list).strip()
    if result == '' and existing_classes is None:
        return None
    return result


def remove_css_classes(existing_classes=None, remove_classes=''):
    existing_list = [] if existing_classes is None else existing_classes.split(' ')
    remove_set = set(remove_classes.split(' '))
    result_list = filter(lambda css_class: css_class not in remove_set, existing_list)
    result = ' '.join(result_list).strip()
    if result == '' and existing_classes is None:
        return None
    return result


def add_css_classes_to_dict(element, classnames, key='class'):
    element[key] = add_css_classes(element.get(key), classnames)


def remove_css_classes_from_dict(element, classnames, key='class'):
    result = remove_css_classes(element.get(key), classnames)
    if result is None:
        if key in element:
            del element[key]
    else:
        element[key] = result


# Convert html fragment with anchor links into plain text with text links.
def html_to_text(html):
    doc = lxml.html.fromstring(html)
    els = doc.xpath('//a[@href]')
    for el in els:
        if el.text != el.attrib['href']:
            href_span = etree.Element('span')
            href_span.text = ' ' + el.attrib['href']
            el.addnext(href_span)
    return doc.text_content()


def format_local_date(value, short_format=True, to_local_time=True, tz_name=None, use_l10n=None):
    if isinstance(value, datetime):
        combined = value
        format = 'SHORT_DATETIME_FORMAT' if short_format else 'DATETIME_FORMAT'
    elif isinstance(value, date):
        combined = datetime.combine(value, datetime.min.time())
        format = 'SHORT_DATE_FORMAT' if short_format else 'DATE_FORMAT'
    else:
        raise ValueError('Value must be instance of date or datetime')
    if timezone.is_aware(combined):
        if tz_name is not None:
            combined = combined.astimezone(pytz.timezone(tz_name))
        elif to_local_time:
            combined = timezone.localtime(combined)
    return formats.date_format(combined, format, use_l10n)


def verbose_date(value, **kwargs):
    return format_local_date(value, short_format=False, **kwargs)


# http://www.mobile-web-consulting.de/post/3921808264/construct-url-with-query-parameters-in-django-with
def reverseq(viewname, urlconf=None, args=None, kwargs=None, current_app=None, query=None, request=None):
    # https://docs.djangoproject.com/en/1.8/ref/urlresolvers/#reverse
    url = reverse(viewname, urlconf, args, kwargs, current_app)
    if query is not None:
        url += '?' + urlencode(query)
    return url if request is None else request.build_absolute_uri(url)


def resolve_cbv(url_name, kwargs):
    url = reverse(url_name, kwargs=kwargs)
    view_fn = resolve(url)[0]
    if not hasattr(view_fn, '__wrapped__'):
        return view_fn
    return get_cbv_from_dispatch_wrapper(view_fn)


# Convert url matching supplied url_name from regex named parameters (?P<arg>\w+) to sprintf named formatters %(arg)s.
def get_formatted_url(url_name):
    try:
        return reverse(url_name)
    except NoReverseMatch as e:
        # Url regex pattern has named parameters. Translate these to Javascript sprintf() library format.
        urlresolver = get_resolver(None)
        for matches, pat, defaults in urlresolver.reverse_dict.getlist(url_name):
            for sprintf_url, named_parameters in matches:
                return '{}{}'.format(get_script_prefix(), sprintf_url)
        raise NoReverseMatch('Cannot find sprintf formatted url for %s' % url_name)


def to_json(self):
    return json.dumps(self, ensure_ascii=False)


def json_flatatt(atts):
    for k, v in atts.items():
        if isinstance(v, (tuple, list, dict)):
            atts[k] = to_json(v)
    return flatatt(atts)

# https://developer.mozilla.org/en-US/docs/Web/API/CSS/escape
def escape_css_selector(s):
    delimiters = re.compile(r'(\'|\[|\]|\.|#|\(|\)|\{|\})')
    tokens = finditer_with_separators(delimiters, s)
    for key, token in enumerate(tokens):
        if delimiters.match(token):
            tokens[key] = '\\{}'.format(token)
    return ''.join(tokens)
