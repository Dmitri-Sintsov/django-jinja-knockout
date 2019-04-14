# from pudb import set_trace
from .tpl import to_json
from .http import json_response

# dict manipulation functions are used with HttpRequest.client_data or with HttpRequest.session.

KEY = 'onloadViewModels'


def has_vm_list(dct):
    return KEY in dct


def onload_vm_list(dct, new_value=None):
    if new_value is not None:
        dct[KEY] = new_value if isinstance(new_value, vm_list) else vm_list(*new_value)
        return dct[KEY]
    if isinstance(dct.get(KEY), vm_list):
        return dct[KEY]
    else:
        dct[KEY] = vm_list(*dct.get(KEY, []))
        return dct[KEY]


def to_vm_list(v):
    if isinstance(v, vm_list):
        return v
    elif isinstance(v, list):
        return vm_list(*v)
    else:
        return vm_list(v)


# List of client-side viewmodels, which can be serialized to json
class vm_list(list):

    def __init__(self, *initial_vms, **kw_vm):
        for vm in initial_vms:
            self.append(vm)
        if len(kw_vm) > 0:
            self.append(kw_vm)

    def append_kw(self, **vm):
        self.append(vm)

    def append(self, p_object):
        if not isinstance(p_object, dict):
            raise ValueError('Only dict can be appended to vm_list')
        super().append(p_object)

    def insert(self, index, p_object):
        if not isinstance(p_object, dict):
            raise ValueError('Only dict can be appended to vm_list')
        super().insert(index, p_object)

    def extend(self, iterable):
        for vm in iterable:
            if not isinstance(vm, dict):
                raise ValueError('Only dict can be appended to vm_list')
        super().extend(iterable)

    def prepend(self, *vms):
        for vm in reversed(vms):
            self.insert(0, vm)

    # Support response deferred rendering. See django.core.handlers.base.
    # This allows to return vm_list value in views and .render() will convert it to JsonResponse automatically.
    # @ajax_required view wrapper is not required in such case.
    def render(self):
        return json_response(self)


# Next functions may be used with ordinary lists or as methods of vm_list,
# because the list of viewmodels may be an instance of ordinary list or an instance of vm_list.


def find_by_keys(self, *match_vm_keys):
    if not isinstance(self, list):
        raise ValueError('Self is not the list of viewmodels')
    match_keys = set(match_vm_keys)
    for idx, vm in enumerate(self):
        if match_keys.issubset(set(vm.keys())):
            yield (idx, vm)


vm_list.find_by_keys = find_by_keys


def find_by_kw(self, **partial_vm):
    if not isinstance(self, list):
        raise ValueError('Self is not the list of viewmodels')
    for idx, vm in enumerate(self):
        found = True
        for key in partial_vm:
            if key not in vm or vm[key] != partial_vm[key]:
                found = False
                break
        if found:
            yield (idx, vm)


vm_list.find_by_kw = find_by_kw


def find_by_vm(self, partial_vm):
    if not isinstance(self, list):
        raise ValueError('Self is not the list of viewmodels')
    return self.find_by_kw(**partial_vm)


vm_list.find_by_vm = find_by_vm


vm_list.to_json = to_json
