from .viewmodels import vm_list
import json


class ViewmodelValidator:

    def __init__(self):
        self.vms = vm_list()

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

    # @todo: support error accumulation for AJAX forms.
    # Limit AJAX string argument to min / max length.
    def lim_str(self, s, minmsg, maxmsg, auto_id=None, minlen=1, maxlen=255):
        _len = len(s)

        if _len < minlen:
            self.add_error(minmsg.format(**locals()), auto_id)
        elif _len > maxlen:
            self.add_error(maxmsg.format(**locals()), auto_id)

    def load_json_ids(self, json_str, errmsg, auto_id=None):
        try:
            ids = json.loads(json_str)
            if type(ids) is not list:
                raise ValueError(errmsg)
            for id in ids:
                if type(id) is not int:
                    raise ValueError(errmsg)
        except ValueError as e:
            self.add_error(str(e), auto_id)
        return ids
