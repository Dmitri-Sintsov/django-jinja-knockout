from copy import copy
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

    def __init__(self, msgs={}):
        self.vms = vm_list()
        self.msgs = msgs

    # auto_id can be used to return different error messages depending on current auto_id.
    def get_msg(self, key, auto_id=None):
        msg = self.msgs.get(key, None)
        if msg is None:
            msg = self.default_msgs.get(key, None)
        return msg.get(auto_id, None) if isinstance(msg, dict) else msg

    def has_errors(self):
        return len(self.vms) > 0

    def flush(self):
        from .middleware import ImmediateJsonResponse
        if self.has_errors():
            raise ImmediateJsonResponse(self.vms)

    def add_error(self, message, auto_id=None):
        if auto_id is None:
            self.vms.append({
                'view': 'alert_error',
                'message': message,
            })
        else:
            self.vms.append({
                'view': 'form_error',
                'id': auto_id,
                'messages': [message],
            })

    # Limit AJAX string argument to min / max length.
    def lim_str(self, s, auto_id=None, minlen=1, maxlen=255):
        if not isinstance(s, str):
            self.add_error(
                self.get_msg('req_str', auto_id).format(**locals()),
                auto_id
            )
        else:
            minmsg = self.get_msg('min_str', auto_id)
            maxmsg = self.get_msg('max_str', auto_id)
            _len = len(s)
            if _len < minlen:
                self.add_error(minmsg.format(**locals()), auto_id)
            elif _len > maxlen:
                self.add_error(maxmsg.format(**locals()), auto_id)

    def load_json_ids(self, json_str, auto_id=None):
        errmsg = self.get_msg('load_json_ids', auto_id)
        try:
            ids = json.loads(json_str)
            if type(ids) is not list or len(ids) == 0:
                raise ValueError(errmsg)
            for id in ids:
                if type(id) is not int:
                    raise ValueError(errmsg)
        except (TypeError, ValueError) as e:
            self.add_error(str(e), auto_id)
            return None
        return ids
