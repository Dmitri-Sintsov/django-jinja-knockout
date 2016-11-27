from collections import OrderedDict, ValuesView, Mapping
import os
import inspect
from pprint import pprint
from ensure import ensure_annotations

LOGPATH = ['logs']


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


def reverse_enumerate(iterable):
    yield from zip(reversed(range(len(iterable))), reversed(iterable))


def yield_ordered(iterable):
    if isinstance(iterable, OrderedDict):
        for key, val in iterable.items():
            yield key, val
    elif isinstance(iterable, list):
        for key, val in enumerate(iterable):
            if type(key) is not int:
                raise ValueError('Iterable is not linear')
            elif isinstance(val, tuple) and len(val) == 2:
                yield val
            else:
                raise ValueError('Iterable value is not two-element tuple')
    else:
        raise ValueError('iterable is not ordered')


def yield_ordered_values(iterable):
    if isinstance(iterable, OrderedDict):
        for val in iterable.values():
            yield val
    elif isinstance(iterable, (list, ValuesView)):
        for val in iterable:
            yield val
    else:
        raise ValueError('iterable values are not ordered')


# http://stackoverflow.com/questions/14692690/access-python-nested-dictionary-items-via-a-list-of-keys
def get_nested(nested_data, map_list, default_value=None):
    if not isinstance(map_list, (list, tuple)):
        map_list = [map_list]

    for key in map_list:
        if (isinstance(nested_data, (list, tuple)) and type(key) is int and key < len(nested_data) and key >= 0) or \
                (isinstance(nested_data, dict) and key in nested_data):
            nested_data = nested_data[key]
        elif type(key) is str and hasattr(nested_data, key):
            nested_data = getattr(nested_data, key)
        else:
            return default_value
    return nested_data


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


# Get selected choice str from the list of defined choices for Django model field choices.
def get_choice_str(choices, selected_choice):
    selected_choice_str = None
    for choice, choice_str in choices:
        if choice == selected_choice:
            selected_choice_str = choice_str
            break
    return selected_choice_str


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
        meth = meth.__func__ # fallback to __qualname__ parsing
    if inspect.isfunction(meth):
        cls = getattr(inspect.getmodule(meth),
                      meth.__qualname__.split('.<locals>', 1)[0].rsplit('.', 1)[0])
        if isinstance(cls, type):
            return cls
    return None # not required since None would have been implicitly returned


def get_cbv_from_dispatch_wrapper(meth):
    return getattr(inspect.getmodule(meth), meth.__qualname__)
