from copy import copy
import json
import re
import pytz
import lxml.html
from jinja2 import Undefined, DebugUndefined
from lxml import etree
from ensure import ensure_annotations
from datetime import date, datetime
from urllib.parse import urlencode

from django.core.serializers.json import DjangoJSONEncoder
from django.utils import formats, timezone
from django.utils.encoding import force_text, smart_text
from django.utils.functional import Promise, SimpleLazyObject
from django.utils.html import escape, mark_safe, format_html
from django.middleware import csrf
from django.template import loader as tpl_loader
from django.forms.utils import flatatt
from django.urls import (
    resolve, reverse, NoReverseMatch, get_resolver, get_script_prefix
)

from .utils import sdv
from .utils.regex import finditer_with_separators
from .models import model_fields_verbose_names
from .admin import empty_value_display

from djk_ui.tpl import (  # noqa: F401 imported but unused, used in Jinja2 templates
    print_bs_labels, print_bs_badges, print_bs_well, print_list_group, print_badge_list_group
)


PRINT_NO_KEYS = 0
PRINT_KEYS = 1
PRINT_REPEATED_KEYS = 2


def limitstr(value, maxlen=50, suffix='...'):
    s = str(value)
    return '{0}{1}'.format(s[:maxlen - len(suffix)], suffix) if len(s) > maxlen else s


# Insert separator to s between each specified left to right.
@ensure_annotations
def repeat_insert(s: str, separator: str = ' ', each: int = 3):
    return ' '.join(s[i:i + each] for i in range(0, len(s), each))


# Insert separator to s between each specified right to left.
@ensure_annotations
def repeat_insert_rtl(s: str, separator: str = ' ', each: int = 3):
    reversed_insert = repeat_insert(s[::-1], separator, each)
    return reversed_insert[::-1]


class Renderer:

    template = None
    obj_kwarg = None
    obj_template_attr = None

    def __init__(self, request, context=None):
        self.request = request
        # Shallow copy.
        self.context = {} if context is None else context.copy()
        self.obj = context[self.obj_kwarg] if self.obj_kwarg is not None and self.obj_kwarg in context else None

    def update_context(self, data):
        # Shallow copy.
        sdv.nested_update(self.context, data)

    # Caches context processors variables per request,
    # instead of calling context processors per each Renderer.__str__().
    def get_processors_context(self, template):
        if not hasattr(self.request, 'processors_context'):
            def get_csrf_token():
                token = csrf.get_token(self.request)
                return 'NOT_PROVIDED' if token is None else smart_text(token)
            context = {
                'request': self.request,
                'csrf_token': SimpleLazyObject(get_csrf_token)
            }
            for processor in template.backend.context_processors:
                context.update(processor(self.request))
            self.request.processors_context = context
        return self.request.processors_context

    def get_template_context(self):
        return self.context

    def get_template_dir(self):
        return 'render/'

    def get_template_name(self):
        if self.obj_template_attr is None:
            template_name = self.template
        else:
            obj_template = getattr(self.obj, self.obj_template_attr, self.template)
            template_name = self.template if obj_template is None else obj_template
        return template_name

    def render_raw(self):
        return str(self.obj)

    def __str__(self):
        template_name = self.get_template_name()
        if template_name == '':
            return self.render_raw()
        template_path = self.get_template_dir() + self.get_template_name()
        t = tpl_loader.get_template(template_path)
        context = self.get_template_context()
        context.update(self.get_processors_context(t))
        html = mark_safe(t.template.render(context))
        # Non-cached processors context version is commented out.
        # html = t.render(request=self.request, context=self.get_template_context())
        return html

    def __call__(self, *args, **kwargs):
        self.update_context(kwargs)
        return self.__str__()


# Print nested HTML list.
class PrintList:

    empty_values = (
        None,
        '',
    )
    default_tpl = {
        'v': '<li><div{attrs}>{v}</div></li>\n',
        'kv': '<li><div{attrs}><div>{k}</div>{v}</div></li>',
        'top': '<ul>{}</ul>\n',
    }

    def __init__(
        self,
        tpl=None,
        tpl_kwargs: dict = None,
        cb=escape,
        skip_empty=False,
        show_keys=None,
        i18n: dict = None,
        keypath=None
    ):
        self.skip_empty = skip_empty
        self.tpl = {} if tpl is None else tpl
        if 'top' not in self.tpl:
            self.tpl['top'] = self.default_tpl['top']
        for typ in ('v', 'kv'):
            if typ not in self.tpl:
                self.tpl[typ] = {'': self.default_tpl[typ]}
            elif isinstance(self.tpl[typ], str):
                self.tpl[typ] = {'': self.tpl[typ]}
            for case in ('first', 'single'):
                if case not in self.tpl[typ]:
                    self.tpl[typ][case] = self.tpl[typ]['']
        self.tpl_kwargs = {} if tpl_kwargs is None else tpl_kwargs
        if 'attrs' not in self.tpl_kwargs:
            self.tpl_kwargs['attrs'] = {}
        self.cb = cb
        self.show_keys = PRINT_NO_KEYS if show_keys is None else show_keys
        self.i18n = {} if i18n is None else i18n
        # Set keypath kwarg to False to skip keypath nesting keys.
        self.keypath = [] if keypath is None else keypath

    def nested(self, row):
        result = []
        gen = sdv.iter_enumerate(row, self.show_keys == PRINT_REPEATED_KEYS)
        try:
            case = 'first'
            gen.__next__()
            try:
                gen.__next__()
            except StopIteration:
                case = 'single'
        except StopIteration:
            pass
        for definition in sdv.iter_enumerate(row, self.show_keys == PRINT_REPEATED_KEYS):
            # When row element value is a tuple, it's elements define key / elem / format_kwargs.
            # Dict key, value pairs are supported, however the row of tuples allows to use repeated keys
            # and to apply custom format kwargs to selective cells.
            if len(definition) > 2:
                key, elem, format_kwargs = definition
            elif len(definition) > 1:
                key, elem = definition
                format_kwargs = {}
            else:
                key, elem = definition
                format_kwargs = {}
            if isinstance(self.keypath, list):
                self.keypath.append(key)
            if not self.skip_empty or elem not in self.empty_values:
                if hasattr(elem, '__iter__') and not isinstance(elem, (str, bytes, Promise)):
                    result.append(self.format_val(key, self.nested(elem), case, format_kwargs, cb=''))
                else:
                    result.append(
                        self.format_val(key, elem, case, format_kwargs)
                    )
            if isinstance(self.keypath, list):
                self.keypath.pop()
            case = ''
        return self.tpl['top'].format(''.join(result))

    def format_val(self, key, elem, case, format_kwargs, cb=None):
        tpl_kwargs = copy(self.tpl_kwargs)
        tpl_kwargs.update(format_kwargs)
        if cb is None:
            cb = self.cb
        format_kwargs = {
            'v': cb(elem) if callable(cb) else elem
        }
        for k, attrs in tpl_kwargs.items():
            if isinstance(attrs, dict):
                format_kwargs[k] = to_json(attrs) if k.endswith('_json') else json_flatatt(attrs)
            else:
                format_kwargs[k] = attrs
        if self.show_keys > PRINT_NO_KEYS and not isinstance(key, int):
            if isinstance(self.keypath, list) and all(isinstance(v, str) for v in self.keypath):
                local_keypath = '›'.join(self.keypath)
                key_val = self.i18n.get(local_keypath, key)
            else:
                key_val = self.i18n.get(key, key)
            format_kwargs['k'] = self.cb(key_val) if callable(self.cb) else str(key_val)
            tpl = self.tpl['kv'][case]
        else:
            tpl = self.tpl['v'][case]
        return tpl.format(**format_kwargs)


# Print uniform 2D table.
def print_table(
        rows,
        top_tpl='<table>{}</table>\n',
        row_tpl='<tr>{}</tr>\n',
        kv_tpl='<td><div{attrs}><div>{k}</div>{v}</div></td>\n',
        v_tpl='<td><div{attrs}>{v}</div></td>\n',
        cb=escape, show_keys=None, i18n=None
):
    print_list = PrintList(
        tpl={
            'v': v_tpl,
            'kv': kv_tpl,
            'top': row_tpl,
        },
        cb=cb, show_keys=show_keys, i18n=i18n
    )
    rows_str = ''.join([
        print_list.nested(row) for row in rows
    ])
    return top_tpl.format(rows_str)


def print_brackets(row, cb=escape, show_keys=None, i18n=None):
    # See app.css how .conditional-display can be displayed as block element or inline element
    # via the outer .display-block / .display-inline classes.
    return mark_safe(
        PrintList(
            tpl={
                'v': {
                    '': ', {v}',
                    'first': '{v}',
                },
                'kv': {
                    '': ' › {k}: ({v})',
                    'first': '{k}: ({v})',
                    'single': '{k}: {v}',
                },
                'top': '{}',
            },
            tpl_kwargs={
            },
            cb=cb,
            show_keys=show_keys,
            i18n=i18n
        ).nested(row)
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


def recursive_join(lst, separator=' › ', enclosure_fmt='({})'):
    return separator.join([
        enclosure_fmt.format(recursive_join(v, separator, enclosure_fmt)) if isinstance(v, (dict, list)) else v
        for k, v in sdv.iter_enumerate(lst)
    ])


def str_dict(d: dict, separator=' › ', only_keys=None, enclosure_fmt='({})'):
    flat_d = flatten_dict(d, separator, only_keys, enclosure_fmt)
    return recursive_join(flat_d.values(), separator, enclosure_fmt)


def has_css_classes(existing_classes='', find_classes=''):
    existing_list = existing_classes.split(' ')
    find_set = set(find_classes.split(' '))
    return len(find_set - set(existing_list)) == 0


def add_css_classes(existing_classes='', new_classes=''):
    existing_list = existing_classes.split(' ')
    new_list = new_classes.split(' ')
    result_dict = {css_class: False for css_class in set(existing_list) | set(new_list)}
    result_list = []
    for css_class in existing_list + new_list:
        if result_dict[css_class] is False:
            result_dict[css_class] = True
            result_list.append(css_class)
    result = ' '.join(result_list).strip()
    return None if result == '' else result


def remove_css_classes(existing_classes='', remove_classes=''):
    existing_list = existing_classes.split(' ')
    remove_set = set(remove_classes.split(' '))
    result_list = filter(lambda css_class: css_class not in remove_set, existing_list)
    result = ' '.join(result_list).strip()
    return None if result == '' else result


def has_css_classes_in_dict(element, classnames, key='class'):
    return has_css_classes(element.get(key, ''), classnames)


def add_css_classes_to_dict(element, classnames, key='class'):
    result = add_css_classes(element.get(key, ''), classnames)
    if result is not None:
        element[key] = result


def prepend_css_classes_to_dict(element, classnames, key='class'):
    result = add_css_classes(classnames, element.get(key, ''))
    if result is not None:
        element[key] = result


def remove_css_classes_from_dict(element, classnames, key='class'):
    result = remove_css_classes(element.get(key, ''), classnames)
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
    return '-' if value is None else format_local_date(value, short_format=False, **kwargs)


# http://www.mobile-web-consulting.de/post/3921808264/construct-url-with-query-parameters-in-django-with
def reverseq(viewname, urlconf=None, args=None, kwargs=None, current_app=None, query=None, request=None):
    # https://docs.djangoproject.com/en/dev/ref/urlresolvers/#reverse
    url = reverse(viewname, urlconf, args, kwargs, current_app)
    if query is not None:
        url += '?' + urlencode(query)
    return url if request is None else request.build_absolute_uri(url)


def resolve_cbv(url_name, kwargs):
    url = reverse(url_name, kwargs=kwargs)
    view_fn = resolve(url)[0]
    if not hasattr(view_fn, '__wrapped__'):
        return view_fn
    return sdv.get_cbv_from_dispatch_wrapper(view_fn)


# Convert url matching supplied url_name from regex named parameters (?P<arg>\w+) to sprintf named formatters %(arg)s.
def get_formatted_url(url_name):
    try:
        return reverse(url_name)
    except NoReverseMatch:
        # Url regex pattern has named parameters. Translate these to Javascript sprintf() library format.
        urlresolver = get_resolver(None)
        # Django 2.0 generates url_def tuples of 4 elements, < 2.0 - tuple of 3 elements.
        for url_def in urlresolver.reverse_dict.getlist(url_name):
            matches = url_def[0]
            for sprintf_url, _named_parameters in matches:
                return '{}{}'.format(get_script_prefix(), sprintf_url)
        raise NoReverseMatch('Cannot find sprintf formatted url for %s' % url_name)


class DjkJSONEncoder(DjangoJSONEncoder):

    def default(self, o):
        if isinstance(o, Promise):
            # force_text() is used because django.contrib.auth.models.User incorporates the instances of
            # django.utils.functional.lazy.<locals>.__proxy__ object, which are not JSON serializable.
            return force_text(o)
        if isinstance(o, DebugUndefined):
            return o.__str__()
        if isinstance(o, Undefined):
            return None
        return super().default(o)


def to_json(self):
    return json.dumps(self, ensure_ascii=False, cls=DjkJSONEncoder)


def json_flatatt(atts):
    _atts = atts
    has_atts = False
    for k, v in atts.items():
        if isinstance(v, (tuple, list, dict, bool)):
            if not has_atts:
                has_atts = True
                _atts = copy(atts)
            _atts[k] = to_json(v)
    return flatatt(_atts)


# https://developer.mozilla.org/en-US/docs/Web/API/CSS/escape
def escape_css_selector(s):
    delimiters = re.compile(r'(\'|\[|\]|\.|#|\(|\)|\{|\})')
    tokens = finditer_with_separators(delimiters, s)
    for key, token in enumerate(tokens):
        if delimiters.match(token):
            tokens[key] = '\\{}'.format(token)
    return ''.join(tokens)


def format_html_attrs(format_string, *args, **kwargs):
    _args = list(args)
    for k, arg in enumerate(_args):
        if isinstance(arg, dict):
            _args[k] = json_flatatt(arg)
        elif isinstance(arg, (tuple, list)):
            _args[k] = to_json(arg)
    _kwargs = kwargs.copy()
    for k, arg in _kwargs.items():
        if isinstance(arg, dict):
            _kwargs[k] = to_json(arg) if k.endswith('_json') else json_flatatt(arg)
        elif isinstance(arg, (tuple, list)):
            _kwargs[k] = to_json(arg)
    return format_html(format_string, *_args, **_kwargs)


# A string class with attributes. Used in ModelLinker.__html__().
class Str(str):
    pass


# Formats canonical links to model instances (model objects).
class ModelLinker:

    # Use Str instance to add .html or .text attribute value to Model.get_absoulte_url() result.
    def __init__(self, obj):
        self.obj = obj
        self.str_fields = self.obj.get_str_fields() if hasattr(self.obj, 'get_str_fields') else None
        if hasattr(self.obj, 'get_absolute_url') and callable(self.obj.get_absolute_url):
            self.url = self.obj.get_absolute_url()
            self.desc = mark_safe(self.url.html) if hasattr(self.url, 'html') else getattr(self.url, 'text', None)
        else:
            self.url = None
            self.desc = None
        if self.desc is None:
            if self.str_fields is not None:
                # todo: use models.model_fields_verbose_names() to optionally populate verbose (localized) list keys.
                self.desc = print_list_group(self.str_fields)
            else:
                if self.obj is not None:
                    self.desc = str(self.obj)

    def get_nested_data(self):
        nested_data = {}
        if self.url is not None:
            nested_data['_url'] = self.url
        if self.str_fields is not None:
            nested_data['_strFields'] = self.str_fields
            nested_data['_options'] = {
                'showKeys': True,
                'i18n': model_fields_verbose_names(self.obj)
            }
        return nested_data

    def __html__(self, template=None):
        if self.url is not None:
            if template is None:
                template = '<a href="{url}">{description}</a>'
            return format_html(
                template,
                url=self.url,
                description=self.desc
            )
        else:
            return empty_value_display if self.desc is None else self.desc


class ContentTypeLinker(ModelLinker):

    def __init__(self, obj, typefield, idfield):
        self.obj_type = getattr(obj, typefield)
        if self.obj_type is not None:
            model_class = self.obj_type.model_class()
            obj = model_class.objects.filter(pk=getattr(obj, idfield)).first()
        super().__init__(obj)

    def get_str_obj_type(self):
        return str(empty_value_display if self.obj_type is None else self.obj_type)


# Discover grid component options from the current request / grid view.
def discover_grid_options(request, template_options):
    view_kwargs = {}
    if 'pageRouteKwargsKeys' in template_options:
        for key in template_options['pageRouteKwargsKeys']:
            if key in request.resolver_match.kwargs:
                view_kwargs[key] = request.resolver_match.kwargs[key]
    if 'pageRouteKwargs' in template_options:
        view_kwargs.update(template_options['pageRouteKwargs'])
    if len(view_kwargs) > 0:
        sdv.nested_update(template_options, {'pageRouteKwargs': view_kwargs})
    view_kwargs['action'] = ''
    view = resolve_cbv(template_options['pageRoute'], view_kwargs)
    grid_options = view.discover_grid_options(request, template_options)
    return grid_options
