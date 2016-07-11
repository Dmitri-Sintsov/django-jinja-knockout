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

    # ... skipped ...

    url(r'^model1-grid(?P<action>/?\w*)/$', Model1Grid.as_view(), name='model1_grid',
        kwargs={'ajax': True, 'permission_required': 'my_app.change_model1'}),

    # ... skipped ...

``url()`` regex named capture group ``<action>`` will be used by ``KoGridView.post()`` method for class-based view
kwargs value HTTP routing to provide grid pagination, optional rows CRUD actions, and custom actions which might be
implemented in child classes of ``KoGridView`` as well.

We assume that our grid may later define actions which may change ``Model1`` table rows, thus we require
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

Take a note that two Jinja2 macros are imported. Let's explain their purpose.

ko_grid() macro
~~~~~~~~~~~~~~~

.. highlight:: html

First macro ``ko_grid()`` generates html code of client-side component which looks like this in the generated page html::

    <div class="component" id="model1_grid" data-component-options='{"pageRoute": "model1_grid", "classPath": "App.ko.Grid"}'>
    <a name="model1_grid"></a>
        <div data-template-id="ko_grid_body" data-template-args='{"show_pagination": true, "vscroll": true, "show_title": true, "show_action_buttons": true}'>
        </div>
    </div>

It's inserted into web page body block.

* Mandatory ``grid_options`` are used as client-side component options of current grid.

  * Mandatory key ``'pageRoute'`` key is used to get Django grid class in ``ko_grid()`` macro to
    autoconfigure client-side options of grid (see the macro code in ``jinja2/ko_grid.htm`` for details).
  * Optional key ``classPath`` may be used to specify another client-side class for instantiation of grid, usually that
    should be the child of ``App.ko.Grid`` class inserted as custom script to ``bottom_scripts`` Jinja2 block.

* Optional ``template_options`` argument is passed as ``data-template-args`` attribute to ``underscore.js`` template,
  which is then used to tune visual layout of grid. In our case we assume that rows of ``my_app.Model`` may be long /
  large enough so we turn on vertical scrolling for these (which is off by default).
* Optional ``dom_attrs`` argument is used to set extra DOM attributes of component template. It passes the value of
  component DOM id attribute which may then be used to get the instance of component (instance of ``App.ko.Grid`` class).
  It is especially useful in pages which define multiple grids that interact to each other.

Of course it is not the full DOM subtree of grid but a stub. It will be automatically expanded with the content of
``underscore.js`` template with name ``ko_grid_body`` by ``App.loadTemplates()`` call defined in ``App.initClientHooks``,
then automatically bound to newly created instance of ``App.ko.Grid`` Javascript class via ``App.components.add()``
to make grid "alive". See ``static/js/front/app.js`` code for the implementation of client-side components.

ko_grid_body() macro
~~~~~~~~~~~~~~~~~~~~

Second macro, ``ko_grid_body()`` is inserted into web page bottom scripts block. However it does not contain
directly executed Javascript code, but a set of recursive ``underscore.js`` templates (such as ``ko_grid_body``) that
are applied automatically to each grid component DOM nodes, generated by beforementioned ``ko_grid()`` Jinja2 macro.

Then we include actual client-side implementation of ``App.ko.Grid`` from ``'js/front/ko-grid.js'``. The script is not
so small, and grids are not always displayed at each Django page, so it is not included in ``base_min.htm``
``bottom_scripts`` block by default to make total pages traffic lower. However, it is size is well-justified knowing
that it is loaded just once for all grids, may be cached at client-side by browser, and reduces quite a lot of HTTP
traffic for grid pagination and grid actions.

Grid configuration
------------------

.. highlight:: python

Let's see some more advanced grid sample for the same ``Model1``, the Django view part::

    from django_jinja_knockout.views import KoGridView
    from .models import Model1


    class Model1Grid(KoGridView):

        client_routes = [
            'model1_grid'
        ]
        template_name = 'model1_grid.htm'
        model = Model1
        grid_fields = [
            'field1',
            'field2',
            'field3',
            'model2_fk__field1',
        ]
        allowed_filter_fields = OrderedDict([
            ('field1', None),
            ('field2', {
                'type': 'choices', 'choices': Model1.FIELD2_CHOICES, 'multiple_choices': False
            }),
            ('field3', Model3.FIELD3_CHOICES),
            ('model2_fk__field1', None)
        ])

Grid fields
~~~~~~~~~~~
Django model may have many fields, some of these having long string representation, thus visually grid may become too
large to fit the screen and hard to navigate. Thus not all of the fields always has to be displayed.

Some fields may need to be hidden from user for the security purposes. One also might want to display foreign key
relations, which are "chained" in Django ORM via ``'__'`` separator in the field name.

Set Django grid class ``grid_fields`` property value to the list of required model fields, including foreign key
relations.

``views.KoGridView`` also supports virtual fields, which are not real database table fields, but a calculated values.
To implement virtual field, one has to override the following methods in the grid child class::

    from django_jinja_knockout.views import KoGridView
    from .models import Model1


    class Model1Grid(KoGridView):

        # ... skipped ...
        grid_fields = [
            'field1',
            'field2',
            'virtual_field1',
            'field3',
            'model2_fk__field1',
        ]

        def get_field_verbose_name(self, field_name):
            if field_name == 'virtual_field1':
                # Add virtual field.
                return 'Virtual field name'
            else:
                return super().get_field_verbose_name(field_name)

        def get_related_fields(self, query_fields=None):
            query_fields = super().get_related_fields(query_fields)
            # Remove virtual field from queryset values().
            query_fields.remove('virtual_field1')
            return query_fields

        def postprocess_row(self, row, obj):
            # Add virtual field value.
            row['virtual_field1'] = obj.calculate_virtual_field1()
            row = super().postprocess_row(row, obj)
            return row

        def get_row_str_fields(self, obj, row):
            str_fields = super().get_row_str_fields(obj, row)
            if str_fields is None:
                str_fields = {}
            # Add formatted display of virtual field.
            str_fields['virtual_field1'] = some_local_format(row['virtual_field1'])
            return str_fields

``Model1.calculate_virtual_field1()`` method has to be implemented in ``my_app.models.Model1`` code.

.. highlight:: javascript

To display grid rows visually more compact, there is also the possibility to override ``App.ko.GridRow.toDisplayValue()``
Javascript class method, to implement custom display layout of field value at client-side. The same method also can be
used to generate condensed representations of long text values via Boostrap popovers, or even to display fields as form
inputs (using grid as paginated AJAX form)::

    'use strict';

    App.ko.Model1GridRow = function(options) {
        $.inherit(App.ko.GridRow.prototype, this);
        this.init(options);
    };

    (function(Model1GridRow) {

        Model1GridRow.useInitClient = true;

        Model1GridRow.toDisplayValue = function(value, field) {
            var displayValue = this._super._call('toDisplayValue', value, field);
            switch (field) {
            case 'field1':
                displayValue = $('<span>', {
                    'class': 'label preformatted'
                })
                .text(displayValue)
                .addClass(this.values['field2'] ? 'label-success' : 'label-info');
                break;
            case 'field2':
                var gridColumn = this.ownerGrid.getKoGridColumn(field);
                if (this.values[field] !== '') {
                    displayValue = $('<button>', {
                        'class': 'btn btn-info',
                        'data-content': this.values[field],
                        'data-toggle': 'popover',
                        'data-trigger': 'click',
                        'data-placement': 'bottom',
                        'title': gridColumn.name,
                    }).text('Read full text');
                }
                break;
            case 'field3':
                displayValue = $('<input>', {
                    'type': 'text',
                    'class': 'form-field',
                    'name': field + '_' + this.index,
                    'value': this.values[field]
                });
            }
            return displayValue;
        };

    })(App.ko.Model1GridRow.prototype);

    App.ko.Model1Grid = function(options) {
        $.inherit(App.ko.Grid.prototype, this);
        this.init(options);
    };


    (function(Model1Grid) {

        Model1Grid.iocRow = function(options) {
            return new App.ko.Model1GridRow(options);
        };

    })(App.ko.Model1Grid.prototype);


Filter fields
~~~~~~~~~~~~~
Grids support different types of filters for model fields, to reduce the paginated queryset, which helps to find
specific data in the whole table.

Modifying visual layout of grid
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
.. highlight:: jinja

Top DOM nodes of grid component can be overriden by using Jinja2 ``call(kwargs) ko_grid()`` statement then implementing
a custom caller section with custom DOM nodes. There is the example of using this approach just below. See the source
code of ``ko_grid.htm`` template for original DOM nodes of ``App.ko.Grid`` component.

It is possible to override some or all underscore.js templates of ``App.ko.Grid`` component, by passing
arguments to ``ko_grid_body()`` Jinja2 macro with keys as template names and values as custom template ids.

* Optional ``call_ids`` argument is used to override expanding nested template DOM ids. It allows to call (expand)
  another underscore.js template instead of built-in one, eg. ``'model1_ko_grid_filter_choices'`` instead of default
  ``'ko_grid_filter_choices'`` (see example below).
* Optional ``template_ids`` argument is used to override DOM ids of ``underscore.js`` templates themselves. That allows
  to generate standard built-in underscore.js template but with a different DOM id ("copy template with different ID").
  It is required sometimes to have both standard and visually customized grids at one web page.

Here is the example of overriding visual display of ``App.ko.GridFilter`` that is used to select filter field from
the list of specified choices for the current grid::

    {% block main %}

        {% call(kwargs) ko_grid(
            grid_options={
                'pageRoute': 'model1_grid',
            },
            dom_attrs={
                'id': 'model1_grid'
            },
            override_template=True,
        ) %}

        <div{{ flatatt(kwargs.dom_attrs) }} data-component-options='{{ kwargs._grid_options|escapejs(True) }}'>
        <a name="{{ kwargs.fragment_name }}"></a>
            <div data-template-id="model1_ko_grid_body" data-template-args='{{ _template_options|escapejs(True) }}'>
            </div>
        </div>

    {% endcall %}

    {% endblock main %}

    {% block bottom_scripts %}
        {{
            ko_grid_body(
                call_ids={
                    'ko_grid_body': 'model1_ko_grid_body',
                    'ko_grid_filter_choices': 'model1_ko_grid_filter_choices',
                },
                template_ids={
                    'ko_grid_nav': 'model1_ko_grid_nav'
                }
            )
        }}

        <script type="text/template" id="model1_ko_grid_body">
            <div class="panel panel-primary">
                <div data-bind="text: meta.verboseNamePlural" class="panel-heading"></div>
                <div class="panel-body">
                    <!-- ko if: meta.hasSearch() || gridFilters().length > 0 -->
                    <div data-template-id="model1_ko_grid_nav"></div>
                    <!-- /ko -->
                    <div data-template-id="ko_grid_table"></div>
                    <button type="button" class="btn btn-warning">My custom button</button>
                </div>
            </div>
        </script>

        <script type="text/template" id="model1_ko_grid_filter_choices">
            <li data-bind="grid_filter">
                <ol class="nav nav-tabs">
                    <li ><a name="#" data-bind="text: name"></a></li>
                    <!-- ko foreach: choices -->
                    <li data-bind="css: {active: is_active()}">
                        <a data-bind="css: {bold: is_active()}, text: name, grid_filter_choice, click: onLoadFilter.bind($data)" name="#"></a>
                    </li>
                    <!-- /ko -->
                </ol>
            </li>
        </script>

        <script src="{{ static_hash('js/front/ko-grid.js') }}"></script>
        <script src="{{ static_hash('js/front/model1-grid.js') }}"></script>
    {% endblock bottom_scripts %}

Todo
~~~~
self.set_contenttype_filter
options.separateMeta = true;
options.pageRouteKwargs
'pageRouteKwargs': {'model1_id': model1_id},
using grid as paginated AJAX form
