import pytz
import lxml.html
from lxml import etree
from ensure import ensure_annotations
from datetime import date, datetime
from urllib.parse import urlencode

from django.utils import formats, timezone
from django.utils.html import escape, mark_safe
from django.core.urlresolvers import resolve, reverse, NoReverseMatch, get_resolver, get_script_prefix

from .utils.sdv import get_cbv_from_dispatch_wrapper, yield_ordered_values


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


# Print nested HTML list.
def print_list(row, elem_tpl='<li>{0}</li>\n', top_tpl='<ul>{0}</ul>\n', cb=escape):
    result = []
    for elem in yield_ordered_values(row):
        if hasattr(elem, '__iter__') and not isinstance(elem, (str, bytes)):
            result.append(print_list(elem, elem_tpl, top_tpl, cb))
        else:
            result.append(elem_tpl.format(cb(elem) if callable(cb) else elem))
    return top_tpl.format(''.join(result))


# Print uniform 2D table.
def print_table(rows, top_tpl='<table>{0}</table>\n', row_tpl='<tr>{0}</tr>\n', elem_tpl='<td>{0}</td>\n', cb=escape):
    rows_str = ''.join([print_list(row, elem_tpl=elem_tpl, top_tpl=row_tpl, cb=cb) for row in rows])
    return top_tpl.format(rows_str)


def print_bs_labels(row, bs_type='info', cb=escape):
    # See app.css how .conditional-display can be displayed as block element or inline element
    # via outer .display-block / .display-inline classes.
    return mark_safe(
        print_list(
            row,
            elem_tpl='<span class="label label-' + bs_type + ' preformatted">{0}</span><span class="conditional-display"></span>',
            top_tpl='{0}',
            cb=cb
        )
    )


def print_bs_badges(row, cb=escape):
    # See app.css how .conditional-display can be displayed as block element or inline element
    # via outer .display-block / .display-inline classes.
    return mark_safe(
        print_list(
            row,
            elem_tpl='<span class="badge preformatted">{0}</span><span class="conditional-display"></span>',
            top_tpl='{0}',
            cb=cb
        )
    )


def print_bs_well(row, cb=escape):
    # See app.css how .conditional-display can be displayed as block element or inline element
    # via outer .display-block / .display-inline classes.
    return mark_safe(
        print_list(
            row,
            elem_tpl='<span class="badge preformatted">{0}</span><span class="conditional-display"></span>',
            top_tpl='<div class="well well-condensed well-sm">{0}</div>',
            cb=cb
        )
    )


def print_list_group(row, cb=escape):
    return mark_safe(
        print_list(
            row,
            elem_tpl='<li class="list-group-item">{0}</li>\n',
            top_tpl='<ul class="list-group">{0}</ul>\n',
            cb=cb
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
