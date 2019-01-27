.. _tpl: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/tpl.py
.. _utils.sdv: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/utils/sdv.py

=====================
context_processors.py
=====================

Context processor injects the `tpl`_ / `utils.sdv`_ modules to to Jinja2 template context, allowing to write more
powerful templates. Any function / class from these modules are immediately available in Jinja2 templates. Additionally
some functions / classes from another modules are loaded.

* `tpl`_ module implements functions / classes for advanced text / html formatting; see :doc:`tpl` for detailed
  information.
* `utils.sdv`_ module implements low-level support functions / classes;

Functions to manipulate css classes in Jinja2 templates
-------------------------------------------------------

* ``tpl.add_css_classes()`` - similar to jQuery ``$.addClass()`` function;
* ``tpl.has_css_classes()`` - similar to jQuery ``$.hasClass()`` function;
* ``tpl.remove_css_classes()`` - similar to jQuery ``$.removeClass()`` function;

Next are the methods that alter 'class' key value of the supplied HTML attrs dict, which is then passed to Django
``flatatt()`` call / ``tpl.json_flatatt()`` call:

* ``tpl.add_css_classes_to_dict()``
* ``tpl.has_css_classes_in_dict()``
* ``tpl.remove_css_classes_from_dict()``

Injection of server-side data into loaded page
----------------------------------------------
* ``client_data`` dict to be injected as JSON to HTML page, which is accessible then at client-side as
  ``App.clientData`` Javascript object, including optional JSON client-side viewmodels, executed when html page is
  loaded::

    <script language="JavaScript">
        App.conf = {{ client_conf|escapejs(True) }};
        App.clientData = {{ client_data|escapejs(True) }};
    </script>

* ``cilent_conf`` dict passed to be accessible at client-side (``App.conf`` Javascript object) with the following keys:

 * ``'jsErrorsAlert'`` - boolean value, whether Javascript errors should produce Bootstrap alert;
 * ``'jsErrorsLogging'`` - boolean value, whether Javascript errors should be reported to admin email;
 * ``'csrfToken'`` - current CSRF token to be used with AJAX POST from Javascript;
 * ``'languageCode'`` - current Django language code;
 * ``'staticPath'`` - root static url path to be used with AJAX requests from Javascript;
 * ``'userId'`` - current user id, 0 for anonymous; used both in Jinja2 templates to detect authorized users and from
   Javascript mostly with AJAX requests;

See also :doc:`installation` how to setup Javascript error logging.

Injection of Django url routes into loaded page
-----------------------------------------------
* ``App.conf.url`` - JSON-ified Python set from ``context_processors.TemplateContextProcessor`` module ``CLIENT_ROUTES``
  variable that defines selected list of Django url routes mapped to Javascript object to be used with AJAX requests
  from Javascript. It allows not to have hard-coded app urls in Javascript code. Since version 0.2.0, it supports url
  names with kwargs.

  Read :doc:`viewmodels` documentation how to add custom client-side urls (``client_routes``) per view.

Meta and formatting
-------------------
.. highlight:: python

* ``get_verbose_name()`` allows to get verbose_name of Django model field, including related (foreign) and reverse
  related fields.
* Django functions to format html content: ``flatatt()`` / ``format_html()`` / ``force_text()``.
* Possibility to raise exceptions in Jinja2 templates via ``{{ raise('Error message') }}``

Advanced url resolution, both forward and reverse
-------------------------------------------------

* ``resolve_cbv()`` takes url_name and kwargs and returns a function view or a class-based view for these arguments,
  when available::

    tpl.resolve_cbv(url_name, view_kwargs)

* ``reverseq()`` allows to build reverse urls with optional query string specified as Python dict::

    tpl.reverseq('my_url_name', kwargs={'project_id': project.pk}, query={'type': 'approved'})

Miscelaneous
------------
* ``sdv.dbg()`` for optional template variable dump (debug).
* Context processor is inheritable which allows greater flexibility to implement your own custom features by
  overloading methods.
