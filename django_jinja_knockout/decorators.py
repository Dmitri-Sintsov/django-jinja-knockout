from django.http import HttpResponseBadRequest, JsonResponse
from functools import wraps


# Currently is unused, ajax handling is moved into urls.py kwargs middleware.
def ajax_required(f):
    @wraps(f)
    def wrapper(request, *args, **kwargs):
        if not request.is_ajax():
            return HttpResponseBadRequest()
        result = f(request, *args, **kwargs)
        return JsonResponse(result) if type(result) in [dict,list,tuple] else result
    return wrapper
