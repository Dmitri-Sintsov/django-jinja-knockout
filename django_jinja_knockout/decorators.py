from collections.abc import Sequence, Mapping
from functools import wraps

from . import http


def ajax_required(f):
    @wraps(f)
    def wrapper(request, *args, **kwargs):
        if request.is_ajax():
            result = f(request, *args, **kwargs)
            return http.json_response(result) if isinstance(result, (Sequence, Mapping)) else result
        else:
            return http.error_response(request, 'AJAX request is required')
    return wrapper
