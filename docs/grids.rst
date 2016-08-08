=====
Grids
=====

Introduction
------------
Client-side ``static/js/front/ko-grid.js`` script and server-side ``views.KoGridView`` Python class provide possibility
to create AJAX-powered grids for Django models, similar to traditional ``django.contrib.admin`` built-in module which
implements such functionality with traditional HTML page generation.

``knockout.js`` viewmodels are used to display / update AJAX grids.

Each grid row represents an instance of associated Django model which can be browsed and manipulated by grid class.

There are key advantages of using AJAX calls to render Django Model grids:

* Reduction of HTTP traffic.
* Possibility of displaying multiple grids at the same web page and interact between them (for example update another
  grid when current grid is updated).
* Custom filters / form widgets that may utilize nested AJAX grids.
* In-place display and update of grid rows with associated ``ModelForm`` and inline formsets with AJAX submission
  directly via BootstrapDialog.

Besides pagination of model data rows, default actions such as CRUD are supported and can be easily enabled for grids.
Custom grid actions both for the whole grid as well as for specific columns can be implemented by inheriting / extending
``App.ko.Grid`` Javascript class and / or ``views.KoGridView`` Python class.

Possible ways of grid usage
---------------------------
* AJAX grids injected into Jinja2 templates as client-side components with `ko_grid() macro`_.
* Optional `Foreign key filters`_ for AJAX grid components.
* Django ``ModelForm`` widget `ForeignKeyGridWidget`_ which provides ``ForeignKeyRawIdWidget``-like functionality for
  ``ModelForm`` to select foreign key field value via AJAX query / response.

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

Now let's add an url name (route) in ``urls.py`` (see Django docs or some Django project for the complete ``urls.py``
example)::

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

==================
Grid configuration
==================

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
            # Will join field1 from related model2 foreign key automatically via Django ORM.
            'model2_fk__field1',
        ]
        allowed_sort_orders = [
            'field1', 'field2', 'field3'
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
-----------
Django model may have many fields, some of these having long string representation, thus visually grid may become too
large to fit the screen and hard to navigate. Thus not all of the fields always has to be displayed.

Some fields may need to be hidden from user for the security purposes. One also might want to display foreign key
relations, which are "chained" in Django ORM via ``'__'`` separator between related fields name, like
``'model2_fk__field1'`` in this example.

Set Django grid class ``grid_fields`` property value to the list of required model fields, including foreign key
relations.

Customizing visual display of grid fields at client-side
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. highlight:: javascript

To display grid rows in more compact way, there is also possibility to override ``App.ko.GridRow.toDisplayValue()``
Javascript class method, to implement custom display layout of field values at client-side. The same method also can be
used to generate condensed representations of long text values via Boostrap popovers, or even to display fields as form
inputs: using grid as paginated AJAX form - (which is also possible but requires writing custom underscore.js grid
layout templates, partially covered in modifying_visual_layout_of_grid_)::

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
                // Display field value as bootstrap label.
                displayValue = $('<span>', {
                    'class': 'label preformatted'
                })
                .text(displayValue)
                .addClass(this.values['field2'] ? 'label-success' : 'label-info');
                break;
            case 'field2':
                // Display field value as bootstrap clickable popover.
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
                // Display field value as form input.
                displayValue = $('<input>', {
                    'type': 'text',
                    'class': 'form-field',
                    'name': field + '_' + this.ownerGrid.getValue(
                        this.ownerGrid.meta.pkField
                    ),
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

``App.ko.GridRow.toDisplayValue()`` method used in ``grid_row_value`` binding supports the following types of values:

.. highlight:: python

* jQuery objects, whose set of elements will be added to cell DOM

.. _get_str_fields:

* Nested lists of values, which is automatically passed to client-side in AJAX response by ``KoGridView`` when current
  Django model has ``.get_str_fields()`` method implemented. This method returns str() representation of some or all
  model fields::

    class Model1(models.Model):
        # ... skipped ...

        # Complex nested str fields with foregin keys.
        def get_str_fields(self):
            # Nested formatting of foreign keys:
            parts = OrderedDict([
                ('fk1', self.fk1.get_str_fields()),
                 ('fk2', self.fk2.get_str_fields()),
            ])
            if self.fk3 is not None:
                parts['fk3'] = self.fk3.get_str_fields(verbose=False)
            # Formatting of scalar fields:
            parts['sum'] = format_currency(self.sum)
            parts['created_at'] = format_local_date(timezone.localtime(self.created_at))
            return parts

        # Model1.__str__ uses Model1.get_str_fields() for disambiguation.
        def __str__(self):
            str_fields = self.get_str_fields()
            join_dict_values(' / ', str_fields, ['fk1', 'fk2'])
            if 'fk3' in str_fields:
                join_dict_values(' / ', str_fields, ['fk1'])
            return ' › '.join(str_fields.values())

Note that ``get_str_fields()`` will also be used for scalar fields formatting via grid row str_fields. See also
`'list' action`_.

.. highlight:: javascript

* Scalar values which will be set as grid cell via jQuery.html(). Usually these values are server-side Django generated
  strings. Make sure these strings do not contain unsafe HTML to prevent XSS. Here's the implementation in v0.2.0::

    // Supports jQuery elements / nested arrays / objects / HTML strings as grid cell value.
    GridColumnOrder.renderRowValue = function(element, value) {
        if (value instanceof jQuery) {
            $(element).empty().append(value);
        } else if (typeof value === 'object') {
            $(element).empty();
            App.renderNestedList(element, value, this.blockTags);
        } else {
            // Warning: make sure string is escaped!
            // Primarily use is to display server-side formatted strings (Djano local date / currency format).
            $(element).html(value);
        }
    };

.. highlight:: python

To override client-side class to ``App.ko.Model1Grid`` instead of default ``App.ko.Grid``, define default grid
options like this::

    from django_jinja_knockout.views import KoGridView
    from .models import Model1

    class Model1Grid(KoGridView):

        # ... skipped ...
        @classmethod
        def get_default_grid_options(cls):
            return {
                'classPath': 'App.ko.Model1Grid'
            }

Virtual fields
~~~~~~~~~~~~~~

.. highlight:: python

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

Filter fields
-------------
Grids support different types of filters for model fields, to reduce paginated queryset, which helps to locate specific
data in the whole model's database table rows set.

.. highlight:: python

Full-length as well as shortcut definitions of field filters are supported::

    from collections import OrderedDict
    from django_jinja_knockout.views import KoGridView
    from .models import Model1


    class Model1Grid(KoGridView):
        # ... skipped ...

        allowed_filter_fields = OrderedDict([
            (
                # Example of complete filter definition for field type 'choices':
                'field1',
                {
                    'type': 'choices',
                    'choices': Model1.FIELD1_CHOICES,
                    # Do not display 'All' choice which resets the filter:
                    'add_reset_choice': False,
                    # List of choices that are active by default:
                    'active_choices': ['my_choice'],
                    # Do not allow to select multiple choices:
                    'multiple_choices': False
                },
            ),
            # Only some of filter properties are defined, the rest are autoguessed:
            (
                'field2',
                {
                    # Commented out to autodetect field type:
                    # 'type': 'choices',
                    # Commented out to autodetect field.choices:
                    # 'choices': Model1.FIELD1_CHOICES,
                    # Is true by default, thus switching to False:
                    'multiple_choices': False
                }
            ),
            # Try to autodetect field filter completely:
            ('field3', None),
            # Custom choices filter (not necessarily matching Model1.field4 choices):
            ('field4', CUSTOM_CHOICES_FOR_FIELD4),
            # Select foreign key choices via AJAX grid built into BootstrapDialog:
            ('model2_fk', {
                'type': 'fk'
            }),
        ])

Next types of built-in field filters are available:

Range filters
~~~~~~~~~~~~~

* ``decimal`` / ``datetime`` / ``date``: Uses ``App.ko.RangeFilter`` to display dialog with range of scalar values.
  It's a range filter for the corresponding Django model scalar fields.

Choices filter
~~~~~~~~~~~~~~

* ``choices``: It's used by default when Django model field has ``choices`` property defined, similar to this::

    from django.utils.translation import ugettext as _

    class Model1(models.Model):
        ROLE_STAFF = 0
        ROLE_MEMBER = 1
        ROLE_GUEST = 2
        ROLES = (
            (ROLE_STAFF, _('Staff')),
            (ROLE_MEMBER, _('Member')),
            (ROLE_GUEST, _('Guest')),
        )
        model2_fk = models.ForeignKey(Modrl2, verbose_name='One to many relationship to Model2')
        role = models.IntegerField(choices=ROLES, null=True, verbose_name='User role')

When using field filter autodetection in grid view, instance of ``App.ko.GridFilter`` will be created, representing
a dropdown with the list of possible choices from the ``Model1.ROLES`` tuple above::

    from django_jinja_knockout.views import KoGridView
    from .models import Model1, Model2

    class Model1Grid(KoGridView):

        # ... skipped ...
        allowed_filter_fields = OrderedDict([
            # Autodetect the type of filter field:
            ('model2_fk', None),
            # Autodetect the type of filter field:
            ('role', None),
        ])

The ``choices`` filter definition may be customized by supplying a dict with additional keys / values::

    class Model1Grid(KoGridView):

        # ... skipped ...
        allowed_filter_fields = OrderedDict([
            ('model2_fk', None),
            ('role', {
                'type': 'choices',
                'choices': Model1.REGISTERED_ROLES,
                # Do not display 'All' choice which resets the filter:
                'add_reset_choice': False,
                # List of choices that are active by default:
                'active_choices': [Model1.ROLE_MEMBER],
                # Do not allow to select multiple choices:
                'multiple_choices': False
            })
        ])

Foreign key filters
~~~~~~~~~~~~~~~~~~~

* ``fk``: Uses ``App.ko.FkGridDialog`` to select filter choices of foreign key relation field. This widget is similar to
  ``django.contrib.admin.ModelAdmin`` class ``raw_id_fields`` option. Because it's completely relies on AJAX calls,
  one also should create grid class for that foreign key relation field, for example::

    class Model2FkWidgetGrid(KoGridView):

        client_routes = [
            'model2_grid'
        ]
        model = Model2
        grid_fields = [
            'field_a', 'field_b', 'field_c'
        ]
        search_fields = [
            ('field_b', 'contains'),
        ]
        allowed_sort_orders = '__all__'
        allowed_filter_fields = OrderedDict([
            ('field_a', None),
            ('field_c', None),
        ])

Then add the following method to ``Model1Grid`` class, to bind 'fk' widget for field ``Model1.model2_fk`` to
``model2_grid`` url name (route)::

    class Model1Grid(KoGridView):

        # ... skipped ...

        @classmethod
        def get_default_grid_options(cls):
            return {
                'fkGridOptions': {
                    'model2_fk': {
                        # url name of Model2FkWidgetGrid defined just above:
                        'pageRoute': 'model2_grid',
                        # Optional setting for BootstrapDialog:
                        'dialogOptions': {'size': 'size-wide'},
                        # Nesting of ``App.ko.FkGridDialog`` is supported, just define appropriate grid
                        # with 'model3_grid' url name and uncomment next lines:
                        # 'fkGridOptions': {
                        #     'model3_fk': {
                        #         'pageRoute': 'model3_grid'
                        #     }
                        # }
                    }
                }
            }

        # ... skipped ...

Also notice that commented out section of ``Model1Grid.get_default_grid_options()`` shows how foreign key filter
widgets may be nested - just define appropriate grid class for Django model ``Model3`` with ``'model3_grid'`` url name.

Dynamic generation of filter fields
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
There are many cases when grids require dynamic generation of filter fields and their values:

* Different types of filters for end-users depending on their permissions.
* Implementing base grid pattern, when there is a base grid class defining base filters, and few child classes, which
  may alter / add / delete some of the filters.
* ``choices`` filter list of choices might be provided from Django database queryset.
* ``choices`` filter list of choice values might be generated as foreign key id's for Django contenttypes framework
  generic models relationships.

Let's explain the last case as the most advanced one.

Generation of ``choices`` filter list of choice values for Django contenttypes framework is implemented via
``BaseFilterView.get_contenttype_filter()`` method, whose class is a base class for both ``KoGridView`` and it's
traditional request counterpart ``ListSortingView``.

Imagine ``Model1`` has foreign key ``action`` field defined::

    class Model1:
        # ... skipped ...
        action = models.ForeignKey(Action, verbose_name='Model action')
        # ... skipped ...

Where ``Action`` model utilizes contenttypes framework, defined like that::

    from django.utils.translation import ugettext as _

    class Action(models.Model):

        performer = models.ForeignKey(User, related_name='+', verbose_name=_('User'))
        date = models.DateTimeField(verbose_name=_('Date'), db_index=True)
        content_type = models.ForeignKey(ContentType, related_name='related_content', blank=True, null=True, verbose_name='Object description')
        object_id = models.PositiveIntegerField(blank=True, null=True, verbose_name='Link to object')
        content_object = GenericForeignKey('content_type', 'object_id')

then, child class of ``KoGridView`` should define ``get_allowed_filter_fields()`` method to generate ``choices`` filter
values from contenttypes framework model id's via ``get_contenttype_filter()`` method::

    class Model1Grid(KoGridView):

        # ... skipped ...

        def get_allowed_filter_fields(self):
            allowed_filter_fields = OrderedDict([
                # Autodetect.
                ('field1',  None),
                # Choices for contenttypes framework.
                ('action_content_type', self.get_contenttype_filter(
                    ('my_app', 'model1'),
                    ('my_app2', 'model1'),
                    ('my_app2', 'model2')
                ))
            ])
            return allowed_filter_fields

        # ... skipped ...

Modifying visual layout of grid
-------------------------------
.. highlight:: jinja
.. _modifying_visual_layout_of_grid:

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
  It is required sometimes to allow both standard and visually customized grids at one web page.

Here is the example of overriding visual display of ``App.ko.GridFilter`` that is used to select filter field from
the list of specified choices for the current grid. Also ``ko_grid_body`` template is overriden to ``model1_ko_grid_body``
template with button inserted that has knockout.js ``click: myCustomAction`` binding::

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
                    <button data-bind="click: myCustomAction" type="button" class="btn btn-warning">My custom button</button>
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

===================
Grid action routing
===================

.. highlight:: python

Grids support lots of built-in actions besides standard CRUD, thus grid requests do not use HTTP PUT DELETE method
routing, which would be too limiting. All of grid actions are performed as HTTP POST; Django class-based view kwarg
``action`` value is used for routing in ``urls.py``::

    from my_app.views import Model1Grid

    # ... skipped ...

    url(r'^model1-grid(?P<action>/?\w*)/$', Model1Grid.as_view(), name='model1_grid',
        kwargs={'ajax': True, 'permission_required': 'my_app.change_model1'}),

    # ... skipped ...

Value of ``action`` kwarg is normalized (leading '/' are stripped) and is stored in ``self.current_action_name``
property of grid instance at server-side. Key name of view kwargs dict used for grid action url name may be changed via
Django grid class static property ``action_kwarg``::

    from django_jinja_knockout.views import KoGridView
    from .models import Model1

    class Model1Grid(KoGridView):

        action_kwarg = 'action'
        model = Model1
        # ... skipped ...

Server-side action routing
--------------------------

At server-side (in Django view, derived from ``KoGridView``) actions are defined via ``GridActionsMixin.get_actions()``
method and implemented via grid ``action_NAME`` method, where ``NAME`` is actual name of defined action, for example
built-in action ``'list'`` is mapped to ``GridActionsMixin.action_list()`` method.

Django grid action method is called via AJAX so it is supposed to return one or more viewmodels via AJAX response, see
:doc:`viewmodels`.

It might be one of pre-defined viewmodels, like ``{'view': 'alert'}`` (see ``app.js`` for the basic list of viewmodels),
or a grid viewmodel, especially designated to be processed by ``App.GridActions`` class (or it's child class) at
client-side. Here is the example of built-in list action implementation::

    class MyGrid(KoGridAction):

        # ... skipped ...
        def action_list(self):
            rows = self.get_rows()
            vm = {
                'view': self.__class__.viewmodel_name,
                'entries': list(rows),
                'totalPages': ceil(self.total_rows / self.__class__.objects_per_page),
            }
            return vm

Client-side action routing
--------------------------

.. highlight:: javascript

``App.GridActions`` class defined in ``ko-grid.js`` is used both to invoke grid actions and to process their results.

Invocation of action
~~~~~~~~~~~~~~~~~~~~

Actions are invoked via Javascript ``App.GridActions.perform()`` method::

    GridActions.perform = function(action, actionOptions, ajaxCallback)

* mandatory ``action`` argument: name of action as it is returned by grid ``get_actions()`` method at server-side;
* optional ``actionOptions`` argument: custom parameters of action (usually a Javascript object). These are passed to
  AJAX query request. To add queryargs to some action, implement ``queryargs_NAME`` method, where ``NAME`` is actual
  name of action.
* optional ``ajaxCallback`` argument: a function closure that will be executed when action is complete;

Interactive actions (standard action types ``'button'`` / ``'glyphicon'``) are also represented by instances of
``App.ko.Action`` Javascript class, used to setup CSS classes of bound DOM element button or glyphicon.

When bound DOM element is clicked, these interactive actions invoke ``App.ko.Action.doAction()`` method for particular
visual action Knockout.js viewmodel, which calls chain of ``App.ko.Grid`` / ``App.GridActions`` methods, finally issuing
the same ``App.GridActions.perform()`` method::

    Action.doAction = function(options, actionOptions)

* ``options`` object argument may pass key ``'gridRow'`` which is the instance of ``App.ko.GridRow`` class that will
  be used as interactive action target row. It is used for interactive actions that are related to specified grid row,
  such as `'edit_form' action`_. Action target row ``App.ko.GridRow`` instance also will be stored in ``App.ko.Grid``
  ``lastClickedKoRow`` property available in ``App.GridActions`` derived class ``perform_NAME`` method as
  ``this.grid.lastClickedKoRow``, eg::

    Model1GridActions.perform_my_action = function(queryArgs, ajaxCallback) {
        // Get raw value of last clicked grid row 'role' field.
        this.grid.lastClickedKoRow.getValue('role');
    };

Javascript invocation of interacive action with specified target grid row when grid just loaded first time::

    Model1Grid.onFirstLoad = function() {
        // Get instance of App.ko.Action for specified action name:
        var editFormAction = this.getKoAction('edit_form');
        // Find row with pk value === 3, if any, in current page queryset:
        var targetKoRow = this.findKoRowByPkVal(3);
        // Check whether the row with pk value === 3 is in current page queryset:
        if (targetKoRow !== null) {
          // Execute 'edit_form' action for row with pk value === 3.
            editFormAction.doAction({gridRow: targetKoRow});
        }
    };

* ``actionOptions`` object optional argument that is passed to ``App.GridActions.perform()`` as ``actionOptions``
  argument.

Action queryargs
~~~~~~~~~~~~~~~~

Here is the example of ``'list'`` action AJAX request queryargs population::

    GridActions.queryargs_list = function(options) {
        return this.grid.getListQueryArgs();
    };

    // ... skipped ...

    Grid.getListQueryArgs = function() {
        this.queryArgs['list_search'] = this.gridSearchStr();
        this.queryArgs['list_filter'] = JSON.stringify(this.queryFilters);
        return this.queryArgs;
    };

    // ... skipped ...

    Grid.listAction = function(callback) {
        if (typeof callback === 'function') {
            this.gridActions.perform('list', {}, callback);
        } else {
            this.gridActions.perform('list', {});
        }
    };

    // ... skipped ...

    Grid.searchSubstring = function(s) {
        if (typeof s !== 'undefined') {
            this.gridSearchStr(s);
        }
        this.queryArgs.page = 1;
        this.listAction();
    };

Note that some keys of ``queryArgs`` object are populated in grid class own methods, while only the ``'list_search'``
and ``'list_filter'`` keys are setup by ``App.GridActions.queryargs_list()`` method, so both ways of AJAX queryargs
population are possible but it's easier and more convenient to implement common ``queryargs_NAME`` method.

.. highlight:: text

For the reverse url of ``Model1Grid`` class-based view action ``'list'``::

    http://127.0.0.1:8000/model1-grid/list/

it will generate AJAX request queryargs similar to these::

    page: 2
    row_model_str: false
    list_search: test
    list_filter: {"role": 2}
    csrfmiddlewaretoken: JqkaCTUzwpl7katgKiKnYCjcMpNYfjQc

which will be then parsed by ``get_rows`` method called from Django grid ``action_list`` method.

.. highlight:: javascript

it is also possivble to execute actions interactively with custom options (queryargs)::

    Model1Grid.onFirstLoad = function() {
        var myAction = this.getKoAction('my_custom_action');
        myAction.doAction({gridRow: targetKoRow}, {'ko_prop_name': ko_prop_value});
    };

When action is purely client-side implemented via custom ``App.GridActions`` ancestor ``perform_NAME`` method, queryArgs
may be used as options of client-side, for example to pass initial values of Knockout.js viewmodel properties, hence
these are called ``options``, not ``queryArgs`` in ``queryargs_NAME`` method.

Action AJAX response handler
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

To process AJAX response data, returned from Django grid ``action_NAME`` method, one has to implement ``App.GridActions``
derived class, where ``callback_NAME`` Javascript method will be used to update client-side of grid. For example, AJAX
``ModelForm``, generated by standard `'create_form' action`_  is displayed with::

    GridActions.callback_create_form = function(viewModel) {
        viewModel.grid = this.grid;
        var dialog = new App.ModelFormDialog(viewModel);
        dialog.show();
    };

grid meta-data (verbose names, field filters) are updated via::

    GridActions.callback_meta = function(data) {
        if (typeof data.action_kwarg !== 'undefined') {
            this.setActionKwarg(data.action_kwarg);
        }
        this.grid.loadMetaCallback(data);
    };

and so on - see actual ``'callback_NAME'`` examples in ``ko-grid.js`` ``App.GridActions`` class code.

Client-side actions
~~~~~~~~~~~~~~~~~~~

.. highlight:: javascript

It is also possible to perform actions partially or entirely at client-side. To implement this, one should define
``perform_NAME`` in ``App.ko.GridActions`` derived class. Mostly it's used to display client-side BootstrapDialogs via
ancestor of ``App.ActionTemplateDialog`` class with underscore.js / knockout.js template bound to current ``App.ko.Grid``
derived class instance::

    App.Model1ActionDialog = function(options) {
        $.inherit(App.ActionTemplateDialog.prototype, this);
        this.create(options);
    };

    (function(Model1ActionDialog) {

        Model1ActionDialog.templateId = 'ko_model1_action_form';

        Model1ActionDialog.create = function(options) {
            this._super._call('create', options);
            // this.grid.doStuff();
        };

    })(App.Model1ActionDialog.prototype);

    App.Model1GridActions = function(options) {
        $.inherit(App.GridActions.prototype, this);
        this.init(options);
    };

    (function(Model1GridActions) {

        Model1GridActions.perform_ask_user = function(queryArgs, ajaxCallback) {
            var model1ActionDialog = new App.Model1ActionDialog({
                grid: this.grid,
                meta: {
                    nameLabel: 'Please enter your name',
                    familyLabel: 'Please enter your familyname',
                },
            });
            model1ActionDialog.show();
        };

    })(App.Model1GridActions.prototype);

    App.ko.Model1Grid = function(options) {
        $.inherit(App.ko.Grid.prototype, this);
        this.init(options);
    };

    (function(Model1Grid) {

        Model1Grid.init = function(options) {
            this._super._call('init', options);
            this.username = ko.observable('');
            this.familyName = ko.ovservable('');
        };

        Model1Grid.iocGridActions = function(options) {
            return new App.Model1GridActions(options);
        };

    })(App.ko.Model1Grid);

.. highlight:: jinja

Where the ``'ko_model1_action_form'`` template could be like this, based on ``ko_action_form`` template located in
``ko_grid_body.htm``::

    <script type="text/template" id="ko_model1_action_form">
        <div class="panel panel-default">
            <div class="panel-body">
                <form class="ajax-form" enctype="multipart/form-data" method="post" role="form" data-bind="attr: {'data-url': gridActions.getLastActionUrl()}">
                    <input type="hidden" name="csrfmiddlewaretoken" data-bind="value: getCsrfToken()">
                    <input type="hidden" name="pk_val" data-bind="value: getLastPkVal()">
                    <div class="row form-group">
                        <label data-bind="text: meta.nameLabel" class="control-label col-md-4" for="id_username"></label>
                        <div class="field col-md-6">
                            <input data-bind="textInput: username" id="id_username" class="form-control" name="username" type="text">
                        </div>
                    </div>
                    <div class="row form-group">
                        <label data-bind="text: meta.familyLabel" class="control-label col-md-4" for="id_familyname"></label>
                        <div class="field col-md-6">
                            <input data-bind="textInput: familyName" id="id_familyname" class="form-control" name="familyname" type="text">
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </script>

which also may include any custom Knockout.js properties / observables bound to current grid instance (client-side forms
with rich content).

Custom view kwargs
------------------
.. highlight:: python

In some cases a grid may require additional kwargs to alter initial (base) queryset of grid. For example, if Django app
has ``ClubMember`` model related as many to one ``Club`` Django model, grid that displays members of specified club id
(foreign key pk value), one may define ``club_id`` view kwarg match in ``urls.py``::

    # ... skipped ...
    url(r'^club-member-grid-(?P<club_id>\w*)(?P<action>/?\w*)/$', ClubMemberGrid.as_view(), name='club_member_grid',
        kwargs={'ajax': True, 'permission_required': 'my_app.change_club'}),
    # ... skipped ...

Then, grid class may implement base queryset filtering according to ``club_id`` view kwargs value::

    class ClubMemberGrid(KoGridView)

        # ... skipped ...
        def get_base_queryset(self):
            return super().get_base_queryset().filter(club_id=self.kwargs['club_id'])

.. highlight:: jinja

Jinja2 template should contain component generation like this::

    {{ ko_grid(
        grid_options={
            'pageRoute': 'club_member_grid',
            'pageRouteKwargs': {'club_id': club_id},
        },
        dom_attrs={
            'id': 'club_member_grid'
        }
    ) }}

This way each grid will have custom list of club members according to ``club_id`` view kwarg value.

.. highlight:: python

Because foreign key widgets also utilizes ``KoGridView`` and ``App.ko.Grid`` classes, base querysets of foreign key
widgets may be limited by supplying optional ``'pageRouteKwargs'`` via ``fkGridOptions`` key value of the
default grid options dict::

    class Model1Grid(KoGridView):

        allowed_filter_fields = OrderedDict([
            # Autodetect filter type.
            ('field_1', None),
            ('model2_fk', None),
        ])

        @classmethod
        def get_default_grid_options(cls):
            return {
                'classPath': 'App.ko.Model1Grid',
                'fkGridOptions': {
                    'model2_fk': {
                        # 'classPath': 'App.ko.Model2Grid',
                        'pageRoute': 'model2_fk_grid',
                        'pageRouteKwargs': {'type': 'custom'},
                        'searchPlaceholder': 'Search for Model2 values',
                    },
                }
            }

=====================
Standard grid actions
=====================

By default ``KoGridView`` and ``App.GridActions`` offer many actions that can be applied either to the whole grid or to
one / few columns of grid. Actions can be interactive (represented as UI elements) and non-interactive, actions can
be executed as AJAX requests or be purely client-side.

``views.GridActionsMixin.get_actions()`` method returns dict defining built-in actions available. Top level of that dict
is ``action type``. Let's see which action types are available and their associated actions.

Action type 'built_in'
----------------------

Actions that are supposed to be used internally without generation of associated invocation elements (buttons,
glyphicons).

'meta' action
~~~~~~~~~~~~~

Returns AJAX response data:

* the list of allowed sort orders for grid fields (``'sortOrders'``);
* flag whether search field should be displayed (``'meta.hasSearch'``);
* verbose name of associated Django model (``'meta.verboseName' / 'meta.verboseNamePlural'``);
* name of primary key field ``'meta.pkField'`` that is used in different parts of ``App.ko.Grid`` to address grid rows;
* list of defined grid actions, See `Standard grid actions`_, `Grid action routing`_, `Grid custom action types`_;
* allowed grid fields (list of grid columns), see `Grid configuration`_;
* field filters which will be displayed in top navigation bar of grid client-side component in
  ``'ko_grid_nav'`` underscore.js template, see `Filter fields`_;

Custom Django grid class-based views derived from ``KoGridView`` also may define more meta properties for custom
client-side templates. These should be updated "on the fly" automatically with standard client-side
``App.GridActions.callback_meta()`` method.

.. highlight:: javascript

Custom actions can also update grid meta as well, calling client-side ``App.ko.Grid.updateMeta()`` method directly::

    Model1GridActions.callback_approve_user = function(viewModel) {
        this.grid.updateMeta(viewModel.meta);
    };

See `Action AJAX response handler`_ how meta is updated in client-side AJAX callback.

See `Modifying visual layout of grid`_ how to override client-side underscore.js / Knockout.js templates.

'list' action
~~~~~~~~~~~~~

Returns AJAX response data with the list of current paginated grid rows, both "raw" database field values list and their
optional ``str_fields`` formatted list counterparts. While some grids may do not use ``str_fields`` at all, complex
formatting of local date / time / financial currency Django model field values and also nested representation of
fields (displaying foreign key as list of it's Django model fields in one grid cell) requires ``str_fields`` to be
generated.

``str_fields`` are populated at server-side for each grid row via ``views.KoGridView.get_row_str_fields()`` and
converted to client-side ``display values`` in ``App.ko.GridRow.toDisplayValue()``. Both methods can be customized by
overriding these in child classes. When associated Django model has ``get_str_fields()`` method defined, it will be used
to get ``str_fields`` for each row. See also get_str_fields_.

'meta_list' action
~~~~~~~~~~~~~~~~~~

By default ``meta`` action is not performed in separate AJAX query, rather, it's combined with ``list`` action into one
AJAX request via ``meta_list`` action. It saves some of HTTP traffic and reduces server load. However, in some cases,
grid filters has to be set up with specific choices before ``'list'`` action is performed. That is required to open
grid with initially selected field filter choices.

.. highlight:: python

If server-side Django grid class specifies the list of selected choices for some field filter like this::

    class ClubMember(models.Model):
        ROLE_PROMOTER = 0
        ROLE_SCHOLAR = 1
        ROLE_EVANGELIST = 2
        ROLE_FOUNDER = 3
        ROLES = (
            (ROLE_PROMOTER, 'Promoter'),
            (ROLE_SCHOLAR, 'Scholar'),
            (ROLE_EVANGELIST, 'Evangelist'),
            (ROLE_FOUNDER, 'Founder'),
        )
        profile = models.ForeignKey('my_app.Profile', verbose_name='User profile')
        role = models.IntegerField(choices=ROLES, default=ROLE_PROMOTER, verbose_name='Member role')
        note = models.TextField(max_length=16384, blank=True, default='', verbose_name='Note')
        # Allows to have only one endorsed member via True, but multiple non-endorsed members via None.
        is_endorsed = models.NullBooleanField(default=None, verbose_name='Endorsed')


    class ClubMemberGrid(KoGridView):

        model = ClubMember
        grid_fields = [
            'profile',
            'role',
            'note',
            'is_endorsed'
        ]

        allowed_filter_fields = OrderedDict([
            (
                'role',
                {
                    'choices': ClubMember.ROLES,
                    'add_reset_choice': False,
                    # Next choices will be selected automatically
                    'active_choices': [ClubMember.ROLE_PROMOTER, ClubMember.ROLE_SCHOLAR],
                    'multiple_choices': False
                }
            ),
            ('is_endorsed', None)
        ])

        @classmethod
        def get_default_grid_options(cls):
            return {
                'classPath': 'App.ko.ClubMemberGrid'
            }

.. highlight:: javascript

Then, to make sure ``'list'`` action respects ``['role']['active_choices']`` filter default selected choices , define
client-side part of grid class like that::

    App.ko.ClubMemberGrid = function(options) {
        $.inherit(App.ko.Grid.prototype, this);
        // This grid has selected choices for query filter 'role' by default,
        // thus requires separate 'list' action after 'meta' action,
        // instead of joint 'meta_list' action.
        options.separateMeta = true;
        this.init(options);
    };

With grid ``init()`` method ``options.separateMeta = true``, ``'meta'`` action will be issued first, setting ``'role'``
filter selected choices, then ``'list'`` action will be performed separately, respecting these filter choices.
Otherwise, grid ``'role'`` filter will be visually highlighed as selected, but the first (initial) list will retun all
rows not respecting filter choices.

'save_form' action
~~~~~~~~~~~~~~~~~~

.. highlight:: python

Performs validation of AJAX submitted form previously created via `'create_form' action`_ / `'edit_form' action`_,
which will either create new grid row or edit an existing grid row.

Each grid row represents an instance of associated Django model. Form rows are bound to specified Django ``ModelForm``
automatically, one has to set value of grid class ``form`` static property::

    class Model1Grid(KoGridView):

        model = Model1
        form = Model1Form
        # ... skipped ...

Alternatively, one may define factory methods, which would bind different Django ``ModelForm`` classes to
`'create_form' action`_ and `'edit_form' action`_. That allows to have different set of bound model fields when creating
and editing grid row Django models::

    class Model1Grid(KoGridView):

        model = Model1

        def get_create_form(self):
            return Model1CreateForm

        def get_edit_form(self):
            return Model1EditForm

``'save_form'`` action will display AJAX form errors in case there are ``ModelForm`` validation errors, or will add new
row to grid when invoked via `'create_form' action`_ / update existing grid row, when invoked via `'edit_form' action`_.

App.ko.Grid.updatePage() method
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

To automatize grid update after AJAX submitted action, the following optional JSON properties could be set in AJAX
viewmodel response:

* ``'append_rows'``: list of rows which should be appended to current grid page to the bottom;
* ``'prepend_rows'``: list of rows which should be prepended to current grid page from the top;
* ``'update_rows'``: list of rows that are updated, so their display needs to be refreshed;
* ``'deleted_pks'``: list of primary key values of rows (Django models) that were deleted in the database thus need to
  be visually removed from current grid page;

.. highlight:: javascript

Standard grid action handlers (as well as custom action handlers) may return AJAX viewmodel responses with these JSON
keys to client-side action viewmodel response handler (``App.GridActions.callback_save_form()`` in our case), issuing
multiple CRUD operations at once::

    GridActions.callback_save_form = function(viewModel) {
        this.grid.updatePage(viewModel);
    };

See also ``views.GridActionsMixin`` class ``action_delete_confirmed()`` / ``action_save_form()`` methods for server-side
part example. Client-side part of multiple CRUD operations is implemented in ``ko-grid.js`` ``App.ko.Grid.updatePage()``
method.

'save_inline' action
~~~~~~~~~~~~~~~~~~~~
.. highlight:: python

Similar to `'save_form' action`_ described above, this action is an AJAX form submit handler for `'create_inline' action`_
/ `'edit_inline' action`_. These actions generate AJAX submittable BootstrapDialog with ``FormWithInlineFormsets`` class
instance bound to current grid row via grid class ``form_with_inline_formsets`` static property::

    from django_jinja_knockout.views import KoGridView
    from .models import Model1
    from .forms import Model1FormWithInlineFormsets

    class Model1Grid(KoGridView):

        model = Model1
        form_with_inline_formsets = Model1FormWithInlineFormsets
        # ... skipped ...

Alternatively, one may define factory methods, which allows to bind different ``FormWithInlineFormsets`` classes to
`'create_inline' action`_ / `'edit_inline' action`_ target grid row (Django model)::

    class Model1Grid(KoGridView):

        model = Model1

        def get_create_form_with_inline_formsets(self):
            return Model1CreateFormWithInlineFormsets

        def get_edit_form_with_inline_formsets(self):
            return Model1EditFormWithInlineFormsets

These methods should return classes derived from ``django_jinja_knockout.forms.FormWithInlineFormsets``
class (see :doc:`forms`).

'delete_confirmed' action
~~~~~~~~~~~~~~~~~~~~~~~~~
Deletes one or more grid rows via their pk values previously submitted by `'delete' action`_. To selectively disable
deletion of some grid rows, one may implement custom ``action_delete_is_allowed`` method in the Django grid class::

    class ClubMemberGrid(KoGridView):

        model = ClubMember

        # ... skipped ...

        # Do not allow to delete ClubMember instances with role=ClubMember.ROLE_FOUNDER:
        def action_delete_is_allowed(self, objects):
            # ._clone() is required because original pagination queryset is passed as objects argument.
            qs = objects._clone()
            return not qs.filter(role__in=ClubMember.ROLE_FOUNDER).exists()

Action type 'button'
--------------------

These actions are visually displayed as buttons and manually invoked via button click. With default underscore.js
templates these buttons will be located at top navbar of the grid. Usually type ``'button'`` actions are not targeted to
existing grid rows but are supposed either create new rows or to process the whole queryset / list of rows. However,
when client-side ``App.ko.Grid`` derived class instance has visible row selection enabled via ``App.ko.Grid.init()``
options ``showSelection: true`` and / or ``selectMultipleRows: true``, then the button action could be applied to the
selected row(s) as well.

New actions of ``button`` type may be added by overriding ``get_actions`` method of Django grid class and extending grid
client-side ``App.GridActions`` class to implement custom ``'callback_'`` method (see `Client-side actions`_ for
more info).

'create_form' action
~~~~~~~~~~~~~~~~~~~~
Server-side part of this action renders AJAX-powered Django ``ModelForm`` instance bound to new Django grid model.

Client-side part of this action displays rendered ``ModelForm`` as ``BootstrapDialog`` modal dialog. Together with
`'save_form' action`_, which serves as callback for this action, it allows to create new grid rows (new Django model
instances).

This action is enabled (and thus UI button will be displayed in grid component navbar) when Django grid class-based view
has assigned ``ModelForm`` class specified as::

    class Model1Grid(KoGridView):

        model = Model1
        form = Model1Form
        # ... skipped ...

Alternatively, one may define factory methods, which would bind different Django ``ModelForm`` classes to
`'create_form' action`_ and `'edit_form' action`_. That allows to have different set of bound model fields when creating
and editing grid row Django models::

    class Model1Grid(KoGridView):

        model = Model1

        def get_create_form(self):
            return Model1CreateForm

        def get_edit_form(self):
            return Model1EditForm

.. highlight:: python

When one would look at server-side part of ``views.GridActionsMixin.action_create_form()`` action implementation, there
is ``'last_action'`` key set to value ``'save_form'`` in the returned AJAX viewmodel::

        # ... skipped ...
        return vm_list({
            'view': self.__class__.viewmodel_name,
            'last_action': 'save_form',
            'title': format_html('{}: {}',
                self.get_action_local_name(),
                self.get_model_meta('verbose_name')
            ),
            'message': form_html
        })

Viewmodel's ``'last_action'`` key is used in client-side Javascript ``App.GridActions.respond()`` method to override the
name of last executed action from current ``'create_form'`` to ``'save_form'``. It is then used in client-side Javascript
``App.ModelFormDialog.getButtons()`` method ``submit`` button event handler to perform ``'save_form'`` action when that
button is clicked by end-user, instead of already executed ``'create_form'`` action, which generated AJAX model form and
displayed it via ``App.ModelFormDialog`` instance.

'create_inline' action
~~~~~~~~~~~~~~~~~~~~~~
Server-side part of this action renders AJAX-powered ``django_jinja_knockout`` ``forms.FormWithInlineFormsets`` instance
bound to new Django grid model.

Client-side part of this action displays rendered ``FormWithInlineFormsets`` as ``BootstrapDialog`` modal dialog.
Together with `'save_form' action`_, which serves as callback for this action, it allows to create new grid rows (new
Django model instances) while also adding one to many related models via inline formsets.

This action is enabled (and thus UI button will be displayed in grid component navbar) when Django grid class-based view
has assigned ``forms.FormWithInlineFormsets`` derived class (see :doc:`forms` for more info about that class). It should
be specified as::

    from django_jinja_knockout.views import KoGridView
    from .models import Model1
    from .forms import Model1FormWithInlineFormsets

    class Model1Grid(KoGridView):

        model = Model1
        form_with_inline_formsets = Model1FormWithInlineFormsets
        # ... skipped ...

Alternatively, one may define factory methods, which allows to bind different ``FormWithInlineFormsets`` classes to
`'create_inline' action`_ / `'edit_inline' action`_ target grid row (Django model)::

    class Model1Grid(KoGridView):

        model = Model1

        def get_create_form_with_inline_formsets(self):
            return Model1CreateFormWithInlineFormsets

        def get_edit_form_with_inline_formsets(self):
            return Model1EditFormWithInlineFormsets

These methods should return classes derived from ``forms.FormWithInlineFormsets`` built-in class (see :doc:`forms`).

Server-side part of this action sets AJAX response viewmodel ``last_action`` key to ``save_inline`` value, to override
current action of BoostrapDialog modal button. See `'create_form' action`_ description for more info about
``last_action`` key.

Action type 'click'
-------------------
These actions are designed to process already displayed grid row, associated to existing Django model.

* By default there is no active click actions, so clicking grid row does nothing.
* When there is only one click action enabled, it will be executed immediately after end-user clicking target row.
* When there is more than one click actions enabled, ``App.ko.Grid`` will use special version of BootstrapDialog
  wrapper ``App.ActionsMenuDialog`` to display menu with clickable buttons to select one action from the list of
  available ones.

'edit_form' action
~~~~~~~~~~~~~~~~~~
This action is enabled when current Django grid class inherited from ``KoGridView`` class has defined class property
``form`` set to specified Django ``ModelForm`` class used to edit grid row associated Django model::

    from django_jinja_knockout.views import KoGridView
    from .models import Model1
    from .forms import Model1Form


    class Model1Grid(KoGridView):

        model = Model1
        form = Model1Form

Alternatively, one may define ``get_edit_form()`` Django grid method to return ``ModelForm`` class dynamically or to
have separate ``ModelForm`` for `'create_form' action`_ and `'edit_form' action`_.

Server-side of this action is implemented in ``views.GridActionsMixin.action_edit_form()``. It returns AJAX
response with generated HTML of ``ModelForm`` instance bound to target grid row Django model instance and overrides
``last_action`` viewmodel property to `'save_form' action`_.

Client-side of this action uses ``App.ModelFormDialog`` to display generated ``ModelForm`` html and to submit AJAX form
to `'save_form' action`_.

'edit_inline' action
~~~~~~~~~~~~~~~~~~~~
This action is enabled when current Django grid class has defined class property ``form_with_inline_formsets`` set to
specified ``django_jinja_knockout.forms.FormWithInlineFormsets`` class used to edit grid row and it's foreign
relationships via Django inline formsets (see :doc:`forms`)::

    from django_jinja_knockout.views import KoGridView
    from .models import Model1
    from .forms import Model1FormWithInlineFormsets

    class Model1Grid(KoGridView):

        model = Model1
        form_with_inline_formsets = Model1FormWithInlineFormsets

Alternatively, one may define ``get_edit_form_with_inline_formsets()`` Django grid method to return
``FormWithInlineFormsets`` based class dynamically or separately for `'create_inline' action`_ and
`'edit_inline' action`_.

Server-side of this action is implemented in ``views.GridActionsMixin.action_edit_inline()``. It returns AJAX
response with generated HTML of ``FormWithInlineFormsets`` instance bound to target grid row Django model instance and
overrides ``last_action`` viewmodel property to `'save_inline' action`_.

Client-side of this action uses ``App.ModelFormDialog`` to display generated ``FormWithInlineFormsets`` html and to
submit AJAX form to `'save_inline' action`_.

See `Implementing custom grid row actions`_ section how to implement custom actions of ``'click'`` and ``'glyphicon'``
types.

Action type 'glyphicon'
-----------------------
These actions are designed to process already displayed grid row, associated to existing Django model. Their
implementation is very similar to Action type 'button', but instead of clicking at any place of row, these actions
are visually displayed as bootstrap glyphicon links in separate columns of grid.

By default there is no ``glyphicon`` type actions enabled. But there is one standard action of such type implemented
in ``KoGridView``, `'delete' action`_.

'delete' action
~~~~~~~~~~~~~~~
This action deletes grid row (Django model instance) but is disabled by default. To enable grid row deletion, one has to
override Django grid ``get_action()`` method like this::

    from django_jinja_knockout.views import KoGridView
    from .models import Model1

    class Model1Grid(KoGridView):

        model = Model1

        # ... skipped ...

        def get_actions(self):
            actions = super().get_actions()
            actions['glyphicon']['delete']['enabled'] = True
            actions['built_in']['delete_confirmed']['enabled'] = True
            return actions

Note that `'delete_confirmed' action`_ is used as success callback for `'delete' action`_ also should be enabled.
`'delete_confirmed' action`_ section has the primer of checking delete permissions.

The action itself is defined in ``django_jinja_knockout.views.GridActionsMixin`` like this::

        OrderedDict([
            # Delete one or many model object.
            ('delete', {
                'localName': _('Remove'),
                'class': 'glyphicon-remove',
                'enabled': False
            })
        ])

See `Implementing custom grid row actions`_ section how to implement custom actions of ``'click'`` and ``'glyphicon'``
types.

.. highlight:: javascript

Grid rows may selectively enable / disable their actions on the fly with visual updates. It is especially important to
actions of type ``'glyphicon'``, because these are always visible in grid columns. To implement online update of
grid row actions one should override client-side ``App.ko.GridRow.hasEnabledAction()`` method like this::

    App.ko.Model1GridRow = function(options) {
        $.inherit(App.ko.GridRow.prototype, this);
        this.init(options);
    };

    (function(Model1GridRow) {

        Model1GridRow.hasEnabledAction = function(action) {
            if (action.name === 'ask_user') {
                return this.values['field2'] === 'APPROVED';
            } else {
                return true;
            }
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

This way ``glyphicon`` action with name ``'ask_user'`` link will be displayed only when associated Django model instance
field name ``field2`` has value ``'APPROVED'``. Updating grid rows with ``App.ko.Grid.updatePage()`` will cause refresh
of available grid rows actions display (see `'save_form' action`_ documentation).

Of course if action is not pure client-side (has ``callback_NAME``) then additional permission check also should be
performed in server-side Django grid ``action_NAME`` method, see `Action AJAX response handler`_ for explanation of
server-side actions vs pure client-side actions.

Implementing custom grid row actions
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
.. highlight:: python

First step to add new action is to override ``get_actions`` method in Django grid class. Let's create new action
``'ask_user'`` of ``'click'`` type::

    from django_jinja_knockout.views import KoGridView
    from .models import Model1
    from django.utils.translation import ugettext as _

    class Model1Grid(KoGridView):

        # ... skipped ...

        def get_actions(self):
            actions = super().get_actions()
            action_type = 'click'
            actions[action_type]['ask_user'] = {
                'localName': _('Add funds'),
                'class': 'btn-warning',
                'enabled': True
            }
            return actions

To create new action ``'ask_user'`` of ``'glyphicon'`` type instead::

    from django_jinja_knockout.views import KoGridView
    from .models import Model1
    from django.utils.translation import ugettext as _

    class Model1Grid(KoGridView):

        # ... skipped ...

        def get_actions(self):
            actions = super().get_actions()
            action_type = 'glyphicon'
            actions[action_type]['ask_user'] = {
                'localName': _('Add funds'),
                'class': 'glyphicon-cloud-upload',
                'enabled': True
            }
            return actions

Next step is to implement newly defined action server-side and / or client-side parts.

If one wants to add custom action via Django ``ModelForm`` class, then the server-side of the action might be
implemented like this::

    from django_jinja_knockout.views import KoGridView
    from .models import Model1
    from .forms import Model1Form, Model1AskUserForm

    class Model1Grid(KoGridView):

        # ... skipped ...

        # Based on GridActionsMixin.action_edit_form() implementation.
        def action_ask_user(self):
            pk_val = self.request_get('pk_val')
            obj = self.__class__.model.objects.filter(pk=pk_val).first()
            form = Model1AskUserForm(instance=obj)
            return self.vm_form(
                form, self.render_object_desc(obj), {'pk_val': pk_val}
            )

.. highlight:: javascript

``App.ModelFormDialog`` class will be used to render AJAX-generated Django ``ModelForm`` at client-side. One has to
inherit ``App.Model1GridActions`` from ``App.GridActions`` and define it's own ``callback_NAME`` (see
`Action AJAX response handler`_ for more info)::

    Model1GridActions.callback_ask_user = function(viewModel) {
        viewModel.grid = this.grid;
        var dialog = new App.ModelFormDialog(viewModel);
        dialog.show();
    };

Completely separate way of generating form with pure client-side underscore.js / Knockout.js templates for ``ask_user``
action (no AJAX callback is required)  is implemented in `Client-side actions`_ section of the documentation.

====================
ForeignKeyGridWidget
====================
``django_jinja_knockout.widgets.ForeignKeyGridWidget`` is similar to ``django.admin`` ``ForeignKeyRawIdWidget``, but
is easier to integrate into non-admin views. It provides built-in sorting / filters (and potentially even custom edit
actions) because it is based on the same code of ``KoGridView`` and ``App.ko.Grid``.

.. highlight:: python

To use ``ForeignKeyGridWidget`` in your form, import the widget and add it to your app ``forms.py`` ``ModelForm``
class::

    from django_jinja_knockout.forms import BootstrapModelForm
    from django_jinja_knockout.widgets import ForeignKeyGridWidget
    from .models import Model1

    # One also may inherit directly from forms.ModelForm, but bootstrap css classes
    # will not be applied automatically to the fields.
    class Model1Form(BootstrapModelForm):

        class Meta:
            model = Model1
            widgets = {
                'model2_fk': ForeignKeyGridWidget(grid_options={
                    'pageRoute': 'model2_fk_widget_grid',
                    'dialogOptions': {'size': 'size-wide'},
                    # Could have nested foreign key filter options defined, if required:
                    # 'fkGridOptions': {
                    #    'model3': {
                    #        'pageRoute': 'model3_grid'
                    #    }
                    # },
                    # Specify initial ordering, overriding default Django model Meta.ordering value (optional):
                    'defaultOrderBy': 'field3',
                    # Override default search field label (optional):
                    'searchPlaceholder': 'Search by field3'
                })
            }

Note that the value of ``grid_options`` argument of ``ForeignKeyGridWidget()`` is very much similar to definition of
``'fkGridOptions'`` value in `Foreign key filters`_ example of Django grid method ``get_default_grid_options()``.

It is because grid's foreign key filter is quite similar to ``ForeignKeyGridWidget``, with the difference that the first
one limits grid queryset, while second one is used to set foreign key value, to be later submitted via ``ModelForm``
(including both traditional HTML response and AJAX ones).

Widget's Python code generates client-side component similar to `ko_grid() macro`_, but it uses ``App.FkGridWidget``
component class instead of ``App.ko.Grid`` component class.

Next step is to define Django grid class which will control server-side part of our foreign key widget::

    from django_jinja_knockout.views import KoGridView
    from .models import Model2

    class Model2FkWidgetGrid(KoGridView):

        model = Model2
        grid_fields = [
            'field1', 'field2', 'field3'
        ]
        search_fields = [
            ('field3', 'contains'),
        ]
        allowed_sort_orders = '__all__'
        allowed_filter_fields = OrderedDict([
            ('field1', None),
            ('field2', None),
        ])

Now we have to register server-side part of foreign key widget as a url name in ``urls.py``::

    from my_app.views import Model2FkWidgetGrid

    # ... skipped ...

    url(r'^model2-fk-grid(?P<action>/?\w*)/$', Model2FkWidgetGrid.as_view(), name='model2_fk_widget_grid',
        kwargs={'ajax': True, 'permission_required': 'my_app.change_model2'}),

    # ... skipped ...

In your class-based view that handlers ``Model1Form`` inject ``'model2_fk_widget_grid'`` url name (route) at client-side
(see :doc:`viewmodels` for details about injecting url names to client-side)::

    from django.views.generic.edit import CreateView
    from .forms import Model2Form

    class Model2Create(CreateView):
        # Next line is required for ``Model2FkWidgetGrid`` to be callable from client-side:
        client_routes = ['model2_fk_widget_grid']
        form = Model2Form

Of course the same widget can be used in ``ModelForm`` related actions of grids like `'create_form' action`_ /
`'edit_form' action`_ and custom actions with ``ModelForm``.

When the widget is used in many different views, it's more handy to register client-side route (url name) globally in
project ``context_processors.py``::

    from django_jinja_knockout.context_processors import TemplateContextProcessor as BaseContextProcessor


    class TemplateContextProcessor(BaseContextProcessor):

        CLIENT_ROUTES = (
            ('model2_fk_widget_grid', True),
        )


    def template_context_processor(HttpRequest=None):
        return TemplateContextProcessor(HttpRequest).get_context_data()

.. highlight:: javascript

Client-side part of ``ForeignKeyGridWidget``, located in ``App.FkGridWidget``, uses ``App.GridDialog`` to browse and to
select foreign key field value for displayed ``ModelForm``. To render chosen visual representation of foreign key,
``App.GridDialog`` is instantiated with ``gridOptions.ajaxParams.row_model_str = true``::

    FkGridWidget.init = function(options) {
        var gridOptions = $.extend(options, {
            ajaxParams: {
                row_model_str: true
            },
            selectMultipleRows: false,
            showSelection: true
        });
        this.gridDialog = new App.GridDialog({
            ownerComponent: this,
            filterOptions: gridOptions
        });
    };

.. highlight:: python

The ``row_model_str`` parameter of grid is then passed to server-side ``KoGridView``, where it is used to generate
``str()`` representation for each Django model instance associated to each grid row::

    def postprocess_row(self, row, obj):
        str_fields = self.get_row_str_fields(obj, row)
        if str_fields is not None:
            row['__str_fields'] = str_fields
        if getattr(self ,'row_model_str', True):
            row['__str'] = str(obj)
        return row

Note that widget itself is dependent on ``base_min.htm`` Jinja2 template which includes Javascript files: Knockout.js,
``app.js``, ``ko-grid.js`` and so on. Either use ``base_min.htm`` as base template for your project, or develop a
separate templates with these client-side scripts included.

=================
Grids interaction
=================
Multiple grid components can be rendered at one html page. Each grid will have it's own sorting, filters, pagination and
actions. Sometimes it's desirable to update one grid state depending on action performed in another grid.

Server-side interaction between grids
-------------------------------------
Imagine that ``my_app.views`` has ``Model1Grid`` and ``Model2Grid`` class-based views.

``Model1Grid`` has custom action ``'ask_user'`` implemented as::

    from django_jinja_knockout.views import KoGridView
    from .models import Model1, Model2

    class Model1Grid(KoGridView):

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

        def action_ask_user(self):
            obj = Model1.objects.filter(pk=self.request_get('pk_val')).first()
            if operation_request is None:
                return vm_list({
                    'view': 'alert_error',
                    'title': 'Error',
                    'message': 'Unknown instance of Model1'
                })
            # Perform custom method of Model1, which returns Model2 queryset or Python list of Model2 instances:
            model2_qs = obj.confirm_ask_user()
            # Instantiate Model2Grid to update it.
            model2_grid = Model2Grid()
            model2_grid.request = self.request
            model2_grid.init_class(model2_grid)
            # Postprocess Model2Grid rows for client-side App.ko.Model2Grid.updatePage():
            model2_grid_rows = model2_grid.postprocess_qs(model2_qs)
            return vm_list({
                'view': self.__class__.viewmodel_name,
                'update_rows': self.postprocess_qs([obj]),
                # return grid rows for client-side App.ko.Model2Grid.updatePage():
                'model2_grid_view': {
                    'update_rows': model2_grid_rows
                }
            })

    class Model2Grid(KoGridView):

        model = Model2

        grid_fields = [
            'field1',
            'field2',
            'field3'
        ]

Note that grid viewmodel returned by ``Model1Grid.action_ask_user()`` method has ``'model2_grid_view'`` subproperty
which will be used to update rows of ``Model2Grid``. Two lists of rows will be returned to be updated by
`App.ko.Grid.updatePage() method`_:

* vm_list ``'update_rows': self.postprocess_qs([obj])`` list of rows to be updated for ``Model1Grid``
* vm_list ``'model2_grid_view': {'update_rows': model2_grid_rows}`` list of rows to be updated for ``Model2Grid``


Client-side interaction between grids
-------------------------------------
.. highlight:: javascript

At client-side ``Model1Grid`` has to implement custom ``App.GridActions`` derived class with custom callback for
``'ask_user'`` action::

    App.Model1GridActions = function(options) {
        $.inherit(App.GridActions.prototype, this);
        this.init(options);
    };

    (function(Model1GridActions) {

        Model1GridActions.callback_ask_user = function(viewModel) {
            var model2GridView = viewModel.model2_grid_view;
            delete viewModel.model2_grid_view;

            this.grid.updatePage(viewModel);
            // Get client-side class of Model2Grid component by id (instance of App.ko.Grid or derived class).
            var model2Grid = $('#model2_grid').component();
            if (model2Grid !== null) {
                // Update rows of Model2Grid component (instance of App.ko.Grid or derived class).
                model2Grid.updatePage(model2GridView);
            }
        };

    })(App.Model1GridActions.prototype);

    App.ko.Model1Grid = function(options) {
        $.inherit(App.ko.Grid.prototype, this);
        this.init(options);
    };

    (function(Model1Grid) {

        Model1Grid.iocGridActions = function(options) {
            return new App.Model1GridActions(options);
        };

    })(App.ko.Model1Grid.prototype);

Let's explain ``callback_ask_user()`` code flow:

* ``this.grid`` stores an instance of ``App.ko.Grid`` for ``Model1Grid``. We call ``.updatePage(viewModel)`` on that
  instance to update rows of current grid.
* jQuery selector ``$('#model2_grid')`` finds root DOM element for ``Model2Grid`` component. It's ``App.ko.Grid``
  instance is retrieved with ``.component()`` call on that jQuery selector. When grid class instance is stored in
  local ``model2Grid`` variable, it's rows are updated by callling ``.updatePage(model2GridView)`` method of that grid.

See also ``dom_attrs`` argument of `ko_grid() macro`_ to understand how to set grid component DOM id like
``'#model2_grid'`` in the example above.

========================
Grid custom action types
========================
.. highlight:: python

It is possible to define new grid action types. However to display these at client-side one has to use custom templates,
which is explained in `Modifying visual layout of grid`_ section.

Let's define new action type ``'button_bottom'``, which will be displayed as grid action buttons below the grid rows,
not above as standard ``'button'`` action type actions.

First step is to override your Django grid class ``get_actions()`` method to return new grid action type with action
definition(s)::

    class Model1Grid(KoGridView):

        model = Model1

        # ... skipped ...

        def get_actions(self):
            actions = super().get_actions()
            # Custom type UI actions.
            actions['button_bottom'] = OrderedDict([
                ('approve_user', {
                    'localName': _('Approve user'),
                    'class': {
                        'button': 'btn-warning',
                        'glyphicon': 'glyphicon-user'
                    },
                    'enabled': True
                })
            ])
            return actions

        def get_custom_meta(self):
            return {
                'user_name': str(self.user)
            }

        def action_meta(self):
            vm = super().action_meta()
            vm['meta'].update(self.get_custom_meta())
            return vm

        def action_approve_user(self):
            role = self.request.POST.get('role_str')
            self.user = self.request.POST.get('user_id')
            self.user.set_role(role)
            # Implement custom logic in user model:
            user.approve()
            return vm_list({
                'view': self.__class__.viewmodel_name,
                'title': format_html('User was approved {0}', self.user.username),
                'message': 'Congratulations!!!',
                'meta': self.get_custom_meta(),
                'update_rows': [self.user]
            })

.. highlight:: javascript

Second step is to override ``uiActionTypes`` property of client-side ``App.ko.Grid`` class to add ``'button_bottom'`` to
the list of interactive action types::

    App.ko.Model1Grid = function(options) {
        $.inherit(App.ko.Grid.prototype, this);
        this.init(options);
    };

    (function(Model1Grid) {

        Model1Grid.uiActionTypes = ['button', 'click', 'glyphicon', 'button_bottom'];

        Model1Grid.iocGridActions = function(options) {
            return new App.Model1GridActions(options);
        };

        Model1Grid.getRoleFilterChoice = function() {
            return this.getKoFilter('role').getActiveChoices()[0];
        };

    })(App.ko.Model1Grid.prototype);

One also has to implement client-side handling methods for newly defined ``approve_user`` action. The following example
assumes that the action will be perofmed as AJAX query / response with ``Model1Grid.action_approve_user()`` defined
above::

    App.Model1GridActions = function(options) {
        $.inherit(App.GridActions.prototype, this);
        this.init(options);
    };

    (function(Model1GridActions) {

        Model1GridActions.queryargs_approve_user = function(options) {
            var roleFilterChoice = this.grid.getRoleFilterChoice();
            options['role_str'] = roleFilterChoice.value;
            return options;
        };

        Model1GridActions.callback_approve_user = function(viewModel) {
            // Update grid meta (visual appearance).
            this.grid.updateMeta(viewModel.meta);
            // Update grid rows.
            this.grid.updatePage(viewModel);
            // Display dialog with server-side title / message generated in Model1Grid.action_approve_user.
            var dialog = new App.Dialog(viewModel);
            dialog.alert();
        };

    })(App.Model1GridActions.prototype);


.. highlight:: jinja

And the final step is to generate client-side component in Jinja2 template with overriden ``ko_grid_body`` template ::

    {% extends 'base_min.htm' %}
    {% from 'bs_navs.htm' import bs_navs with context %}
    {% from 'ko_grid.htm' import ko_grid with context %}
    {% from 'ko_grid_body.htm' import ko_grid_body with context %}


    {% block main %}

    {{ bs_navs(main_navs) }}

    {{ ko_grid(
        grid_options={
            'pageRoute': 'model1_grid',
        },
        dom_attrs={
            'id': 'model1_grid'
        },
        body_call_id='model1_ko_grid_body'
    ) }}

    {% endblock main %}

    {% block bottom_scripts %}
        {{ ko_grid_body() }}
        {{
            ko_grid_body(
                call_ids={
                    'ko_grid_body': 'model1_ko_grid_body',
                },
                template_ids={
                    'ko_grid_nav': 'model1_ko_grid_nav',
                    'ko_grid_table': 'model1_ko_grid_table'
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
                    <div data-template-id="model1_ko_grid_table"></div>
                    <!-- ko foreach: actionTypes['button_bottom'] -->
                        <button class="btn" data-bind="css: getKoCss('button'), click: function() { doAction({}); }">
                            <span class="glyphicon" data-bind="css: getKoCss('glyphicon')"></span>
                            <span data-bind="text: $data.localName"></span>
                        </button>
                    <!-- /ko -->
                </div>
            </div>
        </script>

        <script src="{{ static_hash('js/front/ko-grid.js') }}"></script>
        <script src="{{ static_hash('js/front/model1-grid.js') }}"></script>
    {% endblock bottom_scripts %}

Knockout.js ``<!-- ko foreach: actionTypes['button_bottom'] -->`` binding is very similar to standard ``'button'`` type
actions binding with the exception that buttons are placed below the grid table, not above.

App.FilterDialog
App.GridDialog
App.ModelFormDialog
App.ActionsMenuDialog
App.ActionTemplateDialog
row_model_str
ioc
methods to get actions / filters / rows / row field values
Grid init options.
action permissions
