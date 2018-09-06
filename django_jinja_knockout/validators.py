import json
from datetime import date, datetime
from django.utils.functional import Promise

from .utils import sdv
from .viewmodels import vm_list


class ViewmodelValidator:

    json_serializable = (str, int, float, bool, type(None), date, datetime, Promise)
    # Not a HTML, not a safe string.
    default_msgs = {
        'req_str': 'Not a string',
        'min_str': 'Length of the string {_len} is smaller than {minlen}',
        'max_str': 'Length of the string {_len} is bigger than {minlen}',
        'load_json_ids': 'Not a non-empty JSON array of integer values',
        'invalid_json_key': 'Invalid JSON data, key path: {key_path}, key type: {key_type}',
        'ivalid_json_val': 'Invalid JSON data, key path: {key_path}, val type: {val_type}',
    }

    def __init__(self, val=None, auto_id=None, msgs: dict=None):
        if msgs is None:
            msgs = {}
        self.vms = vm_list()
        self._val = val
        self.auto_id = auto_id
        self.msgs = msgs

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

    def get_msg(self, key):
        msg = self.msgs.get(key, None)
        if msg is None:
            msg = self.default_msgs.get(key, None)
        # self.auto_id can be used to return different error messages depending on current field auto_id.
        return msg.get(self.auto_id, None) if isinstance(msg, dict) else msg

    def format_msg(self, key, format_kwargs):
        return self.get_msg(key).format(**format_kwargs)

    def has_errors(self):
        return len(self.vms) > 0

    def flush(self):
        from .middleware import ImmediateJsonResponse
        if self.has_errors():
            raise ImmediateJsonResponse(self.vms)
        return self

    def add_error(self, message, extra=None):
        if extra is None:
            extra = {}
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
        vm.update(extra)
        self.vms.append(vm)
        return self

    def format_error(self, key, format_kwargs=None, extra=None):
        return self.add_error(self.format_msg(key, format_kwargs), extra)

    # Limit AJAX string argument to min / max length.
    def lim_str(self, minlen=1, maxlen=255):
        format_kwargs = {
            'minlen': minlen,
            'maxlen': maxlen
        }
        if not isinstance(self._val, str):
            self.format_error('req_str', format_kwargs)
        else:
            format_kwargs['_len'] = len(self._val)
            if format_kwargs['_len'] < minlen:
                self.format_error('min_str', format_kwargs)
            elif format_kwargs['_len'] > maxlen:
                self.format_error('max_str', format_kwargs)
        return self

    def load_json_ids(self):
        errmsg = self.get_msg('load_json_ids')
        try:
            ids = json.loads(self._val)
            if not isinstance(ids, list) or len(ids) == 0:
                raise ValueError(errmsg)
            for id in ids:
                if not isinstance(id, int):
                    raise ValueError(errmsg)
        except (TypeError, ValueError) as e:
            self.add_error(str(e))
            return self
        self._val = ids
        return self

    def _is_serializable_json(self, val):
        if isinstance(val, self.json_serializable):
            return
        elif isinstance(val, (dict, list, tuple)):
            for k, v in val.items() if isinstance(val, dict) else enumerate(val):
                self.key_path.append(str(k))
                if not isinstance(k, self.json_serializable):
                    self.format_error('invalid_json_key', {
                        'key_path': ' / '.join(self.key_path),
                        'key_type': sdv.get_str_type(k),
                    })
                if isinstance(v, (dict, list, tuple)):
                    self._is_serializable_json(v)
                elif not isinstance(v, self.json_serializable):
                    self.format_error('invalid_json_val', {
                        'key_path': ' / '.join(self.key_path),
                        'val_type': sdv.get_str_type(v),
                    })
                self.key_path.pop()
        else:
            self.format_error('invalid_json_val', {
                'key_path': ' / '.join(self.key_path),
                'val_type': sdv.get_str_type(v),
            })

    def is_serializable_json(self):
        self.key_path = []
        self._is_serializable_json(self._val)
        return self
