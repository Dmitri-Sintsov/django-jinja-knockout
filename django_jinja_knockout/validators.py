from .viewmodels import vm_list
import json


class ViewmodelValidator:

    # Not a HTML, not a safe string.
    default_msgs = {
        'req_str': 'Not a string',
        'min_str': 'Length of the string {_len} is smaller than {minlen}',
        'max_str': 'Length of the string {_len} is bigger than {minlen}',
        'load_json_ids': 'Not a non-empty JSON array of integer values',
    }

    def __init__(self, val=None, auto_id=None, msgs={}):
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

    def has_errors(self):
        return len(self.vms) > 0

    def flush(self):
        from .middleware import ImmediateJsonResponse
        if self.has_errors():
            raise ImmediateJsonResponse(self.vms)
        return self

    def add_error(self, message):
        if self.auto_id is None:
            self.vms.append({
                'view': 'alert_error',
                'message': message,
            })
        else:
            self.vms.append({
                'view': 'form_error',
                'id': self.auto_id,
                'messages': [message],
            })
        return self

    # Limit AJAX string argument to min / max length.
    def lim_str(self, minlen=1, maxlen=255):
        if not isinstance(self._val, str):
            self.add_error(
                self.get_msg('req_str').format(**locals())
            )
        else:
            minmsg = self.get_msg('min_str')
            maxmsg = self.get_msg('max_str')
            _len = len(self._val)
            if _len < minlen:
                self.add_error(minmsg.format(**locals()))
            elif _len > maxlen:
                self.add_error(maxmsg.format(**locals()))
        return self

    def load_json_ids(self):
        errmsg = self.get_msg('load_json_ids')
        try:
            ids = json.loads(self._val)
            if type(ids) is not list or len(ids) == 0:
                raise ValueError(errmsg)
            for id in ids:
                if type(id) is not int:
                    raise ValueError(errmsg)
        except (TypeError, ValueError) as e:
            self.add_error(str(e))
            return self
        self._val = ids
        return self
