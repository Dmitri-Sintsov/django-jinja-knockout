from collections import OrderedDict
import os
import inspect
from pprint import pprint
from ensure import ensure_annotations

LOGPATH = ['logs']


def yield_ordered(iterable):
    if isinstance(iterable, OrderedDict):
        for key, val in iterable.items():
            yield key, val
    elif isinstance(iterable, list):
        for key, val in iterable:
            yield key, val
    else:
        raise ValueError('iterable is not ordered')


# http://stackoverflow.com/questions/14692690/access-python-nested-dictionary-items-via-a-list-of-keys
@ensure_annotations
def get_nested(nested_data: (list, dict), map_list:list, default_value=None):
    # http://stackoverflow.com/questions/2184955/test-if-a-variable-is-a-list-or-tuple
    if type(map_list) not in [list, tuple]:
        map_list = [map_list]

    for key in map_list:
        if (type(nested_data) is list and type(key) is int and key < len(nested_data) and key >= 0) or \
                (type(nested_data) is dict and key in nested_data):
            nested_data = nested_data[key]
        else:
            return default_value
    return nested_data


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