from inspect import trace
import lxml.html
from lxml import etree
from ensure import ensure_annotations
from datetime import date, datetime
from urllib.parse import urlencode

from django.utils import formats
from django.utils.html import escape, mark_safe
from django.core.urlresolvers import resolve, reverse, NoReverseMatch

from .utils.sdv import get_cbv_from_dispatch_wrapper, yield_ordered_values, get_nested


def limitstr(value, maxlen=50, suffix='...'):
    return '{0}{1}'.format(value[:maxlen - len(suffix)], suffix) if len(value) > maxlen else value

# Insert separator to s between each specified left to right.
@ensure_annotations
def repeat_insert(s:str, separator:str=' ', each:int=3):
    return ' '.join(s[i:i+each] for i in range(0, len(s), each))

# Insert separator to s between each specified right to left.
@ensure_annotations
def repeat_insert_rtl(s:str, separator:str=' ', each:int=3):
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


def add_css_classes(existing_classes=None, new_classes=''):
    existing_list = [] if existing_classes is None else existing_classes.split(' ')
    new_list = new_classes.split(' ')
    result_dict = {css_class:False for css_class in set(existing_list) | set(new_list)}
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


def format_local_date(value, format=None, use_l10n=None):
    if isinstance(value, datetime):
        combined = value
        if format is None:
            format = 'SHORT_DATETIME_FORMAT'
    elif isinstance(value, date):
        combined = datetime.combine(value, datetime.min.time())
        if format is None:
            format = 'SHORT_DATE_FORMAT'
    else:
        raise ValueError('Value must be instance of date or datetime')
    return formats.date_format(combined, format, use_l10n)


# http://www.mobile-web-consulting.de/post/3921808264/construct-url-with-query-parameters-in-django-with
def reverseq(viewname, urlconf=None, args=None, kwargs=None, current_app=None, query=None):
    # https://docs.djangoproject.com/en/1.8/ref/urlresolvers/#reverse
    url = reverse(viewname, urlconf, args, kwargs, current_app)
    return url if query is None else url + '?' + urlencode(query)


def resolve_cbv(url_name, kwargs):
    url = reverse(url_name, kwargs=kwargs)
    view_fn = resolve(url)[0]
    if not hasattr(view_fn, '__wrapped__'):
        return view_fn
    return get_cbv_from_dispatch_wrapper(view_fn)


# reverse url via supplied url_name with kwargs formatted as print %s named args, not regexp capture patterns.
def get_formatted_url(url_name):
    try:
        return reverse(url_name)
    except NoReverseMatch as e:
        # Current pattern has named parameters. Translate these to Python str.format() / Javascript
        # sprintf() library format.
        # todo: Find a cleaner, faster way to find pattern result not using trace frames.
        caller = trace()[-1:]
        f_locals = get_nested(caller, [0, 0, 'f_locals'])
        if type(f_locals) is dict and 'result' in f_locals:
            if 'prefix_norm' in f_locals:
                # Django 1.8
                prefix = f_locals['prefix_norm']
            else:
                # Django 1.9 / 1.10
                prefix = f_locals['_prefix']
            return '{}{}'.format(prefix, f_locals['result'])
        else:
            raise ValueError('Unable to get formatted url for url name %s'.format(url_name))
