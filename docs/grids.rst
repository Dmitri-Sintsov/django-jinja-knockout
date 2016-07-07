=====
Grids
=====

Introduction
------------
Client-side ``static/js/front/ko-grid.js`` script and server-side ``views.KoGridView`` Python class provide possibility
to create AJAX-powered grids for Django models, similar to traditional ``django.contrib.admin`` built-in module which
implements such functionality with traditional HTML page generation. ``knockout.js`` is used to provide viewmodels
to display / update AJAX grids.

There are key advantages of using AJAX calls to render Django Model grids:

* Reduction of HTTP traffic
* Possibility of displaying multiple grids at the same web page and interact between them (for example update another
  grid when current grid is updated)
* Custom filters / form widgets that utilize AJAX grids.

Besides pagination of model data rows, default actions such as CRUD are supported and can be easily enabled for grids.
Custom grid actions both for the whole grid as well as for specific columns can be implemented by inheriting / extending
``App.ko.Grid`` Javascript class and / or ``views.KoGridView`` Python class.

Simpliest grid
--------------

If you have Django model created and migrated, then it is quite easy to add grid for that model to the Django app Jinja2
template, providing your templates are inherited from ``jinja2/base_min.htm``, or from a custom-based template which
includes the same client-side scripts as ``base_min.htm`` does.

.. highlight:: python

In your app view code (we use ``my_app/views.py`` in this example) create the following view::

    from django_jinja_knockout.views import KoGridView
    from .models import Model1


    class Model1Grid(KoGridView):

        client_routes = [
            'model1_grid'
        ]
        template_name = 'model1_grid.htm'
        model = Model1
        grid_fields = '__all__'

Now let's add a named route in ``urls.py`` (see Django docs or some Django project for the complete ``urls.py`` example)::

    from my_app.views import Model1Grid

    # ...
    url(r'^model1-grid(?P<action>/?\w*)/$', Model1Grid.as_view(), name='model1_grid',
        kwargs={'ajax': True, 'permission_required': 'my_app.change_model1'}),
    # ...

``url()`` regex named capture group ``<action>`` will be used by ``KoGridView.post()`` method for class-based view
kwargs value HTTP routing to provide grid pagination, optional rows CRUD actions, and custom actions which might be
implemented in child classes of ``KoGridView`` as well.

We assume that our grid may later define actions which may change ``my_app.Model1`` table rows, thus we require
``my_app.change_model1`` permission from built-in ``django.contrib.auth`` module.

.. highlight:: jinja

Create the following Jinja2 template under filepath ``my_app/jinja2/model1_grid.htm``::

    {% from 'ko_grid.htm' import ko_grid with context %}
    {% from 'ko_grid_body.htm' import ko_grid_body with context %}
    {% extends 'base.htm' %}

    {% block main %}

    {{
    ko_grid(
        grid_options={
            'pageRoute': 'model1_grid',
        },
        template_options={
            'vscroll': True
        },
        dom_attrs={
            'id': 'model1_grid'
        }
    )
    }}

    {% endblock main %}

    {% block bottom_scripts %}
        {{ ko_grid_body() }}
        <script src="{{ static_hash('js/front/ko-grid.js') }}"></script>
    {% endblock bottom_scripts %}

Take a note that two Jinja2 macros are imported.

.. highlight:: html

First one, ``ko_grid()`` generates html code of client-side component which looks like this in the generated page html::

    <div class="component" id="model1_grid" data-component-options='{"pageRoute": "model1_grid", "classPath": "App.ko.Grid"}'>
    <a name="model1_grid"></a>
        <div data-template-id="ko_grid_body" data-template-args='{"show_pagination": true, "vscroll": true, "show_title": true, "show_action_buttons": true}'>
        </div>
    </div>

It's inserted into web page body block.

* Mandatory ``grid_options`` argument ``'pageRoute'`` key is used to get Django grid class in ``ko_grid()`` macro to
  autoconfigure client-side options of grid (see the macro code in ``jinja2/ko_grid.htm`` for details).
* Optional ``template_options`` argument is passed as ``data-template-args`` ``underscore.js`` template arguments,
  which is then used to tune visual layout of grid. In our case we assume that rows of ``my_app.Model`` may be long /
  large enough so we turn on vertical scrolling for these.
* Optional ``dom_attrs`` argument is used to set extra DOM attributes of component template. It passes the value of
  component DOM id attribute which may then be used to get instance of component (instance of ``App.ko.Grid`` class).
  It is especially useful in pages which define multiple grids that interact to each other.

Of course it is not the full DOM subtree of grid but a stub. It will be automatically expanded with the content of
``underscore.js`` template with name ``ko_grid_body`` by ``App.loadTemplates()`` call defined in ``App.initClientHooks``,
then automatically bound to newly created instance of ``App.ko.Grid`` Javascript class via ``App.components.add()``
to make grid "alive". See ``static/js/front/app.js`` code for the implementation.

Second template, ``ko_grid_body()`` is inserted into web page bottom scripts block. However it does not contains
directly executed Javascript code, but a set of recursive ``underscore.js`` templates (such as ``ko_grid_body``) that
are applied automatically to each grid component DOM nodes, generated by beforementioned ``ko_grid()`` Jinja2 macro.

Then we include actual client-side implementation of ``App.ko.Grid`` from ``'js/front/ko-grid.js'``. The script is not
so small, and grids are not always displayed at each Django page, so it is not included in ``base_min.htm``
``bottom_scripts`` block by default to make total pages traffic lower. However, it is size is well-justified knowing
that it is loaded just once for all grids, may be cached at client-side by browser, and reduces quite a lot of HTTP
traffic for grid pagination and grid actions.
