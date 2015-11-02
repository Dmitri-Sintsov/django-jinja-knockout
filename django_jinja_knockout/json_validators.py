import json
from .middleware import ImmediateJsonResponse


# @todo: support error accumulation for AJAX forms.
# Limit AJAX string argument to min / max length.
def lim_str(stri, minmsg, maxmsg, minlen=1, maxlen=255):
    _len = len(stri)

    if _len < minlen:
        raise ImmediateJsonResponse({
            'view': 'alert_error',
            'message': minmsg.format(**locals())
        })

    if _len > maxlen:
        raise ImmediateJsonResponse({
            'view': 'alert_error',
            'message':  maxmsg.format(**locals())
        })


def load_json_ids(json_str, errmsg):
    try:
        ids = json.loads(json_str)
        if type(ids) is not list:
            raise ValueError(errmsg)
        for id in ids:
            if type(id) is not int:
                raise ValueError(errmsg)
    except ValueError as e:
        raise ImmediateJsonResponse({
            'view': 'alert_error',
            'message': str(e)
        })
    return ids
