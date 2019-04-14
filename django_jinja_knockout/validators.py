import json
from datetime import date, datetime
from django.utils.functional import Promise

from . import http
from .utils import sdv
from .viewmodels import vm_list


class ViewmodelFormatting:

    json_serializable = (str, int, float, bool, type(None), date, datetime, Promise)
    # Not a HTML, not a safe string.
    default_msgs = {
    }

    def __init__(self, val=None, auto_id=None, msgs: dict = None):
        if msgs is None:
            msgs = {}
        self.vms = vm_list()
        self._val = val
        self.auto_id = auto_id
        self.msgs = msgs

    def get_msg(self, key):
        msg = self.msgs.get(key, None)
        if msg is None:
            msg = self.default_msgs.get(key, None)
        # self.auto_id can be used to return different error messages depending on current field auto_id.
        return msg.get(self.auto_id, None) if isinstance(msg, dict) else msg

    def format_msg(self, key, format_kwargs):
        return self.get_msg(key).format(**format_kwargs)

    def val(self, *args):
        if len(args) == 0:
            return self._val
        elif len(args) == 2:
            self._val, self.auto_id = args
        elif len(args) == 1:
            self._val = args[0]
            self.auto_id = None
        else:
            ValueError('Invalid number of arguments')
        return self

    def has_errors(self):
        return len(self.vms) > 0

    def flush(self):
        if self.has_errors():
            raise http.ImmediateJsonResponse(self.vms)
        return self

    def fix_data(self, key, data=None):
        return False

    def get_vm(self, message):
        if self.auto_id is None:
            vm = {
                'view': 'alert_error',
                'message': message,
            }
        else:
            vm = {
                'view': 'form_error',
                'id': self.auto_id,
                'messages': [message],
            }
        return vm

    def format_vm(self, key, format_kwargs=None, extra=None):
        if format_kwargs is None:
            format_kwargs = {}
        message = self.format_msg(key, format_kwargs)
        return self.get_vm(message)

    def add_vm(self, vm):
        self.vms.append(vm)
        return self

    def add_error(self, key, format_kwargs=None, extra=None):
        vm = self.format_vm(key, format_kwargs, extra)
        if vm is not None:
            self.add_vm(vm)
        return self


class ViewmodelValidator(ViewmodelFormatting):

    # Not a HTML, not a safe string.
    default_msgs = {
        'req_str': 'Not a string',
        'min_str': 'Length of the string {_len} is smaller than {minlen}',
        'max_str': 'Length of the string {_len} is bigger than {minlen}',
        'load_json_ids': 'Not a non-empty JSON array of integer values',
        'invalid_json_key': 'Invalid JSON data, key path: {key_path}, key type: {key_type}',
        'invalid_json_val': 'Invalid JSON data, key path: {key_path}, val type: {val_type}',
    }

    # Limit AJAX string argument to min / max length.
    def lim_str(self, minlen=1, maxlen=255):
        format_kwargs = {
            'minlen': minlen,
            'maxlen': maxlen
        }
        if not isinstance(self._val, str):
            self.add_error('req_str', format_kwargs)
        else:
            format_kwargs['_len'] = len(self._val)
            if format_kwargs['_len'] < minlen:
                self.add_error('min_str', format_kwargs)
            elif format_kwargs['_len'] > maxlen:
                self.add_error('max_str', format_kwargs)
        return self

    def load_json_ids(self):
        errmsg = self.get_msg('load_json_ids')
        try:
            ids = json.loads(self._val)
            if not isinstance(ids, list) or len(ids) == 0:
                raise ValueError(errmsg)
            for k, id in enumerate(ids):
                if not isinstance(id, int) and not self.fix_data('load_json_ids', data={
                    'ids': ids,
                    'k': k,
                }):
                    raise ValueError(errmsg)
        except (TypeError, ValueError) as e:
            vm = self.get_vm(str(e))
            return self.add_vm(vm)
        self._val = ids
        return self

    def _validate_json(self, val):
        if isinstance(val, self.json_serializable):
            return
        elif isinstance(val, (dict, list, tuple)):
            for k, v in val.items() if isinstance(val, dict) else enumerate(val):
                self.key_path.append(str(k))
                if not isinstance(k, self.json_serializable):
                    extra = {
                        'val': val,
                        'k': k,
                    }
                    if not self.fix_data('invalid_json_key', data=extra):
                        self.add_error('invalid_json_key', {
                            'key_path': ' / '.join(self.key_path),
                            'key_type': sdv.get_str_type(k),
                        }, extra)
                if isinstance(v, (dict, list, tuple)):
                    self._validate_json(v)
                elif not isinstance(v, self.json_serializable):
                    extra = {
                        'val': val,
                        'k': k,
                    }
                    if not self.fix_data('invalid_json_val', data=extra):
                        self.add_error('invalid_json_val', {
                            'key_path': ' / '.join(self.key_path),
                            'val_type': sdv.get_str_type(v),
                        }, extra)
                self.key_path.pop()
        else:
            extra = {
                'val': val,
                'k': k,
            }
            if not self.fix_data('invalid_json_val', data=extra):
                self.add_error('invalid_json_val', {
                    'key_path': ' / '.join(self.key_path),
                    'val_type': sdv.get_str_type(v),
                }, extra)

    def validate_json(self):
        self.key_path = []
        self._validate_json(self._val)
        return self
