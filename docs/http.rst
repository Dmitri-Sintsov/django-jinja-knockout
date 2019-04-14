.. _error_response(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=error_response
.. _exception_response(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=exception_response
.. _ImmediateHttpResponse: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=ImmediateHttpResponse
.. _ImmediateJsonResponse: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=ImmediateJsonResponse
.. _json_response: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=json_response
.. _JsonResponse: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=JsonResponse
.. _MockRequestFactory: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=MockRequestFactory

=============
HTTP response
=============

.. highlight:: python

This module extends built-in Django response by providing immediate exception response and AJAX response:

* `MockRequestFactory`_ - allows to perform fully qualified name reverse url resolve in console management scripts::

    from django_jinja_knockout.apps import DjkAppConfig
    from django_jinja_knockout.tpl import reverseq

    request = DjkAppConfig.get_context_middleware().get_request()
    reverseq('member_detail', kwargs={'member_id': 1}, request=request, query={'users': [1,2,3]})

* `JsonResponse`_ - HTTP response which automatically converts dicts / lists / mapping / sequence to JSON. It also has
  `json_response`_ shortcut function with the defaults.

* `ImmediateHttpResponse`_ - exception which allows to interrupt view code flow. It renders Django response provided as
  an exception's ``__init__()`` method agrument.

* `ImmediateJsonResponse`_ - exception which allows to interrupt view code flow. It renders JSON response provided as
  an exception's ``__init__()`` method argument::

    from django.utils.html import format_html

    # ... skipped ...

    if not User.objects.filter(pk=user_id).exists():
        raise ImmediateJsonResponse({
            'view': 'alert_error',
            'message': format_html('Unknown used id: {}', user_id),
        })

* `error_response()`_ / `exception_response()`_ - wrappers around ``django.http.HttpResponseBadRequest`` to allow JSON
  viewmodel response in AJAX requests in case of error / exception occured.
