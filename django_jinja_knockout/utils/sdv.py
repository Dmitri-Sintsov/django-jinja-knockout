from collections import OrderedDict
from collections.abc import ValuesView, Mapping
import re
import sys
import os
import inspect
from pprint import pprint

LOGPATH = ['logs']


# To use with user.is_authenticated / user.is_anonymous Django portable code.
def call_prop(prop):
    return prop() if callable(prop) else prop


# Get selected choice str from the list of defined choices for Django model field choices.
def get_choice_str(choices, selected_choice):
    for choice, choice_str in choices:
        if choice == selected_choice:
            return choice_str
    return None


def str_to_numeric(val):
    try:
        int_val = int(val)
        if str(int_val) == val:
            return int_val
    except ValueError:
        pass
    try:
        float_val = float(val)
    except ValueError:
        return val
    return float_val


def get_str_type(obj, only_class_name=False):
    if obj is None:
        return None
    else:
        path = str(type(obj))
        mtch = re.search(r"<\w*?\s*?'(.*?)'>", path)
        result = path if mtch is None else mtch.group(1)
        return result.split('.')[-1] if only_class_name else result


def reverse_enumerate(iterable):
    return zip(reversed(range(len(iterable))), reversed(iterable))


def iter_enumerate(iterable, repeated_keys=False):
    if isinstance(iterable, dict):
        for key, val in iterable.items():
            yield key, val
    else:
        for key, val in enumerate(iterable):
            if repeated_keys and isinstance(key, int) and isinstance(val, tuple) and len(val) > 1:
                yield val
            else:
                yield key, val


def yield_ordered(iterable):
    if isinstance(iterable, OrderedDict) or (isinstance(iterable, dict) and sys.version_info >= (3, 6, 0)):
        for key, val in iterable.items():
            yield key, val
    elif isinstance(iterable, list):
        for key, val in enumerate(iterable):
            if not isinstance(key, int):
                raise ValueError('Iterable is not linear')
            elif isinstance(val, tuple) and len(val) == 2:
                yield val
            else:
                raise ValueError('Iterable value is not two-element tuple')
    else:
        raise ValueError('iterable is not ordered')


# http://stackoverflow.com/questions/14692690/access-python-nested-dictionary-items-via-a-list-of-keys
def get_nested(nested_data, map_list, default_value=None):
    if not isinstance(map_list, (list, tuple)):
        map_list = [map_list]

    for key in map_list:
        if (isinstance(nested_data, (list, tuple)) and isinstance(key, int) and key < len(nested_data) and key >= 0) or \
                (isinstance(nested_data, dict) and key in nested_data):
            nested_data = nested_data[key]
        elif isinstance(key, str) and hasattr(nested_data, key):
            nested_data = getattr(nested_data, key)
        else:
            return default_value
    return nested_data


def set_nested(d, map_list, value):
    if not isinstance(map_list, (list, tuple)):
        map_list = [map_list]

    for key in map_list[:-1]:
        if key not in d:
            d[key] = {}
        d = d[key]
    d[map_list[-1]] = value


def nested_values(d):
    return [nested_values(v) if isinstance(v, dict) else v for v in d.values()]


# http://stackoverflow.com/a/32357112
def nested_update(d, u):
    for k, v in u.items():
        if isinstance(d, Mapping):
            if isinstance(v, Mapping):
                r = nested_update(d.get(k, {}), v)
                d[k] = r
            else:
                d[k] = u[k]
        else:
            d = {k: u[k]}
    return d


def dbg(name, value=None):
    logdir = os.path.join(*LOGPATH)
    try:
        os.mkdir(logdir, 0o770)
    except OSError:
        pass
    fname = os.path.join(logdir, 'sdv_out.py3')
    f = open(fname, 'a+')
    try:
        # @note: inspect.stack() sometimes produces IndexError in Windows. Not [1] produces it.
        caller = inspect.stack()[1]
    except IndexError:
        caller = ['', 'unknown file', 'unknown line', 'unknown function']
    f.write('# %s::%s()::%s\n# %s\n' % (caller[1], caller[3], caller[2], name))
    # http://stackoverflow.com/questions/192109/is-there-a-function-in-python-to-print-all-the-current-properties-and-values-of
    pprint(value, f)
    f.close()


def get_object_members(obj):
    return OrderedDict(inspect.getmembers(obj))


# http://stackoverflow.com/questions/3589311/get-defining-class-of-unbound-method-object-in-python-3/25959545#25959545
def get_class_that_defined_method(meth):
    if inspect.ismethod(meth):
        for cls in inspect.getmro(meth.__self__.__class__):
            if cls.__dict__.get(meth.__name__) is meth:
                return cls
        # fallback to __qualname__ parsing
        meth = meth.__func__
    if inspect.isfunction(meth):
        cls = getattr(inspect.getmodule(meth),
                      meth.__qualname__.split('.<locals>', 1)[0].rsplit('.', 1)[0])
        if isinstance(cls, type):
            return cls
    # not required since None would have been implicitly returned
    return None


# https://stackoverflow.com/questions/8544983/dynamically-mixin-a-base-class-to-an-instance-in-python
def extend_instance(obj, cls):
    """Apply mixins to a class instance after creation"""
    base_cls = obj.__class__
    base_cls_name = obj.__class__.__name__
    obj.__class__ = type(base_cls_name, (base_cls, cls), {})


def get_cbv_from_dispatch_wrapper(meth):
    return getattr(inspect.getmodule(meth), meth.__qualname__)


class FuncArgs:

    def __init__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs

    def add(self, another):
        self.args += another.args
        self.kwargs.update(another.kwargs)

    def apply(self, meth):
        has_args = self.args is not None and len(self.args) > 0
        has_kwargs = self.kwargs is not None and len(self.kwargs) > 0
        if has_args:
            if has_kwargs:
                return meth(*self.args, **self.kwargs)
            else:
                return meth(*self.args)
        else:
            if has_kwargs:
                return meth(**self.kwargs)
            else:
                return meth()


class UniqueIterList(list):

    def iter_callback(self, val):
        return val

    def __iter__(self):
        included_items = set()
        for item in super().__iter__():
            item_map = self.iter_callback(item)
            if item_map not in included_items:
                included_items.add(item_map)
                yield item_map
