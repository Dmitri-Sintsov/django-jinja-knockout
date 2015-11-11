from django.utils.html import escape, mark_safe
from django.core.urlresolvers import reverse
from urllib.parse import urlencode


def limitstr(value, maxlen=50, suffix='...'):
    return '{0}{1}'.format(value[:maxlen - len(suffix)], suffix) if len(value) > maxlen else value


def print_list(row, elem_tpl='<li>{0}</li>\n', top_tpl='<ul>{0}</ul>\n', cb=escape):
    row_str = ''.join([elem_tpl.format(cb(elem) if callable(cb) else elem) for elem in row])
    return top_tpl.format(row_str)


def print_table(rows, top_tpl='<table>{0}</table>\n', row_tpl='<tr>{0}</tr>\n', elem_tpl='<td>{0}</td>\n', cb=escape):
    rows_str = ''.join([print_list(row, elem_tpl=elem_tpl, top_tpl=row_tpl, cb=cb) for row in rows])
    return top_tpl.format(rows_str)


def print_bs_labels(row, bs_type='info'):
    # See app.css how .conditional-display can be displayed as block element or inline element
    # via outer .display-block / .display-inline classes.
    return mark_safe(print_list(row, elem_tpl='<span class="label label-' + bs_type + ' preformatted">{0}</span><span class="conditional-display"></span>', top_tpl='{0}'))


# http://www.mobile-web-consulting.de/post/3921808264/construct-url-with-query-parameters-in-django-with
def reverseq(viewname, urlconf=None, args=None, kwargs=None, current_app=None, query=None):
    # https://docs.djangoproject.com/en/1.8/ref/urlresolvers/#reverse
    url = reverse(viewname, urlconf, args, kwargs, current_app)
    return url if query is None else url + '?' + urlencode(query)


def add_css_classes(existing_classes=None, new_classes=''):
    existing_set = set([]) if existing_classes is None else set(existing_classes.split(' '))
    new_set = set(new_classes.split(' '))
    result = ' '.join(list(existing_set | new_set)).strip()
    if result == '' and existing_classes is None:
        return None
    return result


def remove_css_classes(existing_classes=None, remove_classes=''):
    existing_set = set([]) if existing_classes is None else set(existing_classes.split(' '))
    remove_set = set(remove_classes.split(' '))
    result = ' '.join(list(existing_set - remove_set)).strip()
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
