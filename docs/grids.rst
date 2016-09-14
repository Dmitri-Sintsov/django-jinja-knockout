=====
Grids
=====

.. _contenttypes framework: https://docs.djangoproject.com/en/dev/ref/contrib/contenttypes/
.. _django.contrib.admin.widgets: https://github.com/django/django/blob/master/django/contrib/admin/widgets.py

.. _base_bottom_scripts.htm: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/base_bottom_scripts.htm
.. _base_min.htm: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/base_min.htm
.. _cbv_grid.htm: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/cbv_grid.htm
.. _cbv_grid_inline.htm: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/cbv_grid_inline.htm
.. _club_grid.html: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/club_app/templates/club_grid.html
.. _club_grid_with_action_logging.htm: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/club_app/jinja2/club_grid_with_action_logging.htm
.. _ko_grid.htm: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/ko_grid.htm
.. _ko_grid_body.htm: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/ko_grid_body.htm
.. _member_grid_custom_actions.htm: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/club_app/jinja2/member_grid_custom_actions.htm
.. _member_grid_tabs.htm: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/club_app/jinja2/member_grid_tabs.htm

.. _app.js: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/static/js/front/app.js
.. _club-grid.js: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/djk_sample/static/js/front/club-grid.js
.. _formsets.js: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/static/js/front/formsets.js
.. _ko_grid.js: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/static/js/front/ko-grid.js
.. _knockout.js: http://knockoutjs.com/
.. _member-grid.js: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/djk_sample/static/js/front/member-grid.js
.. _underscore.js template: http://underscorejs.org/#template

.. _club_app.forms: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/club_app/forms.py
.. _club_app.models: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/club_app/models.py
.. _club_app.views_ajax: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/club_app/views_ajax.py
.. _event_app.models: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/event_app/models.py
.. _event_app.views_ajax: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/event_app/views_ajax.py
.. _forms.FormWithInlineFormsets: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/forms.py
.. _views: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/views.py
.. _views.GridActionsMixin: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/views.py
.. _views.KoGridInline: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/views.py
.. _views.KoGridView: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/views.py
.. _urls.py: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/djk_sample/urls.py
.. _widgets.ForeignKeyGridWidget: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/widgets.py


Introduction
------------
Client-side `ko_grid.js`_ script and server-side `views.KoGridView`_ Python class provide possibility to create
AJAX-powered grids for Django models, similar to traditional ``django.contrib.admin`` built-in module which
implements such functionality with traditional HTML page generation.

``views.KoGridView`` itself is based on common foundation with ``views.ListSortingView`` via ``views.BaseFilterView``,
which allows to partially share the functionality between AJAX grids and traditional paginated lists, although
currently grids are more full-featured (for example support wider variety of model field filters).

`knockout.js`_ viewmodels are used to display / update AJAX grids.

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
* Optional `Foreign key filter`_ for AJAX grid components.
* Django ``ModelForm`` widget `ForeignKeyGridWidget`_ which provides ``ForeignKeyRawIdWidget``-like functionality for
  ``ModelForm`` to select foreign key field value via AJAX query / response.

Models used in this documentation
---------------------------------
.. highlight:: python

This documentation refers to Django models with one to many relationship defined in `club_app.models`_::

    class Club(models.Model):
        CATEGORY_RECREATIONAL = 0
        CATEGORY_PROFESSIONAL = 1
        CATEGORIES = (
            (CATEGORY_RECREATIONAL, 'Recreational'),
            (CATEGORY_PROFESSIONAL, 'Professional'),
        )
        title = models.CharField(max_length=64, unique=True, verbose_name='Title')
        category = models.IntegerField(
            choices=CATEGORIES, default=CATEGORY_RECREATIONAL, db_index=True, verbose_name='Category'
        )
        foundation_date = models.DateField(db_index=True, verbose_name='Foundation date')

        class Meta:
            verbose_name = 'Sport club'
            verbose_name_plural = 'Sport clubs'
            ordering = ('title', 'category')

        def save(self, *args, **kwargs):
            if self.pk is None:
                if self.foundation_date is None:
                    self.foundation_date = timezone.now()
            super().save(*args, **kwargs)

        def get_canonical_link(self):
            return str(self.title), reverse('club_detail', kwargs={'club_id': self.pk})

        def get_str_fields(self):
            return OrderedDict([
                ('title', self.title),
                ('category', self.get_category_display()),
                ('foundation_date', format_local_date(self.foundation_date))
            ])

        def __str__(self):
            return ' › '.join(self.get_str_fields().values())


    class Member(models.Model):
        SPORT_BADMINTON = 0
        SPORT_TENNIS = 1
        SPORT_TABLE_TENNIS = 2
        SPORT_SQUASH = 3
        SPORT_ANOTHER = 4
        BASIC_SPORTS = (
            (SPORT_BADMINTON, 'Badminton'),
            (SPORT_TENNIS, 'Tennis'),
            (SPORT_TABLE_TENNIS, 'Table tennis'),
            (SPORT_SQUASH, 'Squash'),
        )
        SPORTS = BASIC_SPORTS + ((SPORT_ANOTHER, 'Another sport'),)
        ROLE_OWNER = 0
        ROLE_FOUNDER = 1
        ROLE_MEMBER = 2
        ROLES = (
            (ROLE_OWNER, 'Owner'),
            (ROLE_FOUNDER, 'Founder'),
            (ROLE_MEMBER, 'Member'),
        )
        profile = models.ForeignKey(Profile, verbose_name='Sportsman')
        club = models.ForeignKey(Club, blank=True, verbose_name='Club')
        last_visit = models.DateTimeField(db_index=True, verbose_name='Last visit time')
        plays = models.IntegerField(choices=SPORTS, default=SPORT_ANOTHER, verbose_name='Plays sport')
        role = models.IntegerField(choices=ROLES, default=ROLE_MEMBER, verbose_name='Member role')
        note = models.TextField(max_length=16384, blank=True, default='', verbose_name='Note')
        is_endorsed = models.BooleanField(default=False, verbose_name='Endorsed')

        class Meta:
            unique_together = ('profile', 'club')
            verbose_name = 'Sport club member'
            verbose_name_plural = 'Sport club members'

        def get_canonical_link(self):
            str_fields = self.get_str_fields()
            join_dict_values(' / ', str_fields, ['profile', 'club'])
            return ' / '.join([str_fields['profile'], str_fields['club']]), \
                   reverse('member_detail', kwargs={'member_id': self.pk})

        def get_str_fields(self):
            parts = OrderedDict([
                ('profile', self.profile.get_str_fields()),
                ('club', self.club.get_str_fields()),
                ('last_visit', format_local_date(timezone.localtime(self.last_visit))),
                ('plays', self.get_plays_display()),
                ('role', self.get_role_display()),
                ('is_endorsed', 'endorsed' if self.is_endorsed else 'unofficial')
            ])
            return parts

        def __str__(self):
            str_fields = self.get_str_fields()
            join_dict_values(' / ', str_fields, ['profile', 'club'])
            return ' › '.join(str_fields.values())

Simpliest grid
--------------

If you have Django model created and migrated, then it is quite easy to add grid for that model to Django app Jinja2
template, providing your templates are inherited from `base_min.htm`_, or based on a custom-based template which
includes the same client-side scripts as ``base_min.htm`` does.

In your app view code (we use `club_app.views_ajax`_ in this example) create the following view::

    class SimpleClubGrid(KoGridView):

        model = Club
        grid_fields = '__all__'
        # Remove next line to disable columns sorting:
        allowed_sort_orders = '__all__'

Now let's add an url name (route) in `urls.py`_::

    from club_app.views_ajax import SimpleClubGrid

    # ... skipped ...

    url(r'^club-grid-simple(?P<action>/?\w*)/$', SimpleClubGrid.as_view(), name='club_grid_simple',
        kwargs={'view_title': 'Simple club grid', 'permission_required': 'club_app.change_club'}),
    # ... skipped ...

``url()`` regex named capture group ``<action>`` will be used by ``KoGridView.post()`` method for class-based view
kwargs value HTTP routing to provide grid pagination and optional CRUD actions. Custom actions might be implemented
via ancestor classes of ``KoGridView``.

We assume that our grid may later define actions which can change ``Club`` table rows, thus our view requires
``club_app.change_club`` permission from built-in ``django.contrib.auth`` module.

.. highlight:: jinja

Our grid is works just with few lines of code, but where is the template that generated initial HTML content?

By default, KoGridView uses built-in `cbv_grid.htm`_ template, which content looks like this::

    {% from 'ko_grid.htm' import ko_grid with context %}
    {% from 'ko_grid_body.htm' import ko_grid_body with context %}
    {% extends 'base.htm' %}

    {% block main %}

    {{
    ko_grid(
        grid_options={
            'pageRoute': view.request.url_name,
        }
    )
    }}

    {% endblock main %}

    {% block bottom_scripts %}
        {{ ko_grid_body() }}
        <script src="{{ static('js/front/ko-grid.js') }}"></script>
    {% endblock bottom_scripts %}

One may extend this template to customize grid, which we will do later.

Take a note that two Jinja2 macros are imported. Let's explain their purpose.

ko_grid() macro
~~~~~~~~~~~~~~~

.. highlight:: html

First macro ``ko_grid()`` generates html code of client-side component which looks like this in the generated page html::

    <div class="component" id="club_grid" data-component-options='{"pageRoute": "club_grid", "classPath": "App.ko.Grid"}'>
    <a name="club_grid"></a>
        <div data-template-id="ko_grid_body" data-template-args='{"show_pagination": true, "vscroll": true, "show_title": true, "show_action_buttons": true}'>
        </div>
    </div>

The code is inserted into web page body block.

``ko_grid()`` macro accepts the following kwargs:

* Mandatory ``grid_options`` are client-side component options of current grid. It's a dict with the following keys:

  * Mandatory key ``'pageRoute'`` is used to get Python grid class in ``ko_grid()`` macro to autoconfigure client-side
    options of grid (see the macro code in `ko_grid.htm`_ for details).
  * Optional key ``classPath`` overrides client-side class used for instantiation of grid. Usually that should be
    ancestor of ``App.ko.Grid`` class inserted via custom ``<script>`` tag to ``bottom_scripts`` Jinja2 template block.

* Optional ``template_options`` argument is passed as ``data-template-args`` attribute to `underscore.js template`_,
  which is then used to alter visual layout of grid. In our case we assume that rows of ``club_app.Club`` may be
  visually long enough so we turn on vertical scrolling for these (which is off by default).
* Optional ``dom_attrs`` argument is used to set extra DOM attributes of component template. It passes the value of
  component DOM id attribute which may then be used to get the instance of component (instance of ``App.ko.Grid`` class).
  It is especially useful in pages which define multiple grids that interact to each other.

Of course this HTML is not the full DOM subtree of grid but a stub. It will be automatically expanded with the content
of underscore.js template with name ``ko_grid_body`` by ``App.loadTemplates()`` call defined in
``App.initClientHooks``, then automatically bound to newly created instance of ``App.ko.Grid`` Javascript class via
``App.components.add()`` to make grid "alive".

See `app.js`_ code for the details of client-side components implementation.

ko_grid_body() macro
~~~~~~~~~~~~~~~~~~~~

``ko_grid_body()`` macro, defined in `ko_grid_body.htm`_ is inserted into web page bottom scripts block.
However it does not contain directly executed Javascript code, but a set of recursive ``underscore.js`` templates (such
as ``ko_grid_body``) that are applied automatically to each grid component DOM nodes, generated by beforementioned
``ko_grid()`` Jinja2 macro.

Then `cbv_grid.htm`_ includes actual client-side implementation of ``App.ko.Grid`` from `ko_grid.js`_. The script
is not so small, and grids are not always displayed at each Django page, so it is not included in `base_min.htm`_
``bottom_scripts`` block by default to make total pages traffic lower. However, it's size is well-justified knowing
that it is loaded just once for all grids of the side. Usually it's cached at client-side by browser, and reduces quite
a lot of HTTP traffic for grid pagination and grid actions.

==================
Grid configuration
==================

.. highlight:: python

Let's see some more advanced grid sample for the ``club_app.models.Member``, Django view part::

    from django_jinja_knockout.views import KoGridView
    from .models import Member

    class MemberGrid(KoGridView):

        client_routes = [
            'member_grid',
            # url name (route) for 'profile' key of allowed_filter_fields
            'profile_fk_widget_grid',
            # url name (route) for 'club' key of allowed_filter_fields
            'club_grid_simple'
        ]
        # Use custom grid template instead of default 'cbv_grid.htm' template.
        template_name = 'member_grid.htm'
        model = Member
        grid_fields = [
            'profile',
            'club',
            # Will join 'category' field from related 'Club' model automatically via Django ORM (span relationships).
            'club__category',
            'last_visit',
            'plays',
            'role',
            'note',
            'is_endorsed'
        ]
        search_fields = [
            ('club__title', 'icontains'),
            ('profile__first_name', 'icontains'),
            ('profile__last_name', 'icontains')
        ]
        allowed_sort_orders = [
            'club',
            'last_visit',
            'plays',
            'is_endorsed'
        ]
        allowed_filter_fields = OrderedDict([
            ('profile', None),
            ('club', None),
            ('last_visit', None),
            ('club__category', None),
            # Include only some Django model choices and disable multiple choices for 'plays' filter.
            ('plays', {
                'type': 'choices', 'choices': Member.BASIC_SPORTS, 'multiple_choices': False
            }),
            ('role', None),
            ('is_endorsed', None),
        ])

See `club_app.views_ajax`_ for the full sample.

Grid fields
-----------
Django model may have many fields, some of these having long string representation, thus visually grid may become too
large to fit the screen and hard to navigate. Not all of the fields always has to be displayed.

Some fields may need to be hidden from user for security purposes. One also might want to display foreign key span
relationships, which are implemented in Django ORM via ``'__'`` separator between related fields name, like
``club__category`` in this example.

Set Django grid class ``grid_fields`` property value to the list of model fields that will be displayed as grid columns.
Foreign key relationship spans are supported too.

Customizing visual display of grid fields at client-side
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. highlight:: javascript

To alter visual representation of grid row cells, one should override ``App.ko.GridRow.toDisplayValue()`` Javascript
class method, to implement custom display layout of field values at client-side. The same method also can be used to
generate condensed representations of long text values via Boostrap popovers, or even to display fields as form inputs:
using grid as paginated AJAX form - (which is also possible but requires writing custom ``underscore.js`` grid layout
templates, partially covered in modifying_visual_layout_of_grid_)::

    'use strict';

    App.ko.MemberGridRow = function(options) {
        $.inherit(App.ko.GridRow.prototype, this);
        this.init(options);
    };

    (function(MemberGridRow) {

        MemberGridRow.useInitClient = true;

        MemberGridRow.toDisplayValue = function(value, field) {
            var displayValue = this._super._call('toDisplayValue', value, field);
            switch (field) {
            case 'role':
                // Display field value as bootstrap label.
                var types = ['success', 'info', 'primary'];
                displayValue = $('<span>', {
                    'class': 'label preformatted'
                })
                .text(displayValue)
                .addClass(
                    'label-' + (this.values[field] < types.length ? types[this.values[field]] : 'info')
                );
                break;
            case 'note':
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
                    }).text('Full text');
                }
                break;
            case 'is_endorsed':
                // Display field value as form input.
                var attrs = {
                    'type': 'checkbox',
                    'class': 'form-field club-member',
                    'data-pkval': this.getValue(this.ownerGrid.meta.pkField),
                    'name': field + '[]',
                };
                if (this.values[field]) {
                    attrs['checked'] = 'checked';
                }
                displayValue = $('<input>', attrs);
            }
            return displayValue;
        };

    })(App.ko.MemberGridRow.prototype);


    App.ko.MemberGrid = function(options) {
        $.inherit(App.ko.Grid.prototype, this);
        this.init(options);
    };

    (function(MemberGrid) {

        MemberGrid.iocRow = function(options) {
            return new App.ko.MemberGridRow(options);
        };

    })(App.ko.MemberGrid.prototype);

See `member-grid.js`_ for full-size example.

``App.ko.GridRow.toDisplayValue()`` method used in `ko_grid.js`_ ``grid_row_value`` binding supports the following types
of values:

.. highlight:: python

* jQuery objects, whose set of elements will be added to cell DOM

.. _get_str_fields:

* Nested list of values, which is automatically passed to client-side in AJAX response by ``KoGridView`` when current
  Django model has ``get_str_fields()`` method implemented. This method returns str() representation of some or all
  model fields::

    class Member(models.Model):

        # ... skipped ...

        # returns the list of str() values for all or some of model fields,
        # optionally spanning relationships via nested lists.
        def get_str_fields(self):
            parts = OrderedDict([
                ('profile', self.profile.get_str_fields()),
                ('club', self.club.get_str_fields()),
                ('last_visit', format_local_date(timezone.localtime(self.last_visit))),
                ('plays', self.get_plays_display()),
                ('role', self.get_role_display()),
                ('is_endorsed', 'endorsed' if self.is_endorsed else 'unofficial')
            ])
            return parts

        # It's preferrable to reconstruct model's str() via get_str_fields() to keep it DRY.
        def __str__(self):
            str_fields = self.get_str_fields()
            join_dict_values(' / ', str_fields, ['profile', 'club'])
            return ' › '.join(str_fields.values())

Note that ``get_str_fields()`` will also be used for automatic formatting of scalar fields via grid row ``str_fields``
property. See `'list' action`_ for more info.

.. highlight:: javascript

* Scalar values will be placed into grid cells via ``jQuery.html()`` WITHOUT XSS protection. Usually these values are
  server-side Django generated strings. Make sure these strings do not contain unsafe HTML to prevent XSS. Here's the
  implementation in   version 0.2.0 `ko_grid.js`_::

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

To override client-side class to ``App.ko.MemberGrid`` instead of default ``App.ko.Grid``, define default grid
options like this::

    from django_jinja_knockout.views import KoGridView
    from .models import Member

    # ... skipped ...

    class MemberGrid(KoGridView):

        # ... skipped ...
        @classmethod
        def get_default_grid_options(cls):
            return {
                'classPath': 'App.ko.MemberGrid'
            }

Virtual fields
~~~~~~~~~~~~~~

.. highlight:: python

``views.KoGridView`` also supports virtual fields, which are not real database table fields, but a calculated values.
It supports both SQL calculated fields via Django ORM annotations and virtual fields calculated in Python code.
To implement virtual field(s), one has to override the following methods in the grid child class::

    class ClubGridWithVirtualField(SimpleClubGrid):

        grid_fields = [
            'title',
            'category',
            'foundation_date',
            # Annotated field.
            'total_members',
            # Virtual field.
            'exists_days'
        ]

        def get_base_queryset(self):
            # Django ORM annotated field 'total_members'.
            return super().get_base_queryset().annotate(total_members=Count('member'))

        def get_field_verbose_name(self, field_name):
            if field_name == 'exists_days':
                # Add virtual field.
                return 'Days since foundation'
            elif field_name == 'total_members':
                # Add annotated field.
                return 'Total members'
            else:
                return super().get_field_verbose_name(field_name)

        def get_related_fields(self, query_fields=None):
            query_fields = super().get_related_fields(query_fields)
            # Remove virtual field from queryset values().
            query_fields.remove('exists_days')
            return query_fields

        def get_model_fields(self):
            model_fields = copy(super().get_model_fields())
            # Remove annotated field which is unavailable when creating / updating single object which does not uses
            # self.get_base_queryset()
            # Required only because current grid is editable.
            model_fields.remove('total_members')
            return model_fields

        def postprocess_row(self, row, obj):
            # Add virtual field value.
            row['exists_days'] = (timezone.now().date() - obj.foundation_date).days
            if 'total_members' not in row:
                # Add annotated field value which is unavailable when creating / updating single object which does not uses
                # self.get_base_queryset()
                # Required only because current grid is editable.
                row['total_members'] = obj.member_set.count()
            row = super().postprocess_row(row, obj)
            return row

        # Optional formatting of virtual field (not required).
        def get_row_str_fields(self, obj, row):
            str_fields = super().get_row_str_fields(obj, row)
            if str_fields is None:
                str_fields = {}
            # Add formatted display of virtual field.
            is_plural = pluralize(row['exists_days'], arg='days')
            str_fields['exists_days'] = '{} {}'.format(row['exists_days'], 'day' if is_plural == '' else is_plural)
            return str_fields

See `club_app.views_ajax`_ code for full implementation.

Filter fields
-------------
Grid supports different types of filters for model fields, to reduce paginated queryset, which helps to locate specific
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
                    'active_choices': ['field1_value_1'],
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
            # Select foreign key choices via AJAX grid built into BootstrapDialog.
            # Can be replaced to ('model2_fk', None) to autodetect filter type,
            # but explicit type might be required when using IntegerField as foreign key.
            ('model2_fk', {
                'type': 'fk'
            }),
        ])

Next types of built-in field filters are available:

Range filters
~~~~~~~~~~~~~

* ``'decimal' filter`` / ``'datetime' filter`` / ``'date' filter``: Uses ``App.ko.RangeFilter`` from `ko_grid.js`_ to
  display dialog with range of scalar values. It's applied to the corresponding Django model scalar fields.

Choices filter
~~~~~~~~~~~~~~

* ``'choices' filter`` is used by default when Django model field has ``choices`` property defined, similar to this::

    from django.utils.translation import ugettext as _
    # ... skipped ...

    class Member(models.Model):
        SPORT_BADMINTON = 0
        SPORT_TENNIS = 1
        SPORT_TABLE_TENNIS = 2
        SPORT_SQUASH = 3
        SPORT_ANOTHER = 4
        BASIC_SPORTS = (
            (SPORT_BADMINTON, 'Badminton'),
            (SPORT_TENNIS, 'Tennis'),
            (SPORT_TABLE_TENNIS, 'Table tennis'),
            (SPORT_SQUASH, 'Squash'),
        )
        SPORTS = BASIC_SPORTS + ((SPORT_ANOTHER, 'Another sport'),)
        ROLE_OWNER = 0
        ROLE_FOUNDER = 1
        ROLE_MEMBER = 2
        ROLES = (
            (ROLE_OWNER, 'Owner'),
            (ROLE_FOUNDER, 'Founder'),
            (ROLE_MEMBER, 'Member'),
        )
        profile = models.ForeignKey(Profile, verbose_name='Sportsman')
        club = models.ForeignKey(Club, blank=True, verbose_name='Club')
        last_visit = models.DateTimeField(db_index=True, verbose_name='Last visit time')
        plays = models.IntegerField(choices=SPORTS, default=SPORT_ANOTHER, verbose_name='Plays sport')
        role = models.IntegerField(choices=ROLES, default=ROLE_MEMBER, verbose_name='Member role')
        note = models.TextField(max_length=16384, blank=True, default='', verbose_name='Note')
        is_endorsed = models.BooleanField(default=False, verbose_name='Endorsed')

When using field filter autodetection in grid view, instance of ``App.ko.GridFilter`` will be created, representing
a dropdown with the list of possible choices from the ``Club.CATEGORIES`` tuple above::

    from django_jinja_knockout.views import KoGridView
    from .models import Member

    class MemberGrid(KoGridView):

        model = Member
        # ... skipped ...

        allowed_filter_fields = OrderedDict([
            ('profile', None),
            ('club', None),
            ('last_visit', None),
            ('club__category', None),
            # Include all Django model field choices, multiple selection will be auto-enabled
            # when there are more than two choices.
            ('plays', None),
            ('role', None),
            ('is_endorsed', None),
        ])

The ``'choices' filter`` definition may be customized by supplying a dict with additional keys / values::

    class MemberGrid(KoGridView):

        model = Member
        # ... skipped ...

        allowed_filter_fields = OrderedDict([
            ('profile', None),
            ('club', None),
            ('last_visit', None),
            ('club__category', None),
            # Include only limited BASIC_SPORTS Django model field choices
            # and disable multiple choices for 'plays' filter.
            ('plays', {
                'type': 'choices', 'choices': Member.BASIC_SPORTS, 'multiple_choices': False
            }),
            ('role', None),
            ('is_endorsed', None),
        ])

Foreign key filter
~~~~~~~~~~~~~~~~~~

* ``'fk' filter``: Uses ``App.ko.FkGridDialog`` from `ko_grid.js`_ to select filter choices of foreign key field. This
  widget is similar to ``ForeignKeyRawIdWidget`` defined in `django.contrib.admin.widgets`_ that is used via
  ``raw_id_fields`` django.admin class option. Because it completely relies on AJAX calls, one should create grid class
  for the foreign key field, for example::

    class ProfileFkWidgetGrid(KoGridWidget):

        model = Profile
        form = ProfileForm
        enable_deletion = True
        grid_fields = ['first_name', 'last_name']
        allowed_sort_orders = '__all__'

Define it's url name (route) in `urls.py`_ in usual way::

    url(r'^profile-fk-widget-grid(?P<action>/?\w*)/$', ProfileFkWidgetGrid.as_view(),
        name='profile_fk_widget_grid',
        # kwargs={'ajax': True, 'permission_required': 'club_app.change_profile'}),
        kwargs={'ajax': True}),

Now, to bind 'fk' widget for field ``Member.profile`` to ``profile-fk-widget-grid`` url name (route)::

    class MemberGrid(KoGridView):

        client_routes = [
            'member_grid',
            'profile_fk_widget_grid',
            'club_grid_simple'
        ]
        template_name = 'member_grid.htm'
        model = Member
        grid_fields = [
            'profile',
            'club',
            'last_visit',
            'plays',
            'role',
            'note',
            'is_endorsed'
        ]
        allowed_filter_fields = OrderedDict([
            ('profile', None),
            ('club', None),
            ('last_visit', None),
            ('plays', None),
            ('role', None),
            ('is_endorsed', None),
        ])

        # ... skipped ...

        @classmethod
        def get_default_grid_options(cls):
            return {
                # Note: 'classPath' is not required for standard App.ko.Grid.
                'classPath': 'App.ko.MemberGrid',
                'searchPlaceholder': 'Search for club or member profile',
                'fkGridOptions': {
                    'profile': {
                        'pageRoute': 'profile_fk_widget_grid'
                    },
                    'club': {
                        'pageRoute': 'club_grid_simple',
                        # Optional setting for BootstrapDialog:
                        'dialogOptions': {'size': 'size-wide'},
                        # Nested filtering is supported:
                        # 'fkGridOptions': {
                        #     'specialization': {
                        #         'pageRoute': 'specialization_grid'
                        #     }
                        # }
                    }
                }
            }

Also notice that commented section of ``MemberGrid.get_default_grid_options()`` method shows how foreign key filter
widgets may be nested:

* Define model ``Specialization``.
* Add foreignKey field ``specialization = models.ForeignKey(Specialization, verbose_name='Specialization')`` to
  ``Profile`` model.
* Create ``SpecializationGrid`` with ``model = Specialization``.
* Add url for ``SpecializationGrid`` with url name (route) ``'specialization_grid'`` to ``urls.py``.
* Add ``'specialization_grid'`` entry to ``MemberGrid`` ``client_routes`` list.

Dynamic generation of filter fields
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
There are many cases when grids require dynamic generation of filter fields and their values:

* Different types of filters for end-users depending on their permissions.
* Implementing base grid pattern, when there is a base grid class defining base filters, and few child classes, which
  may alter / add / delete some of the filters.
* ``'choices' filter`` values might be provided via Django database queryset.
* ``'choices' filter`` values might be generated as foreign key id's for Django `contenttypes framework`_ generic models
  relationships.

Let's explain the last case as the most advanced one.

Generation of ``'choices' filter`` list of choice values for Django contenttypes framework is implemented via
``BaseFilterView.get_contenttype_filter()`` method, whose class is a base class for both ``KoGridView`` and it's
traditional request counterpart ``ListSortingView`` (see `views`_ for details).

We want to implement generic action logging, similar to ``django.admin`` logging but visually displayed as AJAX grid.
Our ``Action`` model, defined in `event_app.models`_ looks like this::

    from collections import OrderedDict

    from django.utils import timezone
    from django.db import models
    from django.db import transaction
    from django.contrib.auth.models import User
    from django.contrib.contenttypes.fields import GenericForeignKey
    from django.contrib.contenttypes.models import ContentType

    from django_jinja_knockout.tpl import format_local_date
    from django_jinja_knockout.utils.sdv import join_dict_values

    class Action(models.Model):

        TYPE_CREATED = 0
        TYPE_MODIFIED = 1
        TYPES = (
            (TYPE_CREATED, 'Created'),
            (TYPE_MODIFIED, 'Modified'),
        )

        performer = models.ForeignKey(User, related_name='+', verbose_name='Performer')
        date = models.DateTimeField(verbose_name='Date', db_index=True)
        action_type = models.IntegerField(choices=TYPES, verbose_name='Type of action')
        content_type = models.ForeignKey(ContentType, related_name='related_content', blank=True, null=True,
                                         verbose_name='Related object')
        object_id = models.PositiveIntegerField(blank=True, null=True, verbose_name='Object link')
        content_object = GenericForeignKey('content_type', 'object_id')

        class Meta:
            verbose_name = 'Action'
            verbose_name_plural = 'Actions'
            ordering = ('-date',)

        # ... skipped ...

To allow queryset filtering via 'content_object' field ``'choices' filter`` (`Choices filter`_), ``ActionGrid``
overrides ``get_allowed_filter_fields()`` method to generate ``'choices' filter`` values from contenttypes framework by
calling ``get_contenttype_filter()`` method::

    from collections import OrderedDict
    from django.utils.html import format_html
    from django_jinja_knockout.views import KoGridView
    from .models import Action

    class ActionGrid(KoGridView):

        model = Action
        grid_fields = [
            'performer',
            'date',
            'action_type',
            # Note that generic object relationship field is treated as virtual field because Django ORM does not
            # allow to perform values() method on querysets which have such fields.
            'content_object'
        ]
        allowed_sort_orders = [
            'performer',
            'date',
            'action_type',
        ]
        mark_safe_fields = [
            'content_object'
        ]
        enable_deletion = True

        def get_allowed_filter_fields(self):
            allowed_filter_fields = OrderedDict([
                ('action_type', None),
                # Get names / ids of 'content_type' choices filter.
                ('content_type', self.get_contenttype_filter(
                    ('club_app', 'club'),
                    ('club_app', 'equipment'),
                    ('club_app', 'member'),
                ))
            ])
            return allowed_filter_fields

        def get_related_fields(self, query_fields=None):
            query_fields = super().get_related_fields(query_fields)
            # Remove virtual field from queryset values().
            query_fields.remove('content_object')
            return query_fields

        def postprocess_row(self, row, obj):
            # Add virtual field value.
            content_object = obj.content_object
            row['content_object'] = content_object.get_str_fields() \
                if hasattr(content_object, 'get_str_fields') \
                else str(content_object)
            row = super().postprocess_row(row, obj)
            return row

        # Optional formatting of virtual field (not required).
        def get_row_str_fields(self, obj, row):
            str_fields = super().get_row_str_fields(obj, row)
            if str_fields is None:
                str_fields = {}
            # Add formatted display of virtual field.
            if hasattr(obj.content_object, 'get_canonical_link'):
                str_fields['content_object'] = format_html(
                    '<a href="{1}">{0}</a>',
                    *obj.content_object.get_canonical_link()
                )
            return str_fields

See `event_app.views_ajax`_ for the complete example.

Modifying visual layout of grid
-------------------------------
.. highlight:: jinja
.. _modifying_visual_layout_of_grid:

Top DOM nodes of grid component can be overriden by using Jinja2 ``{% call(kwargs) ko_grid() %}`` statement, then
implementing a caller section with custom DOM nodes. There is the example of using this approach just below.
See the source code of `ko_grid.htm`_ template for original DOM nodes of ``App.ko.Grid`` component.

It is possible to override some or all underscore.js templates of ``App.ko.Grid`` component, by passing
arguments to ``ko_grid_body()`` Jinja2 macro with keys as template names and values as custom template ids.

* Optional ``'call_ids' argument`` is used to override expanded nested templates DOM ids. It allows to call (expand)
  another underscore.js template instead of built-in one, eg. ``'member_ko_grid_filter_choices'`` instead of default
  ``'ko_grid_filter_choices'`` (see example below).
* Optional ``'template_ids' argument`` is used to override DOM ids of ``underscore.js`` templates bodies. That allows
  to generate standard built-in underscore.js template but with a different DOM id, to "copy the same template with
  different DOM id". It is required sometimes to allow both standard and visually customized grids at one web page.
* Optional ``'override_template' argument`` is used to enable Jinja2 caller section.

Here is the example of overriding visual display of ``App.ko.GridFilter`` that is used to select filter field from
the list of specified choices. Also ``ko_grid_body`` template is overriden to ``member_ko_grid_body`` template with
button inserted that has knockout.js ``"click: onChangeEndorsementButtonClick.bind($data)"`` custom binding::

    {% from 'ko_grid.htm' import ko_grid with context %}
    {% from 'ko_grid_body.htm' import ko_grid_body with context %}
    {% extends 'base.htm' %}

    {% block main %}

        {% call(kwargs) ko_grid(
            grid_options={
                'pageRoute': view.request.url_name,
            },
            template_options={
                'vscroll': True
            },
            dom_attrs={
                'id': 'member_grid'
            },
            override_template=True,
        ) %}

        <div{{ flatatt(kwargs.dom_attrs) }} data-component-options='{{ kwargs._grid_options|escapejs }}'>
        <a name="{{ kwargs.fragment_name }}"></a>
            <div data-template-id="member_ko_grid_body" data-template-args='{{ kwargs._template_options|escapejs }}'>
            </div>
        </div>

    {% endcall %}

    {% endblock main %}

    {% block bottom_scripts %}
        {# Generate standard grid templates for KoGridWidget #}
        {{ ko_grid_body() }}

        {#
            Overwrites templates for custom display of MemberGrid.
            has_full_body=True indicates that ko_grid_body() without arguments was already called, generating
            standard templates, thus only call_ids / template_ids related templates has to be re-generated.
            It will work without has_full_body=True as well, but duplicate templates with the same id / content
            would be generated in such case.
        #}
        {{
            ko_grid_body(
                call_ids={
                    'ko_grid_body': 'member_ko_grid_body',
                    'ko_grid_filter_choices': 'member_ko_grid_filter_choices',
                },
                template_ids={
                    'ko_grid_nav': 'member_ko_grid_nav'
                },
                has_full_body=True
            )
        }}

        <script type="text/template" id="member_ko_grid_body">
            <div class="panel panel-primary">
                <div data-bind="text: meta.verboseNamePlural" class="panel-heading"></div>
                <div class="panel-body">
                    <!-- ko if: meta.hasSearch() || gridFilters().length > 0 -->
                    <div data-template-id="member_ko_grid_nav"></div>
                    <!-- /ko -->
                    <div data-template-id="ko_grid_table"></div>
                    <div class="default-padding">
                        <button
                                data-bind="click: onChangeEndorsementButtonClick.bind($data)" type="button" class="btn btn-warning">
                            Change endorsement
                        </button>
                    </div>
                </div>
                <div data-template-id="ko_grid_pagination"></div>
            </div>
        </script>

        <script type="text/template" id="member_ko_grid_filter_choices">
            <li data-bind="grid_filter">
                <nav class="navbar navbar-default">
                    <div class="container-fluid">
                        <div class="navbar-header"><a class="navbar-brand" href="##" data-bind="text: name"></a></div>
                        <ul class="nav navbar-nav">
                            <!-- ko foreach: choices -->
                            <li data-bind="css: {active: is_active()}">
                                <a data-bind="css: {bold: is_active()}, text: name, grid_filter_choice, click: onLoadFilter.bind($data)" name="#"></a>
                            </li>
                            <!-- /ko -->
                        </ul>
                    </div>
                </nav>
            </li>
        </script>

        <script src="{{ static('js/front/ko-grid.js') }}"></script>
        <script src="{{ static('js/front/member-grid.js') }}"></script>
    {% endblock bottom_scripts %}

See `member_grid_tabs.htm`_, `member-grid.js`_, `club_app.views_ajax`_ for the complete example.

===================
Grid action routing
===================

.. highlight:: python

Grids support arbitrary number of built-in and custom actions besides standard CRUD. Thus grid requests do not use
HTTP method routing such as PUT DELETE, which would be too limiting approach. All of grid actions are performed as
HTTP POST; Django class-based view kwarg ``action`` value is used for routing in ``urls.py``::

    from my_app.views import Model1Grid

    # ... skipped ...

    url(r'^model1-grid(?P<action>/?\w*)/$', Model1Grid.as_view(), name='model1_grid',
        kwargs={'ajax': True, 'permission_required': 'my_app.change_model1'}),

    # ... skipped ...

Value of ``action`` kwarg is normalized (leading '/' are stripped) and is stored in ``self.current_action_name``
property of grid class instance at server-side. Key name of view kwargs dict used for grid action url name may be
changed via Django grid class static property ``action_kwarg``::

    from django_jinja_knockout.views import KoGridView
    from .models import Model1

    class Model1Grid(KoGridView):

        action_kwarg = 'action'
        model = Model1
        # ... skipped ...

Server-side action routing
--------------------------

Django class-based view derived from `views.KoGridView`_ defines the list of available actions via ``get_actions()``
method. Defined actions are implemented via grid ``action_NAME`` method, where ``NAME`` is actual name of defined
action, for example built-in action ``'list'`` is mapped to ``GridActionsMixin.action_list()`` method.

Django grid action method is called via AJAX so it is supposed to return one or more viewmodels via AJAX response, see
:doc:`viewmodels`.

It might be either one of pre-defined viewmodels, like ``{'view': 'alert'}`` (see `app.js`_ for the basic list of
viewmodels), or a grid viewmodel, which is routed to ``App.GridActions`` class (or it's child class) at client-side.
Here is the example of action implementation::

    from django_jinja_knockout.views import KoGridView
    # ... skipped ...

    class MemberGridCustomActions(KoGridView):

        # ... skipped ...
        def action_edit_note(self):
            member = self.get_object_for_action()
            note = self.request_get('note')
            modified_members = []
            if member.note != note:
                member.note = note
                member.save()
                modified_members.append(member)
            if len(modified_members) == 0:
                return vm_list({
                    'view': 'alert',
                    'title': str(member.profile),
                    'message': 'Note was not changed.'
                })
            else:
                return vm_list({
                    'view': self.__class__.viewmodel_name,
                    'update_rows': self.postprocess_qs(modified_members),
                })

`views`_ module has many built-in actions implemented, while `club_app.views_ajax`_ has some examples of custom
actions code.

Client-side action routing
--------------------------

.. highlight:: javascript

``App.GridActions`` class defined in `ko_grid.js`_ is used both to invoke grid actions and to process their results.

Invocation of action
~~~~~~~~~~~~~~~~~~~~

Actions are invoked via Javascript ``App.GridActions.perform()`` method::

    GridActions.perform = function(action, actionOptions, ajaxCallback)

* ``'action' argument``: mandatory name of action as it is returned by Django grid ``get_actions()`` method;
* ``'actionOptions' argument``: optional, custom parameters of action (usually Javascript object). These are passed to
  AJAX query request data.
  To add queryargs to some action, implement ``queryargs_NAME`` method, where ``NAME`` is actual name of action.
* ``'ajaxCallback' argument``: optional function closure that will be executed when action is complete;

Interactive actions (action types ``'button'`` / ``'glyphicon'``) are also represented by instances of ``App.ko.Action``
Javascript class, which is used to setup CSS classes of bound DOM element button or glyphicon in `ko_grid_body.htm`_.

When bound DOM element is clicked, these interactive actions invoke ``App.ko.Action.doAction()`` method for particular
visual action Knockout.js viewmodel, which calls chain of ``App.ko.Grid`` / ``App.GridActions`` methods, finally issuing
the same ``App.GridActions.perform()`` method::

    Action.doAction = function(options, actionOptions)

* ``'options' argument`` of object type may pass key ``'gridRow'`` which value is the instance of ``App.ko.GridRow``
  class that will be used as interactive action target row. It is used by interactive actions that are related to
  specified grid row, such as `'edit_form' action`_. Target row instance of ``App.ko.GridRow`` will be stored in
  ``App.ko.Grid`` instance ``lastClickedKoRow`` property, accessible in ``App.GridActions`` derived instance
  ``this.grid.lastClickedKoRow`` property in every ``perform_NAME`` method, eg.::

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

* ``'actionOptions' argument`: optional Javascript object that is passed to ``App.GridActions.perform()`` as
  ``actionOptions`` argument, usually to extend queryargs of action AJAX POST request, but might be used to pass custom
  data to client-side actions as well.

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
and ``'list_filter'`` entries are set by ``App.GridActions.queryargs_list()`` method. It's easier and more convenient to
implement ``queryargs_NAME`` method for that purpose.

.. highlight:: text

For the reverse url of ``Model1Grid`` class-based view action ``'list'``::

    http://127.0.0.1:8000/model1-grid/list/

it will generate AJAX request queryargs similar to these::

    page: 2
    row_model_str: false
    list_search: test
    list_filter: {"role": 2}
    csrfmiddlewaretoken: JqkaCTUzwpl7katgKiKnYCjcMpNYfjQc

which will be parsed by ``KoGridView`` derived instance ``action_list()`` method.

.. highlight:: javascript

it is also possivble to execute actions interactively with custom options (queryargs)::

    Model1Grid.onFirstLoad = function() {
        var myAction = this.getKoAction('my_custom_action');
        var targetKoRow = this.findKoRowByPkVal(10);
        myAction.doAction({gridRow: targetKoRow}, {'ko_prop_name': ko_prop_value});
    };

When action is a purely client-side one implemented via ``App.GridActions`` derived instance ``perform_NAME()`` method,
queryArgs may be used as client-side options, for example to pass initial values of Knockout.js custom template
viewmodel properties, hence these are called ``options``, not ``queryArgs`` in ``queryargs_NAME`` method.

Action AJAX response handler
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

To process AJAX response data returned from Django grid ``action_NAME()`` method, one has to implement
``App.GridActions`` derived class, where ``callback_NAME()`` method will be used to update client-side of grid.
For example, AJAX ``ModelForm``, generated by standard `'create_form' action`_  is displayed with::

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

See standard ``callback_*()`` methods in `ko_grid.js`_ ``App.GridActions`` class code and custom ``callback_*()``
methods in `member-grid.js`_ for more examples.

Client-side actions
~~~~~~~~~~~~~~~~~~~

.. highlight:: javascript

It is also possible to perform actions partially or entirely at client-side. To implement this, one should define
``perform_NAME()`` method of ``App.ko.GridActions`` derived class. It's used to display client-side BootstrapDialogs via
``App.ActionTemplateDialog`` -derived instances with underscore.js / knockout.js templates bound to current
``App.ko.Grid`` derived instance::

    App.MemberGridActions = function(options) {
        $.inherit(App.GridActions.prototype, this);
        this.init(options);
    };

    (function(MemberGridActions) {

        // Client-side invocation of the action.
        MemberGridActions.perform_edit_note = function(queryArgs, ajaxCallback) {
            var actionDialog = new App.ActionTemplateDialog({
                template: 'member_note_form',
                grid: this.grid,
                meta: {
                    noteLabel: 'Member note',
                    note: this.grid.lastClickedKoRow.getValue('note')
                },
            });
            actionDialog.show();
        };

        MemberGridActions.callback_edit_note = function(viewModel) {
            this.grid.updatePage(viewModel);
        };

    })(App.MemberGridActions.prototype);

    App.ko.MemberGrid = function(options) {
        $.inherit(App.ko.Grid.prototype, this);
        this.init(options);
    };

    (function(MemberGrid) {

        MemberGrid.iocGridActions = function(options) {
            return new App.MemberGridActions(options);
        };

    })(App.ko.MemberGrid.prototype);

.. highlight:: jinja

Where the ``'member_note_form'`` template could be like this, based on ``ko_action_form`` template located in
`ko_grid_body.htm`_::

    <script type="text/template" id="member_note_form">
        <div class="panel panel-default">
            <div class="panel-body">
                <form class="ajax-form" enctype="multipart/form-data" method="post" role="form" data-bind="attr: {'data-url': gridActions.getLastActionUrl()}">
                    <input type="hidden" name="csrfmiddlewaretoken" data-bind="value: getCsrfToken()">
                    <input type="hidden" name="pk_val" data-bind="value: getLastPkVal()">
                    <div class="row form-group">
                        <label data-bind="text: meta.noteLabel" class="control-label col-md-4" for="id_note"></label>
                        <div class="field col-md-6">
                            <textarea data-bind="textInput: meta.note" id="id_note" class="form-control autogrow" name="note" type="text"></textarea>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </script>

which may include any custom Knockout.js properties / observables bound to current grid instance. That allows to prodice
interactive client-side forms without extra AJAX requests.

See `club_app.views_ajax`_, `member_grid_custom_actions.htm`_ and `member-grid.js`_ for full example of 'edit_note' action
implementation.

Custom view kwargs
------------------
.. highlight:: python

In some cases a grid may require additional kwargs to alter base queryset of grid. For example, if Django app
has ``Member`` model related as many to one to ``Club`` model, grid that displays members of specified club id
(foreign key value) requires additional ``club_id`` view kwarg in ``urls.py``::

    # ... skipped ...
    url(r'^club-member-grid-(?P<club_id>\w*)(?P<action>/?\w*)/$', ClubMemberGrid.as_view(), name='club_member_grid',
        kwargs={'ajax': True, 'permission_required': 'my_app.change_member'}),
    # ... skipped ...

Then, grid class may filter base queryset according to received ``club_id`` view kwargs value::

    class ClubMemberGrid(KoGridView):

        model = Member
        # ... skipped ...
        def get_base_queryset(self):
            return super().get_base_queryset().filter(club_id=self.kwargs['club_id'])

.. highlight:: jinja

Jinja2 template should contain component generation like this (do not forget to pass ``club_id`` when rendering the
template)::

    {{ ko_grid(
        grid_options={
            'pageRoute': 'club_member_grid',
            'pageRouteKwargs': {'club_id': club_id},
        },
        dom_attrs={
            'id': 'club_member_grid'
        }
    ) }}

This way grid will have custom list of club members according to ``club_id`` view kwarg value.

.. highlight:: python

Because foreign key widgets also utilize ``KoGridView`` and ``App.ko.Grid`` classes, base querysets of foreign key
widgets may be filtered via supplying ``['pageRouteKwargs']`` ``['fkGridOptions']`` key value of the default grid
options dict::

    class Model1Grid(KoGridView):

        allowed_filter_fields = OrderedDict([
            # Autodetect filter type.
            ('field_1', None),
            ('model2_fk', None),
        ])

        @classmethod
        def get_default_grid_options(cls):
            return {
                # 'classPath': 'App.ko.Model1Grid',
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
one / few columns of grid. Actions can be interactive (represented as UI elements) and non-interactive.
Actions can be executed as one or multiple AJAX requests or be partially / purely client-side.

``views.GridActionsMixin`` class ``get_actions()`` method returns dict defining built-in actions available.
Top level of that dict is ``action type``.

Let's see which action types are available and their associated actions.

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
* field filters which will be displayed in top navigation bar of grid client-side component via ``'ko_grid_nav'``
  underscore.js template, see `Filter fields`_;

Custom Django grid class-based views derived from ``KoGridView`` may return more meta properties for custom
client-side templates. These will be updated "on the fly" automatically with standard client-side
``App.GridActions`` class ``callback_meta()`` method.

.. highlight:: javascript

Custom actions also can update grid meta by calling client-side ``App.ko.Grid`` class ``updateMeta()`` method directly::

    Model1GridActions.callback_approve_user = function(viewModel) {
        this.grid.updateMeta(viewModel.meta);
        // Do something more...
    };

See `Action AJAX response handler`_ how meta is updated in client-side AJAX callback.

See `Modifying visual layout of grid`_ how to override client-side underscore.js / Knockout.js templates.

'list' action
~~~~~~~~~~~~~

Returns AJAX response data with the list of currently paginated grid rows, both "raw" database field values list and
their optional ``str_fields`` formatted list counterparts. While some grids may do not use ``str_fields`` at all,
complex formatting of local date / time / financial currency Django model field values requires ``str_fields`` to be
generated at server-side.

``str_fields`` also are used for nested representation of fields (displaying foreign related models as the list of it's
fields in one grid cell).

``str_fields`` are populated at server-side for each grid row via ``views.KoGridView`` class .get_row_str_fields()``
method and converted to client-side ``display values`` in ``App.ko.GridRow`` class ``toDisplayValue()`` method.

Both methods can be customized by overriding these in ancestor classes. When associated Django model has
``get_str_fields()`` method defined, it will be used to get ``str_fields`` for each row.

See also get_str_fields_.

'meta_list' action
~~~~~~~~~~~~~~~~~~

By default ``meta`` action is not performed in separate AJAX query, rather it's combined with ``list`` action into one
AJAX request via ``meta_list`` action. Such way it saves HTTP traffic and reduces server load. However, in some cases,
grid filters or sorting orders has to be set up with specific choices before ``'list'`` action is performed.
That is required to load grid with initially selected field filter choices or to change default sorting.

'meta_list' action and custom initial field filters
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. highlight:: python

If Django grid class specifies the list of initially selected field filter choices as ``active_choices``::

    class MemberGridTabs(MemberGrid):

        template_name = 'member_grid_tabs.htm'

        allowed_filter_fields = OrderedDict([
            ('profile', None),
            ('last_visit', None),
            # Next choices of 'plays' field filter will be set when grid loads.
            ('plays', {'active_choices': [Member.SPORT_BADMINTON, Member.SPORT_SQUASH]}),
            ('role', None),
            ('is_endorsed', None),
        ])

.. highlight:: jinja

To make sure ``ClubMemberGrid`` action ``'list'`` respects ``allowed_filter_fields`` definition of
``['plays']['active_choices']`` default choices values, one has to turn on client-side ``App.ko.Grid`` class
``options.separateMeta`` value to ``true`` either with ``ko_grid()`` Jinja2 macro grid_options::

    {{ ko_grid(
        grid_options={
            'pageRoute': 'club_member_grid',
            'separateMeta': True,
        },
        dom_attrs={
            'id': 'club_member_grid'
        }
    ) }}

.. highlight:: python

or by overriding of Django grid ``get_default_grid_options()``::

    class ClubMemberGrid(KoGridView):

        model = ClubMember
        # ... skipped ...

        @classmethod
        def get_default_grid_options(cls):
            return {
                'classPath': 'App.ko.ClubMemberGrid',
                'separateMeta': True,
            }

.. highlight:: javascript

or via overloading of client-side ``App.ko.Grid`` by custom class::

    App.ko.ClubMemberGrid = function(options) {
        $.inherit(App.ko.Grid.prototype, this);
        /**
         * This grid has selected choices for query filter 'plays' by default,
         * thus requires separate 'list' action after 'meta' action,
         * instead of joint 'meta_list' action.
         */
        options.separateMeta = true;
        this.init(options);
    };

When ``options.separateMeta`` is ``true``, ``meta`` action will be issued first, setting ``'plays'`` filter selected
choices, then ``'list'`` action will be performed separately, respecting these filter choices.

Otherwise, grid ``plays`` filter will be visually highlighed as selected, but the first (initial) ``list`` action will
return unfiltered rows.

'meta_list' action and custom initial ordering
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

When one supplies custom initial ordering of rows that does not match default Django model ordering::

    {{ ko_grid(
        grid_options={
            'pageRoute': 'club_grid_with_action_logging',
            'defaultOrderBy': {'foundation_date': '-'},
        },
        dom_attrs={
            'id': 'club_grid'
        }
    ) }}

``App.ko.Grid`` ``options.separateMeta`` will be enabled automatically and does not require to be explicitely passed in.

See `club_app.views_ajax`_, `club_grid_with_action_logging.htm`_ for fully featured example.

'update' action
~~~~~~~~~~~~~~~
This action is not called directly internally but is implemented for user convenience. It performs the same ORM query as
`'list' action`_, but instead of removing all existing rows and replacing them with new ones, it compares old rows
and new rows, deletes non-existing rows, keeps unchanged rows intact, adding new rows while highlighting them.

This action is useful to update related grid after current grid performed some actions that changed related models of
related grid.

.. highlight:: javascript

Open `club-grid.js`_ to see the example of manually executing ``ActionGrid`` `'update' action`_ on the completion of
``ClubGrid`` `'save_inline' action`_ and `'delete_confirmed' action`_::

    (function(ClubGridActions) {

        ClubGridActions.updateActionGrid = function() {
            // Get instance of ActionGrid.
            var actionGrid = $('#action_grid').component();
            if (actionGrid !== null) {
                // Update ActionGrid.
                actionGrid.gridActions.perform('update');
            }
        };

        ClubGridActions.callback_save_inline = function(viewModel) {
            this._super._call('callback_save_inline', viewModel);
            this.updateActionGrid();
        };

        ClubGridActions.callback_delete_confirmed = function(viewModel) {
            this._super._call('callback_delete_confirmed', viewModel);
            this.updateActionGrid();
        };

    })(App.ClubGridActions.prototype);


'save_form' action
~~~~~~~~~~~~~~~~~~

.. highlight:: python

Performs validation of AJAX submitted form previously created via `'create_form' action`_ / `'edit_form' action`_,
which will either create new grid row or edit an existing grid row.

Each grid row represents an instance of associated Django model. Form rows are bound to specified Django ``ModelForm``
automatically, one has to set value of grid class ``form`` static property::

    from django_jinja_knockout.views import KoGridView
    from .models import Model1
    from .forms import Model1Form

    class Model1Grid(KoGridView):

        model = Model1
        form = Model1Form
        # ... skipped ...

Alternatively, one may define factory methods, which would bind different Django ``ModelForm`` classes to
`'create_form' action`_ and `'edit_form' action`_. That allows to have different set of bound model fields when creating
and editing grid row Django models::

    from django_jinja_knockout.views import KoGridView
    from .models import Model1
    from .forms import Model1CreateForm, Model1EditForm

    class Model1Grid(KoGridView):

        model = Model1

        def get_create_form(self):
            return Model1CreateForm

        def get_edit_form(self):
            return Model1EditForm

``'save_form'`` action will:

* Display AJAX form errors in case there are ``ModelForm`` validation errors.
* Create new model instance / add new row to grid when invoked via `'create_form' action`_.
* Update existing model instance / grid row, when invoked via `'edit_form' action`_.

App.ko.Grid.updatePage() method
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

To automatize grid update for AJAX submitted action, the following optional JSON properties could be set in AJAX
viewmodel response:

* ``'append_rows'``: list of rows which should be appended to current grid page to the bottom;
* ``'prepend_rows'``: list of rows which should be prepended to current grid page from the top;
* ``'update_rows'``: list of rows that are updated, so their display needs to be refreshed;
* ``'deleted_pks'``: list of primary key values of Django models that were deleted in the database thus their rows have
  to be visually removed from current grid page;

.. highlight:: javascript

Standard grid action handlers (as well as custom action handlers) may return AJAX viewmodel responses with these JSON
keys to client-side action viewmodel response handler, issuing multiple CRUD operations at once. For example
``App.GridActions`` class ``callback_save_form()`` method::

    GridActions.callback_save_form = function(viewModel) {
        this.grid.updatePage(viewModel);
    };

See also `views.GridActionsMixin`_ class ``action_delete_confirmed()`` / ``action_save_form()`` methods for server-side
part example.

Client-side part of multiple CRUD operation is implemented in `ko_grid.js`_ ``App.ko.Grid`` class ``updatePage()``
method.

'save_inline' action
~~~~~~~~~~~~~~~~~~~~
.. highlight:: python

Similar to `'save_form' action`_ described above, this action is an AJAX form submit handler for `'create_inline' action`_
/ `'edit_inline' action`_. These actions generate BootstrapDialog with ``FormWithInlineFormsets`` AJAX submittable form
instance bound to current grid row via `views.KoGridView`_ class ``form_with_inline_formsets`` static property::

    from django_jinja_knockout.views import KoGridView
    from .models import Model1
    from .forms import Model1FormWithInlineFormsets

    class Model1Grid(KoGridView):

        model = Model1
        form_with_inline_formsets = Model1FormWithInlineFormsets
        # ... skipped ...

Alternatively, one may define factory methods, which allows to bind different ``FormWithInlineFormsets`` classes to
`'create_inline' action`_ / `'edit_inline' action`_ target grid row (Django model)::

    from django_jinja_knockout.views import KoGridView
    from .models import Model1
    from .forms import Model1CreateFormWithInlineFormsets, Model1EditFormWithInlineFormsets

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

    class MemberGridTabs(MemberGrid):

        template_name = 'member_grid_tabs.htm'
        enable_deletion = True

        allowed_filter_fields = OrderedDict([
            ('profile', None),
            ('last_visit', None),
            # Next choices of 'plays' field filter will be set when grid loads.
            ('plays', {'active_choices': [Member.SPORT_BADMINTON, Member.SPORT_SQUASH]}),
            ('role', None),
            ('is_endorsed', None),
        ])

        # Do not allow to delete Member instances with role=Member.ROLE_FOUNDER:
        def action_delete_is_allowed(self, objects):
            # ._clone() is required because original pagination queryset is passed as objects argument.
            qs = objects._clone()
            return not qs.filter(role=Member.ROLE_FOUNDER).exists()

See `club_app.views_ajax`_ for full-featured example.

Action type 'button'
--------------------

These actions are visually displayed as buttons and manually invoked via button click. With default underscore.js
templates these buttons will be located at top navbar of the grid. Usually type ``'button'`` actions are not targeted to
existing grid rows but are supposed either to create new rows or to process the whole queryset / list of rows.

However, when ``App.ko.Grid`` -derived class instance has visible row selection enabled via ``init()`` method
``options.showSelection`` = ``true`` and / or ``options.selectMultipleRows`` = ``true``, the button action could be
applied to the selected row(s) as well.

New actions of ``button`` type may be added by overriding ``get_actions`` method of `views.KoGridView`_ derived class
and extending client-side ``App.GridActions`` class to implement custom ``'callback_'`` method (see
`Client-side actions`_ for more info).

'create_form' action
~~~~~~~~~~~~~~~~~~~~
Server-side part of this action renders AJAX-powered Django ``ModelForm`` instance bound to new Django grid model.

Client-side part of this action displays rendered ``ModelForm`` as ``BootstrapDialog`` modal dialog. Together with
`'save_form' action`_, which serves as callback for this action, it allows to create new grid rows (new Django model
instances).

This action is enabled (and thus UI button will be displayed in grid component navbar) when Django grid class-based view
has assigned ``ModelForm`` class specified as::

    from django_jinja_knockout.views import KoGridView
    from .models import Model1
    from .forms import Model1Form

    class Model1Grid(KoGridView):

        model = Model1
        form = Model1Form
        # ... skipped ...

Alternatively, one may define factory methods, which would bind different Django ``ModelForm`` classes to
`'create_form' action`_ and `'edit_form' action`_. That allows to have different set of bound model fields when creating
and editing grid row Django models::

    from django_jinja_knockout.views import KoGridView
    from .models import Model1
    from .forms import Model1CreateForm, Model1EditForm

    class Model1Grid(KoGridView):

        model = Model1

        def get_create_form(self):
            return Model1CreateForm

        def get_edit_form(self):
            return Model1EditForm

When one would look at server-side part of ``views.GridActionsMixin`` class ``action_create_form()`` method source code,
there is ``'last_action'`` viewmodel key with value ``'save_form'`` returned to Javascript client-side::

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

Viewmodel's ``'last_action'`` key is used in client-side Javascript ``App.GridActions`` class ``respond()`` method to
override the name of last executed action from current ``'create_form'`` to ``'save_form'``.

It is then used in client-side Javascript ``App.ModelFormDialog`` class ``getButtons()`` method ``submit`` button event
handler to perform `'save_form' action`_ when that button is clicked by end-user, instead of already executed
`'create_form' action`_, which already generated AJAX model form and displayed it using ``App.ModelFormDialog`` instance.

'create_inline' action
~~~~~~~~~~~~~~~~~~~~~~
Server-side part of this action renders AJAX-powered `forms.FormWithInlineFormsets`_ instance bound to new Django grid
model.

Client-side part of this action displays rendered ``FormWithInlineFormsets`` as ``BootstrapDialog`` modal.
Together with `'save_inline' action`_, which serves as callback for this action, it allows to create new grid rows (new
Django model instances) while also adding one to many related models instances via one or multiple inline formsets.

This action is enabled (and thus UI button will be displayed in grid component navbar) when Django grid class-based view
has assigned `forms.FormWithInlineFormsets`_ derived class (see :doc:`forms` for more info about that class). It should
be specified as::

    from django_jinja_knockout.views import KoGridView
    from .models import Model1
    from .forms import Model1FormWithInlineFormsets

    class Model1Grid(KoGridView):

        model = Model1
        form_with_inline_formsets = Model1FormWithInlineFormsets
        # ... skipped ...

Alternatively, one may define factory methods, which allows to bind different ``FormWithInlineFormsets`` derived classes
to `'create_inline' action`_ new row and `'edit_inline' action`_ existing grid row (Django model)::

    from django_jinja_knockout.views import KoGridView
    from .models import Model1
    from .forms import Model1CreateFormWithInlineFormsets, Model1EditFormWithInlineFormsets

    class Model1Grid(KoGridView):

        model = Model1

        def get_create_form_with_inline_formsets(self):
            return Model1CreateFormWithInlineFormsets

        def get_edit_form_with_inline_formsets(self):
            return Model1EditFormWithInlineFormsets

* Server-side part of this action overrides the name of last execuded action by setting AJAX response viewmodel
  ``last_action`` key to ``save_inline`` value, which specifies the action of BoostrapDialog form modal button.
  See `'create_form' action`_ description for more info about ``last_action`` key.
* `views.KoGridInline`_ class is the same `views.KoGridView`_ class only using different value of ``template_name``
  class property poitning to Jinja2 template which includes `formsets.js`_ by default.
* See `club_app.views_ajax`_ for fullly featured example of ``KoGridView`` ``form_with_inline_formsets`` usage.

Action type 'click'
-------------------
These actions are designed to process already displayed grid row, associated to existing Django model.

* By default there is no active click actions, so clicking grid row does nothing.
* When there is only one click action enabled, it will be executed immediately after end-user clicking of target row.
* When there is more than one click actions enabled, ``App.ko.Grid`` will use special version of BootstrapDialog
  wrapper ``App.ActionsMenuDialog`` to display menu with clickable buttons to select one action from the list of
  available ones.

'edit_form' action
~~~~~~~~~~~~~~~~~~
This action is enabled when current Django grid class inherited from `views.KoGridView`_ class has class property
``form`` set to specified Django ``ModelForm`` class used to edit grid row via associated Django model::

    from django_jinja_knockout.views import KoGridView
    from .models import Model1
    from .forms import Model1Form

    class Model1Grid(KoGridView):

        model = Model1
        form = Model1Form

Alternatively, one may define ``get_edit_form()`` Django grid method to return ``ModelForm`` class dynamically.

Server-side of this action is implemented via `views.GridActionsMixin`_ class ``action_edit_form()`` method.
It returns AJAX response with generated HTML of ``ModelForm`` instance bound to target grid row Django model instance.
Returned viewmodel ``last_action`` property value is set to ``'save_form'``, to override ``App.GridActions`` class
``lastActionName`` property.

Client-side of this action uses ``App.ModelFormDialog`` to display generated ``ModelForm`` html and to submit AJAX form
to `'save_form' action`_.

'edit_inline' action
~~~~~~~~~~~~~~~~~~~~
This action is enabled when current Django grid class has defined class property ``form_with_inline_formsets`` set to
`forms.FormWithInlineFormsets`_ derived class used to edit grid row and it's foreign relationships via Django inline
formsets (see :doc:`forms`)::

    from django_jinja_knockout.views import KoGridView
    from .models import Model1
    from .forms import Model1FormWithInlineFormsets

    class Model1Grid(KoGridView):

        model = Model1
        form_with_inline_formsets = Model1FormWithInlineFormsets

Alternatively, one may define ``get_edit_form_with_inline_formsets()`` Django grid method to return
``FormWithInlineFormsets`` derived class dynamically.

Server-side of this action is implemented in `views.GridActionsMixin`_ class ``action_edit_inline()`` method.
It returns AJAX response with generated HTML of ``FormWithInlineFormsets`` instance bound to target grid row Django
model instance. Returned viewmodel ``last_action`` property value is set to ``'save_inline'``, to override
``App.GridActions`` class ``lastActionName`` property.

Client-side of this action uses ``App.ModelFormDialog`` to display generated ``FormWithInlineFormsets`` html and to
submit AJAX form to `'save_inline' action`_.

See `Implementing custom grid row actions`_ section how to implement custom actions of ``'click'`` and ``'glyphicon'``
types.

Action type 'glyphicon'
-----------------------
These actions are designed to process already displayed grid row, associated to existing Django model. Their
implementation is very similar to `Action type 'button'`_, but instead of clicking at any place of row, these actions
are visually displayed as bootstrap glyphicon links in separate columns of grid.

By default there is no ``glyphicon`` type actions enabled. But there is one standard action of such type implemented
in ``KoGridView``, `'delete' action`_.

'delete' action
~~~~~~~~~~~~~~~
This action deletes grid row (Django model instance) but is disabled by default. To enable grid row deletion, one has to
set Django grid class property ``enable_deletion`` value to ``True``::

    from django_jinja_knockout.views import KoGridView
    from .models import Manufacturer
    from .forms import ManufacturerForm

    class ManufacturerGrid(KoGridView):

        model = Manufacturer
        form = ManufacturerForm
        enable_deletion = True
        grid_fields = '__all__'
        allowed_sort_orders = '__all__'
        allowed_filter_fields = OrderedDict([
            ('direct_shipping', None)
        ])
        search_fields = [
            ('company_name', 'icontains'),
        ]

This grid also specifies ``form`` class property, which enables all CRUD operations with ``Manufacturer`` Django model.

Note that `'delete_confirmed' action`_ is used as success callback for `'delete' action`_ and usually both are enabled
or disabled per grid class - if one considers to check the user permissions::

    from django_jinja_knockout.views import KoGridView
    from .models import Manufacturer
    from .forms import ManufacturerForm

    class ManufacturerGrid(KoGridView):

        model = Manufacturer
        form = ManufacturerForm

        def get_actions(self):
            enable_deletion = self.request.user.has_perm('club_app.delete_manufacturer')
            actions = super().get_actions()
            actions['glyphicon']['delete']['enabled'] = enable_deletion
            actions['built_in']['delete_confirmed']['enabled'] = enable_deletion
            return actions

`views.KoGridView`_ has built-in support of deletion permission checking for selected rows lists / querysets.
See `'delete_confirmed' action`_ for the primer of checking delete permissions per row / queryset.

The action itself is defined in ``django_jinja_knockout.views`` module ``GridActionsMixin`` class::

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

.. highlight:: python

Imagine one grid having custom glyphicon action defined like this::

    class MemberGrid(KoGridView):
        model = Member
        form = MemberFormForGrid

        def get_actions(self):
            actions = super().get_actions()
            actions['glyphicon']['quick_endorse'] = {
                'localName': _('Quick endorsement'),
                'class': 'glyphicon-cloud-upload',
                'enabled': True
            }
            return actions


Grid rows may selectively enable / disable their actions on the fly with visual updates. It is especially important to
actions of type ``'glyphicon'``, because these are always visible in grid columns.

.. highlight:: javascript

To implement online visibility update of grid row actions one should override client-side ``App.ko.GridRow`` class
``hasEnabledAction()`` method like this::

    App.ko.MemberGridRow = function(options) {
        $.inherit(App.ko.GridRow.prototype, this);
        this.init(options);
    };

    (function(MemberGridRow) {

        // .. skipped ...

        MemberGridRow.hasEnabledAction = function(action) {
            if (action.name === 'quick_endorse' && this.values['is_endorsed'] === true) {
                return false;
            }
            return true;
        };

    })(App.ko.MemberGridRow.prototype);

    App.ko.MemberGrid = function(options) {
        $.inherit(App.ko.Grid.prototype, this);
        this.init(options);
    };

    (function(MemberGrid) {

        // .. skipped ...

        MemberGrid.iocRow = function(options) {
            return new App.ko.MemberGridRow(options);
        };

    })(App.ko.MemberGrid.prototype);

This way action of ``glyphicon`` type with ``'quick_endorse'`` name will be displayed as link only when associated
Django model instance field name ``is_endorsed`` has value ``true``. Otherwise the link to action will be hidden.
Updating grid rows via ``App.ko.Grid`` class ``updatePage()`` method will cause visual re-draw of available grid rows
actions display.

In case action is not purely client-side (has ``callback_NAME``), additional permission check should also be performed
with server-side Django grid ``action_NAME`` method.

* See `'save_form' action`_ and `App.ko.Grid.updatePage() method`_ how to use ``updatePage()`` in your grids.
* See `Action AJAX response handler`_ for explanation of server-side actions vs pure client-side actions.
* See fully-featured example in `member-grid.js`_ / `club_app.views_ajax`_.

Implementing custom grid row actions
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
.. highlight:: python

First step to add new action is to override ``get_actions()`` method in Django grid class. Let's create new action
``'ask_user'`` of ``'click'`` type::

    from django_jinja_knockout.views import KoGridView
    from .models import Profile
    from django.utils.translation import ugettext as _

    class ProfileGrid(KoGridView):

        model = Profile
        # ... skipped ...

        def get_actions(self):
            actions = super().get_actions()
            action_type = 'click'
            actions[action_type]['ask_user'] = {
                'localName': _('Ask user'),
                'class': 'btn-warning',
                'enabled': True
            }
            return actions

To create new action ``'ask_user'`` of ``'glyphicon'`` type instead::

    from django_jinja_knockout.views import KoGridView
    from .models import Profile
    from django.utils.translation import ugettext as _

    class ProfileGrid(KoGridView):

        model = Profile
        # ... skipped ...

        def get_actions(self):
            actions = super().get_actions()
            action_type = 'glyphicon'
            actions[action_type]['ask_user'] = {
                'localName': _('Ask user'),
                'class': 'glyphicon-user',
                'enabled': True
            }
            return actions

Next step is to implement newly defined action server-side and / or it's client-side parts.

If one wants to bind multiple different Django ``ModelForm`` edit actions to grid, the server-side of the custom action
might be implemented like this::

    from django_jinja_knockout.views import KoGridView
    from .models import Profile
    from .forms import ProfileForm, ProfileAskUserForm

    class ProfileGrid(KoGridView):

        model = Profile
        # This form will be used for actions 'create_form' / 'edit_form' / 'save_form'.
        form = ProfileForm
        # ... skipped ...

        # Based on GridActionsMixin.action_edit_form() implementation.
        def action_ask_user(self):
            # Works with single row, thus we are getting single model instance.
            obj = self.get_object_for_action()
            # This form will be used for actions 'ask_user' / 'save_form'.
            form = ProfileAskUserForm(instance=obj)
            return self.vm_form(
                form, self.render_object_desc(obj), {'pk_val': obj.pk}
            )

* Actions which work with single objects (single row) should use ``get_object_for_action()`` method to obtain Django
  model object instance of target grid row.
* Actions which work with lists / querysets of objects (multiple rows) should use ``get_queryset_for_action()`` method
  to obtain the whole queryset of selected grid rows. See ``action_delete()`` / ``action_delete_confirmed()`` methods
  code in `views.GridActionsMixin`_ class for example.

.. highlight:: javascript

``App.ModelFormDialog`` class will be used to render AJAX-generated Django ``ModelForm`` at client-side. One has to
inherit ``App.ProfileGridActions`` from ``App.GridActions`` and define custom action's own ``callback_NAME``::

    ProfileGridActions.callback_ask_user = function(viewModel) {
        viewModel.grid = this.grid;
        var dialog = new App.ModelFormDialog(viewModel);
        dialog.show();
    };

* see `Action AJAX response handler`_ for more info on action client-side AJAX callbacks.

Completely different way of generating form with pure client-side underscore.js / Knockout.js templates for custom
action (no AJAX callback is required to generate form HTML) is implemented in `Client-side actions`_ section of the
documentation.

====================
ForeignKeyGridWidget
====================
`widgets.ForeignKeyGridWidget`_ is similar to ``ForeignKeyRawIdWidget`` implemented in `django.contrib.admin.widgets`_,
but is easier to integrate into non-admin views. It provides built-in sorting / filters and even optional related model
CRUD actions because it is based on the code of `views.KoGridView`_ and `ko_grid.js`_.

.. highlight:: python

Let's imagine we have two Django models with one to many relationships::

    from django.db import models

    class Profile(models.Model):
        first_name = models.CharField(max_length=30, verbose_name='First name')
        last_name = models.CharField(max_length=30, verbose_name='Last name')
        birth_date = models.DateField(db_index=True, verbose_name='Birth date')
        # ... skipped ...

    class Member(models.Model):
        profile = models.ForeignKey(Profile, verbose_name='Sportsman')
        # ... skipped ...

* See `club_app.models`_ for complete definitions of models.

Now we will define ``MemberForm`` bound to ``Member`` model::

    from django import forms
    from django_jinja_knockout.widgets import ForeignKeyGridWidget
    from django_jinja_knockout.forms BootstrapModelForm
    from .models import Member

    class MemberForm(BootstrapModelForm):

        class Meta:
            model = Member
            fields = '__all__'
            widgets = {
                'profile': ForeignKeyGridWidget(model=Profile, grid_options={
                    'pageRoute': 'profile_fk_widget_grid',
                    'dialogOptions': {'size': 'size-wide'},
                    # Could have nested foreign key filter options defined, if required:
                    # 'fkGridOptions': {
                    #    'user': {
                    #        'pageRoute': 'user_grid'
                    #    }
                    # },
                    # Override default search field label (optional):
                    'searchPlaceholder': 'Search user profiles'
                }),
                'plays': forms.RadioSelect(),
                'role': forms.RadioSelect()
            }

Any valid ``App.ko.Grid`` constructor option can be specified as ``grid_options`` argument of ``ForeignKeyGridWidget``,
including nested foreign key widgets and filters (see commented ``fkGridOptions`` section).

* See `club_app.forms`_ for complete definitions of forms.

To bind ``MemberForm`` ``profile`` field widget to actual ``Profile`` model grid, we have specified class-based view url
name (route) of our widget as ``'pageRoute'`` argument value ``'profile_fk_widget_grid'``.

Now we have to implement that class-based grid view just once for any possible ModelForm with ``'profile'`` foreign
field::

    from django_jinja_knockout import KoGridWidget
    from .models import Profile

    class ProfileFkWidgetGrid(KoGridWidget):

        model = Profile
        grid_fields = ['first_name', 'last_name']
        allowed_sort_orders = '__all__'
        search_fields = [
            ('first_name', 'icontains'),
            ('last_name', 'icontains'),
        ]

or, even our ``Profile`` foreign key widget can support in-place CRUD AJAX actions, allowing to create new Profiles on
the fly before ``MemberForm`` is saved::

    from django_jinja_knockout import KoGridWidget
    from .models import Profile
    from .forms import ProfileForm

    class ProfileFkWidgetGrid(KoGridWidget):

        model = Profile
        form = ProfileForm
        enable_deletion = True
        grid_fields = ['first_name', 'last_name']
        allowed_sort_orders = '__all__'
        search_fields = [
            ('first_name', 'icontains'),
            ('last_name', 'icontains'),
        ]

and finally to define ``'profile_fk_widget_grid'`` url name in ``urls.py``::

    from club_app.views_ajax import ProfileFkWidgetGrid
    # ... skipped ...

    url(r'^profile-fk-widget-grid(?P<action>/?\w*)/$', ProfileFkWidgetGrid.as_view(),
        name='profile_fk_widget_grid',
        # kwargs={'ajax': True, 'permission_required': 'club_app.change_profile'}),
        kwargs={'ajax': True}),

Typical usage of ModelForm such as ``MemberForm`` is to use it in views (or grids) to perform CRUD actions with Django
model instances. In such case do not forget to inject url name of ``'profile_fk_widget_grid'`` to client-side for AJAX
requests to work automatically.

In your class-based view that handlers ``MemberForm`` inject ``'profile_fk_widget_grid'`` url name (route) at client-side
(see :doc:`installation` and :doc:`viewmodels` for details about injecting url names to client-side via
``client_routes``)::

    from django.views.generic.edit import CreateView
    from .forms import MemberForm

    class MemberCreate(CreateView):
        # Next line is required for ``ProfileFkWidgetGrid`` to be callable from client-side:
        client_routes = [
            'profile_fk_widget_grid'
        ]
        form = MemberForm

* See `club_app.views_ajax`_ and `urls.py`_ code for fully featured example.

Of course the same widget can be used in ``MemberForm`` bound to grids via `'create_form' action`_ /
`'edit_form' action`_ and any custom action, both with AJAX requests and traditional requests.

When widget is used in many different views, it could be more convenient to register client-side route (url name)
globally in project's ``context_processors.py``, although such client-side routes will be injected into every generated
page via `base_bottom_scripts.htm`_ by default::

    from django_jinja_knockout.context_processors import TemplateContextProcessor as BaseContextProcessor

    class TemplateContextProcessor(BaseContextProcessor):

        CLIENT_ROUTES = (
            ('profile_fk_widget_grid', True),
        )

    def template_context_processor(HttpRequest=None):
        return TemplateContextProcessor(HttpRequest).get_context_data()

ForeignKeyGridWidget implementation notes
-----------------------------------------

Client-side part of ``ForeignKeyGridWidget``, implemented in ``App.FkGridWidget`` class, uses ``App.GridDialog`` class
to browse and to select foreign key field value for displayed ``ModelForm``.

To render chosen visual representation of foreign key, KoGridView should have class property ``row_model_str`` set to
``True`` (it is ``False`` by default)::

    class KoGridWidget(KoGridView):

        row_model_str = True

.. highlight:: javascript

This parameter is then used by `views.KoGridView`_ class ``postprocess_row()`` method to generate ``str()``
representation for each Django model instance associated to each grid row::

    def postprocess_row(self, row, obj):
        str_fields = self.get_row_str_fields(obj, row)
        if str_fields is not None:
            row['__str_fields'] = str_fields
        if getattr(self ,'row_model_str', True):
            row['__str'] = str(obj)
        return row

Note that client-side of widget is dependent either on `cbv_grid.htm`_ or `cbv_grid_inline.htm`_ Jinja2 templates, which
include library of Javascript files: Knockout.js, `app.js`_, `ko_grid.js`_ and generates grid underscore.js client-side
templates via `ko_grid_body() macro`_ call.

One has to use these templates in his project, or to develop separate templates with these client-side scripts included.
Since version 0.2.0 it's possible to include Jinja2 templates from Django templates with custom library::

    {% load %jinja %}
    {% jinja 'ko_grid_body.htm' with _render_=1 %}

* See `club_grid.html`_ for example of grid templates generation from Django Template Language.

The value of ``grid_options`` argument of ``ForeignKeyGridWidget()`` is very much similar to definition of
``'fkGridOptions'`` value for `Foreign key filter`_ example of Django grid method ``get_default_grid_options()``.

It's because both dynamically create grids inside BootstrapDialog, with the following differences:

* ``'fk' filter`` limits grid queryset.
* ``ForeignKeyGridWidget`` is used to set foreign key value, to be later submitted via ``ModelForm`` (including both
  traditional HTML response and AJAX ones).

Widget's Python code generates client-side component similar to `ko_grid() macro`_, but it uses ``App.FkGridWidget``
component class instead of ``App.ko.Grid`` component class.

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
