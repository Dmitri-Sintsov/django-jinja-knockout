from collections.abc import Sequence
import middleware
from django.http import HttpResponseBadRequest
from functools import wraps


def ajax_required(f):
    @wraps(f)
    def wrapper(request, *args, **kwargs):
        if not request.is_ajax():
            return HttpResponseBadRequest()
        result = f(request, *args, **kwargs)
        return middleware.json_response(result) if isinstance(result, Sequence) else result
    return wrapper
