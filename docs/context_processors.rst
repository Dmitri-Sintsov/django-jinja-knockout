.. _add_custom_scripts(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=add_custom_scripts
.. _AppConf: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=AppConf
.. _AppClientData: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=AppClientData
.. _client_routes: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=client_routes
.. _create_page_context(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=create_page_context
.. _DJK_JS_MODULE_TYPE: https://github.com/Dmitri-Sintsov/djk-sample/search?l=Python&q=DJK_JS_MODULE_TYPE
.. _DJK_PAGE_CONTEXT_CLS: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=DJK_PAGE_CONTEXT_CLS
.. _flatatt(): https://github.com/django/django/search?l=Python&q=flatatt
.. _format_html(): https://github.com/django/django/search?l=Python&q=format_html
.. _get_client_conf(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=HTML&q=get_client_conf
.. _get_client_data(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=HTML&q=get_client_data
.. _get_client_urls(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=get_client_urls
.. _get_verbose_name(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=get_verbose_name
.. _get_view_title(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=HTML&q=get_view_title
.. _get_custom_scripts(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=HTML&q=get_custom_scripts
.. _PageContext: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=PageContext
.. _page_context: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=HTML&q=page_context
.. _page_context_decorator: https://github.com/Dmitri-Sintsov/djk-sample/search?l=Python&q=page_context_decorator
.. _PageContextMixin: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=PageContextMixin
.. _set_custom_scripts() sample: https://github.com/Dmitri-Sintsov/djk-sample/search?l=HTML&q=set_custom_scripts&type=code
.. _TemplateResponse: https://docs.djangoproject.com/en/dev/ref/template-response/
.. _tpl: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/tpl.py
.. _.update_page_context(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=update_page_context
.. _utils.sdv: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/utils/sdv.py

.. highlight:: python

=====================
context_processors.py
=====================

Context processor injects the `tpl`_ / `utils.sdv`_ modules to to Jinja2 template context, allowing to write more
powerful templates. Any function / class from these modules are immediately available in Jinja2 templates. Additionally
some useful functions / classes are loaded (see `Meta and formatting`_).

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
* ``tpl.prepend_css_classes_to_dict()``
* ``tpl.remove_css_classes_from_dict()``

.. _PageContext (page_context):

PageContext (page_context)
--------------------------

Since version 1.0.0, `PageContext`_ class is used to generate additional template context required to run client-side of
the framework. To instantiate this class, `create_page_context()`_ function is called. It uses `DJK_PAGE_CONTEXT_CLS`_
setting to load class from the string, which value can be overridden in project ``settings.py`` to add custom data /
functionality.

The instance of `PageContext`_ is stored into current view `TemplateResponse`_ `context_data` dict `'page_context'` key.
Such way the instance of `PageContext`_ class becomes available in DTL / Jinja2 templates as `page_context`_ variable.
`page_context`_ methods are used to generate html title, client-side JSON configuration variables and dynamic script
tags.

To add `page_context`_ variable to the current view template context, function views should use `page_context_decorator`_::

    from django.template.response import TemplateResponse
    from django_jinja_knockout.views import page_context_decorator

    @page_context_decorator(view_title='Decorated main page title')
    def main_page(request, **kwargs):
        return TemplateResponse(request, 'main.htm')

or to instantiate `page_context`_ manually::

    from django.template.response import TemplateResponse
    from django_jinja_knockout.views import create_page_context

    def club_list_view(request, **kwargs):
        page_context = create_page_context(request=request, client_routes={
            'profile_detail',
            'club_view',
        })
        context = {
            'page_context': page_context,
            'clubs': Club.objects.all(),
        }
        return TemplateResponse(request, 'page_clubs.htm', context)

To include `page_context`_ in the class-based view template, one should inherit from `PageContextMixin`_ or it's
ancestors as basically all class-based views of ``django-jinja-knockout`` inherit from it. It has ``.view_title``,
``.client_data``, ``.client_routes``, ``.custom_scripts`` class attributes to specify `page_context`_ argument values::

    class CreateClub(PageContextMixin):

        view_title = 'Create new club'
        # Will be available as AppClientData['club'] in Javascript code.
        client_data = {
            'club': 12,
        }
        # Will be available as client-side url Url('manufacturer_fk_widget', {'action': 'name-of-action'})
        client_routes = {
            'manufacturer_fk_widget',
            'profile_fk_widget',
            'tag_fk_widget',
        }
        # Will be additionally loaded in 'base_bottom_scripts.htm' template.
        custom_scripts = [
            'djk/js/grid.js',
            'js/member-grid.js',
        ]

Also, one may add `page_context`_ via `PageContextMixin`_ ``.create_page_context()`` singleton method::

    class ClubPage(PageContextMixin):
        template_name = 'club.htm'

        def get_context_data(self, **kwargs):
            self.create_page_context().add_client_routes({
                'club_detail',
                'profile_detail',
            })
            return super().get_context_data(**kwargs)

`page_context`_ will be stored into class-based view instance ``self.page_context`` attribute and injected into
`TemplateResponse`_ when the view is rendered. One may update already existing view ``self.page_context`` via
`.update_page_context()`_ method.

.. highlight:: Javascript

To access client route in Javascript code::

    import { Url } from '../../djk/js/url.js';

    Url('profile_detail', {profile_id: pk})

.. highlight:: Jinja

To ensure that `page_context`_ is always available in Jinja2 template::

    {% if page_context is not defined -%}
        {% set page_context = create_page_context(request) -%}
    {% endif -%}

To ensure that `page_context`_ is always available in DTL template::

    {% load page_context %}
    {% init_page_context %}

.. highlight:: Python

The following `page_context`_ methods are used to get page data in templates:

* `get_view_title()`_ - see :ref:`views_view_title`
* `get_client_conf()`_ - see `Injection of Django url routes into loaded page`_
* `get_client_data()`_ - see `Injection of server-side data into loaded page`_
* `get_custom_scripts()`_ - see `Injection of custom script urls into loaded page`_

Injection of Django url routes into loaded page
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

* `get_client_conf()`_ method returns the dict which is passed to client-side via `AppConf`_ Javascript instance with
  the following keys:

 * ``'jsErrorsAlert'`` - boolean value, whether Javascript errors should produce modal alert;
 * ``'jsErrorsLogging'`` - boolean value, whether Javascript errors should be reported to admin email;

   * See also :doc:`installation` how to setup Javascript error logging.

 * ``'csrfToken'`` - current CSRF token to be used with AJAX POST from Javascript;
 * ``'languageCode'`` - current Django language code;
 * ``'staticPath'`` - root static url path to be used with AJAX requests from Javascript;
 * ``'userId'`` - current user id, 0 for anonymous; used to detect authorized users and with AJAX requests;
 * ``'url'`` - the dict of Django {``url name``: ``sprintf pattern``}, generated by `get_client_urls()`_ method from the
   set of Django url names (`client_routes`_) which are later converted to Javascript object to be used with AJAX
   requests. It allows not to have hard-coded app urls in Javascript code. Url names with kwargs are supported since
   v0.2.0. Namespaced urls are supported since v0.9.0.

To add client-side accessible url in function-based view::

    from django.template.response import TemplateResponse
    from django_jinja_knockout.views import page_context_decorator

    @page_context_decorator(client_routes={
        'club_detail',
        'member_grid',
    })
    def my_view(request):
        return TemplateResponse(request, 'template.htm', {'data': 12})

To statically add client-side accessible urls in CBV::

    class MyView(PageContextMixin)

        client_routes = {
            'club_detail',
            'member_grid',
        }

To dynamically add client-side accessible urls in CBV::

    class MyView(PageContextMixin)
        # ...
        def get_context_data(self, **kwargs):
            self.create_page_context().add_client_routes({
                'club_detail',
                'member_grid',
            })

Single url can be added as::

    self.create_page_context().add_client_routes('club_detail')

page_context_decorator()
~~~~~~~~~~~~~~~~~~~~~~~~

`page_context_decorator`_ allows to quickly provide ``view_title`` / ``client_data`` / ``client_routes`` /
``custom_scripts`` for function-based Django views::

    from django.template.response import TemplateResponse
    from django_jinja_knockout.views import page_context_decorator

    @page_context_decorator(
        view_title='Decorated main page title',
        client_data={'todo': 'club'},
        client_routes={'club_detail', 'club_edit'},
        custom_scripts=['main.js']
    )
    def main_page(request, **kwargs):
        return TemplateResponse(request, 'main.htm')

Injection of server-side data into loaded page
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
.. highlight:: html

* `get_client_data()`_ method returns the dict, injected as JSON to HTML page, which is accessible at client-side via
  ``AppClientData()`` Javascript function call.

Sample template ::

    <script type="application/json" class="app-conf">
        {{ page_context.get_client_conf()|to_json(True) }}
    </script>
    <script type="application/json" class="app-client-data">
        {{ page_context.get_client_data()|to_json(True) }}
    </script>

.. highlight:: Python

To pass data from server-side Python to client-side Javascript, one has to access `PageContext`_ singleton instance::

    self.create_page_context().update_client_data({
        'club_id': self.object_id
    })

.. highlight:: Javascript

To access the injected data in Javascript code::

    import { AppClientData } from '../../djk/js/conf.js';

    AppClientData('club_id')

.. highlight:: Python

It may also include optional JSON client-side viewmodels, stored in ``onloadViewModels`` key, which are executed when
html page is loaded (see :doc:`viewmodels` for more info)::

    self.create_page_context().update_client_data({
        'onloadViewModels': {
          'view': 'alert',
          'message': 'Hello, world!',
        }
    })

Injection of custom script urls into loaded page
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

To inject custom script to the bottom of loaded page, use the following call in Django view::

    self.create_page_context().set_custom_scripts(
        'my_project/js/my-custom-dialog.js',
        'my_project/js/my-custom-grid.js',
    )

.. highlight:: jinja

To dynamically set custom script from within Django template, use `PageContext`_ instance stored into `page_context`_
template context variable::

    {% do page_context.set_custom_scripts(
        'my_project/js/my-custom-dialog.js',
        'my_project/js/my-custom-grid.js',
    ) -%}

The order of added scripts is respected, however multiple inclusion of the same script will be omitted to prevent
client-side glitches. There is also an additional check against inclusion of duplicate scripts at client-side via
``assertUniqueScripts()`` function call.

It's also possible to conditionally add extra scripts to already set of scripts via `PageContext`_ class
`add_custom_scripts()`_ method, however with :ref:`clientside_es6_loader` it's rarely needed as the extra scripts can be
imported as es6 modules.

It's also possible to pass custom tag attributes to set / added scripts by specifying dict as the value of
``add_custom_scripts()`` / ``set_custom_scripts()`` method. The key ``name`` of the passed dict will specify the
name of script, the rest of it's keys has the values of script attributes, such as ``type``. The default ``type`` key
value is ``module`` for es6 modules which can be overriden by `DJK_JS_MODULE_TYPE`_ ``settings.py`` variable value.

* See `set_custom_scripts() sample`_ for the complete example.

Meta and formatting
-------------------

* `get_verbose_name()`_ allows to get verbose_name of Django model field, including related (foreign) and reverse
  related fields.
* Django functions used to format html content: `flatatt()`_ / `format_html()`_.
* Possibility to raise exceptions in Jinja2 templates::

  {{ raise('Error message') }}

Advanced url resolution, both forward and reverse
-------------------------------------------------
.. highlight:: python

* ``tpl.resolve_cbv()`` takes url_name and kwargs and returns a function view or a class-based view for these arguments,
  when available::

    tpl.resolve_cbv(url_name, view_kwargs)

* ``tpl.reverseq()`` allows to build reverse urls with optional query string specified as Python dict::

    tpl.reverseq('my_url_name', kwargs={'club_id': club.pk}, query={'type': 'approved'})

See :doc:`tpl` for more info.

Miscellaneous
-------------
* ``sdv.dbg()`` for optional template variable dump (debug).
* Context processor is inheritable which allows greater flexibility to implement your own custom features by
  overloading it's methods.
