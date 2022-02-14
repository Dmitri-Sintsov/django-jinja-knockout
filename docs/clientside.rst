===================
Client-side support
===================
.. _AjaxButton:: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=AjaxButton&type=&utf8=%E2%9C%93
.. _AjaxForm:: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=AjaxForm&type=&utf8=%E2%9C%93
.. _AppGet: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=AppGet&type=&utf8=%E2%9C%93
.. _AppPost: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=AppPost&type=&utf8=%E2%9C%93
.. _App.bindTemplates: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=App.bindTemplates&type=code
.. _App.compileTemplate: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=App.compileTemplate&type=code
.. _App.components: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=app.components
.. _App.ComponentManager: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=app.componentmanager
.. _documentReadyHooks: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=documentreadyhooks
.. _App.Tpl.domTemplate: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=Tpl.domTemplate&type=code
.. _Dialog: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=Dialog&utf8=%E2%9C%93
.. _App.GridDialog: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=App.GridDialog&utf8=%E2%9C%93
.. _App.globalIoc: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=app.globalioc&type=&utf8=%E2%9C%93
.. _App.initClient: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=App.initClient+%3D+function
.. _App.initClientHooks: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=App.initClientHooks+%3D+function
.. _App.Tpl.loadTemplates: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=Tpl.loadTemplates&type=code
.. _localize: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=localize&type=code
.. _App.OrderedHooks: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=App.OrderedHooks
.. _App.ko.Subscriber: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=App.ko.Subscriber&type=&utf8=%E2%9C%93
.. _App.Tpl: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=App.Tpl&utf8=%E2%9C%93
.. _Trans: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search??l=JavaScript&q=Trans&type=code
.. _App.TransformTags: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=transformtags
.. _vmRouter: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=vmRouter&type=&utf8=%E2%9C%93
.. _Url: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=Url&type=&utf8=%E2%9C%93
.. _bs_range_filter.htm: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/bs_range_filter.htm
.. _data-component-class: https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=data-component-class
.. _Internationalization in JavaScript code: https://docs.djangoproject.com/en/dev/topics/i18n/translation/#internationalization-in-javascript-code
.. _ko_grid(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/ko_grid.htm
.. _ko_grid_body(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/ko_grid_body.htm
.. _member_grid_tabs.htm: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/club_app/jinja2/member_grid_tabs.htm
.. _sprintf: https://github.com/alexei/sprintf.js
.. _settings.py: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/djk_sample/settings.py
.. _system.js: https://github.com/systemjs/systemjs
.. _django_deno: https://github.com/Dmitri-Sintsov/django-deno

app.js
------
Since v2.0, the monolithic app.js which used global ``App`` container, has been refactored into es6 modules, which makes
the client-side development more flexible. The modules themselves still use es5 syntax, with the exception of es6
imports / exports. To run the code in outdated browser which does not support es6 modules (eg IE11), `django_deno`_
bundling app should be used. It also has optional terser support. There is sample app django_deno config (see
djk-sample `settings.py`_ for full sample):

.. highlight:: python

    INSTALLED_APPS = [
        'django.contrib.admin',
        'django.contrib.auth',
        'django.contrib.contenttypes',
        'django.contrib.sessions',
        'django.contrib.messages',
        'django.contrib.staticfiles',
        # 'sites' is required by allauth
        'django.contrib.sites',
        'django_deno',
    ] + DJANGO_JINJA_APPS + [
        'djk_ui',
        'django_jinja_knockout',
        'django_jinja_knockout._allauth',
    ] + DJK_APPS + [
        'allauth',
        'allauth.account',
        # Required for socialaccount template tag library despite we do not use social login
        'allauth.socialaccount',
    ]

    DENO_ROLLUP_ENTRY_POINTS = [
        'sample/js/app.js',
        'sample/js/club-grid.js',
        'sample/js/member-grid.js',
    ]

    DENO_ROLLUP_BUNDLES = {
        'djk': {
            'writeEntryPoint': 'sample/js/app.js',
            'matches': [
                'djk/js/*',
                'djk/js/lib/*',
                'djk/js/grid/*',
            ],
            'excludes': [],
            'virtualEntryPoints': 'matches',
            'virtualEntryPointsExcludes': 'excludes',
        },
    }

    # Do not forget to re-run collectrollup management command after changing rollup.js bundles module type:
    DENO_OUTPUT_MODULE_TYPE = 'module' if DEBUG else 'systemjs-module'
    DJK_JS_MODULE_TYPE = DENO_OUTPUT_MODULE_TYPE

    # Run $VIRTUAL_ENV/djk-sample/cherry_django.py to check validity of collectrollup command output.
    DENO_ROLLUP_COLLECT_OPTIONS = {
        'terser': True,
    }

    DENO_ENABLE = True
    DENO_DEBUG = False
    DENO_RELOAD = False

Old browsers such as IE11 will use the bundled `system.js`_ loader.
Note that modern browsers do not require any bundling at all.

Client-side modules include many different features:

* `Viewmodels (client-side response routing)`_
* `Underscore.js templates`_
* `Components`_
* `Multiple level Javascript class inheritance`_
* `Dialog`_ BootstrapDialog wrapper.

Client-side initialization
--------------------------

.. highlight:: javascript

There are two different hooks / methods of client-side initialization:

* `documentReadyHooks`_ - the list of function handlers which are called via ``$(document).ready()`` event handler,
  so these do not interfere with the third party scripts code.
* `initClientHooks`_ - the ordered list of function handlers applied to content generated by the viewmodels /
  Underscore.js / Knockout.js templates to provide the dynamic styles / event handlers / client-side components. It's
  processed via calling `initClient`_ function. `OrderedHooks`_ class instance is used to add hooks in proper
  order, where the component initialization hook should always be executed at the last step.

Read more about viewmodels here: :doc:`viewmodels`.

It supports mandatory 'init' and optional 'dispose' types of handlers for the DOM subtrees, where 'dispose' handlers
are called in the reverse order. It's also possible to define custom types of handlers.

To add new client-side initialization handlers of the 'init' / 'dispose' types::

    import { initClientHooks } from '../../djk/js/initclient.js';

    initClientHooks.add({
        init: function($selector) {
            $selector.myPlugin('init');
        },
        dispose: function($selector) {
            $selector.myPlugin('dispose');
        }
    });

To add only the 'init' type of handler (when disposal is not needed)::

    import { initClientHooks } from '../../djk/js/initclient.js';

    initClientHooks.add(function($selector) {
        $selector.myPlugin('init');
    });

To call all the chain of 'init' handlers::

    import { initClient } from '../../djk/js/initclient.js';

    initClient($selector);

To call all the chain of 'dispose' handlers::

    import { initClient } from '../../djk/js/initclient.js';

    initClient($selector, 'dispose');

Note that the handlers usually are callled automatically, except for grid rows where one has to use grid .useInitClient
option to enable .initClient() call for grid rows DOM. See :doc:`datatables` for more info.

Custom ``'formset:added'`` jQuery event automatically supports client initialization, eg form field classes / form field
event handlers when the new form is added to inline formset dynamically.

Viewmodels (client-side response routing)
-----------------------------------------
See :doc:`viewmodels` for the detailed explanation.

* Separates AJAX calls from their callback processing, allowing to specify AJAX routes in button html5 data
  attributes not having to define implicit DOM event handler and implicit callback.
* Allows to write more modular Javascript code.
* Client-side view models can also be executed in Javascript directly.
* Possibility to optionally inject client-side viewmodels into html pages, executing these on load.
* Possibility to execute client-side viewmodels from current user session (persistent onload).
* `vmRouter`_ - predefined built-in AJAX response viewmodels router to perform standard client-side actions, such as
  displaying BootstrapDialogs, manipulate DOM content with graceful AJAX errors handling. It can be used to define new
  viewmodel handlers.

Simplifying AJAX calls
~~~~~~~~~~~~~~~~~~~~~~

* `Url`_ - mapping of Django server-side route urls to client-side Javascript.
* `AjaxButton`_ - automation of button click event AJAX POST handling for Django.
* `AjaxForm`_ - Django form AJAX POST submission with validation errors display via response client-side viewmodels.

  Requires ``is_ajax=True`` argument of :ref:`macros_bs_form` / :ref:`macros_bs_inline_formsets` Jinja2 macros.

  The whole process of server-side to client-side validation errors mapping is performed by the built-in
  :ref:`views_formwithinlineformsetsmixin` class ``.form_valid()`` / ``form_invalid()`` methods.

  Supports multiple Django POST routes for the same AJAX form via multiple ``input[type="submit"]`` buttons in the
  generated form html body.

* `AppGet`_ / `AppPost`_ automate execution of AJAX POST handling for Django using named urls like
  ``url(name='my_url_name')`` exported to client-side code directly.

Global IoC
----------
Since v2.0, monolithic ``App.readyInstances`` has been replaced by `globalIoc`_ instance of `ViewModelRouter`_ class,
which holds lazy definitions of global instances initialized when browser document is loaded. It allows to override
built-in global instances and to add custom global instances in user scripts like this::

    import { globalIoc } from '../../djk/js/ioc.js';

    // Late initialization allows to patch / replace classes in user scripts.
    globalIoc.add('UserClass', function(options) {
        return new UserClass(options);
    });

Client-side localization
------------------------

It's possible to format Javascript translated messages with `Trans`_ function::

    import { Trans } from '../../djk/js/translate.js';

    Trans('Yes')
    Trans('No')
    Trans('Close')
    Trans('Delete "%s"', formModelName)
    // named arguments
    Trans(
        'Too big file size=%(size)s, max_size=%(maxsize)s',
        {'size': file.size, 'maxsize': maxSize}
    )
    // with html escape
    Trans('Undefined viewModel.view %s', $.htmlEncode(viewModelStr))

.. highlight:: html

Automatic translation of html text nodes with ``localize-text`` class is performed with `localize`_ by
`Client-side initialization`_ ::

    <div class="localize-text">Hello, world in your language!</div>

* See `Internationalization in JavaScript code`_ how to setup Javascript messages catalog in Django.
* Internally, `sprintf`_ library and `Trans`_ is used to convert messages to local versions.
* See `bs_range_filter.htm`_ source for the complete example.

.. _clientside_underscore_js_templates:

Underscore.js templates
-----------------------
Underscore.js templates can be autoloaded as ``App.Dialog`` modal body content. Also they are used in conjunction with
Knockout.js templates to generate components, for example AJAX grids (Django datatables).

Template processor is implemented as `App.Tpl`_ class. It makes possible to extend or to replace template processor
class by altering `App.globalIoc`_ factory ``['App.Tpl']`` key. Such custom template processor class could override one
of the (sub)templates loading methods ``.expandTemplate()`` or ``.compileTemplate()``.

In the underscore.js template execution context, the instance of `App.Tpl`_ class is available as ``self`` variable.
Thus calling `App.Tpl`_ class ``.get('varname')`` method is performed as ``self.get('varname')``. See `ko_grid_body()`_
templates for the example of ``self.get`` method usage.

Internally template processor is used for optional client-side overriding of default grid templates, supported via
`App.Tpl`_ constructor ``options.templates`` argument.

* `App.compileTemplate`_ provides singleton factory for compiled underscore.js templates from ``<script>`` tag with
  specified DOM id ``tplId``.
* `App.Tpl.domTemplate`_ converts template with specified DOM id and template arguments into jQuery DOM subtee.
* `App.Tpl.loadTemplates`_ recursively loads existing underscore.js templates by their DOM id into DOM nodes with html5
  ``data-template-id`` attributes for specified ``$selector``.
* `App.bindTemplates`_ - templates class factory used by `App.initClient`_ auto-initialization of DOM nodes.

The following html5 data attributes are used by `App.Tpl`_ template processor:

* ``data-template-id`` - destination DOM node which will be replaced by expanded underscore.js template with specified
  template id. Attribute can be applied recursively.
* ``data-template-class`` - optional override of default `App.Tpl`_ template processor class. Allows to process
  different underscore.js templates with different template processor classes.
* ``data-template-args`` - optional values of current template processor instance ``.extendData()`` method argument.
  This value will be appended to ``.data`` property of template processor instance. The values stored in ``.data``
  property are used to control template execution flow via ``self.get()`` method calls in template source code.
* ``data-template-args-nesting`` - optionally disables appending of ``.data`` property of the parent template processor
  instance to ``.data`` property of current nested child template processor instance.
* ``data-template-options`` - optional value of template processor class constructor ``options`` argument, which
  may have the following keys:

    * ``.data`` - used by `App.Tpl`_ class ``.get()`` method to control template execution flow.
    * ``.templates`` - key map of template ids to optionally substitute template names.

.. _clientside_attributes_merging:

Template attributes merging
~~~~~~~~~~~~~~~~~~~~~~~~~~~

The DOM attributes of the template holder tag different from ``data-template-*`` are copied to the root DOM node of the
expanded template. This allows to get the rid of template wrapper when using the templates as the foundation of
components. For example datatables / grid templates do not use separate wrapper tag anymore and thus become simpler.

.. _clientside_custom_tags:

Custom tags
~~~~~~~~~~~
The built-in template processor supports custom tags via `App.TransformTags`_ Javascript class ``applyTags()`` method.
By default there are the ``CARD-*`` tags registered, which are transformed to Bootstrap 4 cards or to Bootstrap 3 panels
depending on the :doc:`djk_ui` version.

Custom tags are also applied via `App.initClient`_ to the loaded DOM page and to dynamically loaded AJAX DOM fragments.
However because the custom tags are not browser-native, such usage of custom tags is not recommended as extra flicker
may occur. Such flicker never occurs in built-in `Underscore.js templates`_, because the template tags are substituted
before they are attached to the page DOM.

It's possible to add new custom tags via supplying the capitalized ``tagName`` argument and function processing argument
``fn`` to `App.TransformTags`_ class ``add()`` method.

.. _clientside_components:

Components
----------
`App.Components`_ class allows to automatically instantiate Javascript classes by their string path specified in
element's ``data-component-class`` html5 attribute and bind these to that element. It is used to provide Knockout.js
``App.ko.Grid`` component auto-loading / auto-binding, but is not limited to that.

.. highlight:: html

Components can be also instantiated via target element event instead of document 'ready' event. To enable that, define
``data-event`` html5 attribute on target element. For example, to bind component classes to button 'click' / 'hover'::

    <button class="component"
        data-event="click"
        data-component-class="App.GridDialog"
        data-component-options='{"filterOptions": {"pageRoute": "club_member_grid"}}'>
        Click to see project list
    </button>

When target button is clicked, ``App.GridDialog`` class will be instantiated with ``data-component-options`` value
passed as constructor argument.

.. highlight:: jinja

JSON string value of ``data-component-options`` attribute can be nested object with many parameter values, so usually it
is generated in Jinja2 macro, such as `ko_grid()`_::

    <div{{ tpl.json_flatatt(_dom_attrs) }}></div>

.. highlight:: javascript

By default, current component instance is re-used when the same event is fired multiple times. To have component
re-instantiated, one should save target element in component instance like this::

    MyComponent.runComponent = function(elem) {
        this.componentElement = elem;
        // Run your initialization code here ...
        this.doStuff();
    };

Then in your component shutdown code call `App.components`_ instance ``.unbind()`` method, then ``.add()`` method::

    MyComponent.onHide = function() {
        // Run your shutdown code ...
        this.doShutdown();
        // Detect component, so it will work without component instantiation too.
        if (this.componentElement !== null) {
            // Unbind component.
            var desc = App.components.unbind(this.componentElement);
            if (typeof desc.event !== 'undefined') {
                // Re-bind component to the same element with the same event.
                App.components.add(this.componentElement, desc.event);
            }
        }
    };

See `App.GridDialog`_ code for the example of built-in component, which allows to fire AJAX datatables via click events.

Because `App.GridDialog`_ class constructor may have many options, including dynamically-generated ones, it's
preferable to generate ``data-component-options`` JSON string value in Python / Jinja2 code.

Search for `data-component-class`_ in djk-sample code for the examples of both document ready and button click
component binding.

Components use `App.ComponentManager`_ class which provides the support for nested components and for sparse components.

.. _clientside_nested_components:

Nested components
~~~~~~~~~~~~~~~~~

.. highlight:: html

It's possible to nest component DOM nodes recursively unlimited times::

    <div class="component" data-component-class="App.ko.Grid">
        <input type="button" value="Grid button" data-bind="click: onClick()">
        <div class="component" data-component-class="App.MyComponent">
            <input type="button" value="My component button" data-bind="click: onClick()">
        </div>
    </div>

The Knockout.js bindings will be provided correctly to ``App.ko.Grid`` class instance ``onClick()`` method for the
``Grid button`` and to ``App.MyComponent`` class instance ``onClick()`` method for the ``My component button``.

Note that to achieve nested binding, DOM subtrees of nested components are detached until the outer components are run.
Thus, in case the outer component is run on some event, for example ``data-event="click"``, nested component nodes will
be hidden until outer component is run via the click event. Thus it's advised to think carefully when using nested
components running on events, while the default document ready nested components have no such possible limitation.

The limitation is not so big, however because most of the components have dynamic content populated only when they run.

See the demo project example of nested datatable grid component: `member_grid_tabs.htm`_.

.. _clientside_sparse_components:

Sparse components
~~~~~~~~~~~~~~~~~

.. highlight:: jinja

In some cases the advanced layout of the page requires one component to be bound to the multiple separate DOM subtrees
of the page. In such case sparse components may be used. To specify sparse component, add ``data-component-selector``
HTML attribute to it with the jQuery selector that should select sparse DOM nodes bound to that component.

Let's define the datatable grid::

    {{
        ko_grid(
            grid_options={
                'classPath': 'App.ko.ClubEditGrid',
                'pageRoute': 'club_edit_grid',
                'pageRouteKwargs': {'club_id': view.kwargs['club_id']},
            },
            dom_attrs={
                'id': 'club_edit_grid',
                'class': 'club-edit-grid',
                'data-component-selector': '.club-edit-grid',
            }
        )
    }}


.. highlight:: html

Let's define separate row list and the action button to add new row for this grid located in arbitrary location of the
page::

    <div class="club-edit-grid">
        <div data-bind="visible:gridRows().length > 0" style="display: none;">
            <h3>Grid rows:</h3>
            <ul class="auto-highlight" data-bind="foreach: {data: $('#club_edit_grid').component().gridRows, as: 'row'}">
                <li>
                    <a data-bind="text: row.displayValues.name, attr: {href: App.routeUrl('member_detail', {member_id: row.values.member_id})}"></a>
                </li>
            </ul>
        </div>
    </div>
    <div>This div is the separate content that is not bound to the component.</div>
    <div class="club-edit-grid">
        <button class="btn-choice btn-info club-edit-grid" data-bind="click: function() { this.performAction('create_inline'); }">
            <span class="iconui iconui-plus"></span> Add row
        </button>
    </div>

When the document DOM will be ready, ``App.ClubEditGrid`` class will be bound to three DOM subtrees, one is generated
via ``ko_grid()`` Jinja2 macro and two located inside separate ``<div class="club-edit-grid">`` wrappers.

Sparse components may also include inner non-sparse (single DOM subtree) nested components. Nesting of sparse components
is unsupported.

Knockout.js subscriber
----------------------

.. highlight:: javascript

Javascript mixin class `App.ko.Subscriber`_ may be used to control Knockout.js viewmodel methods subscriptions. To add
this mixin to your class::

    $.inherit(App.ko.Subscriber.prototype, this);

In case there is observable property::

    this.meta.rowsPerPage = ko.observable();

Which changes should be notified to viewmodel method::

    Grid.on_meta_rowsPerPage = function(newValue) {
        this.actions.perform('list');
    };

Then to subscribe that method to this.meta.rowsPerPage() changes::

    this.subscribeToMethod('meta.rowsPerPage');

An example of temporary unsubscription / subscription to the method, used to alter observable value without the
execution of an observation handler::

    Grid.listCallback = function(data) {
        // ... skipped ...
        // Temporarily disable meta.rowsPerPage() subscription:
        this.disposeMethod('meta.rowsPerPage');

        // Update observable data but .on_meta_rowsPerPage() will not be executed:
        this.meta.prevRowsPerPage = this.meta.rowsPerPage();
        this.meta.rowsPerPage(data.rowsPerPage);

        // Re-enable meta.rowsPerPage() subscription:
        this.subscribeToMethod('meta.rowsPerPage');
        // ... skipped ...
    }

plugins.js
----------
Set of jQuery plugins.

Multiple level Javascript class inheritance
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
* ``$.inherit`` - implementation of meta inheritance.
  Copies parent object ``prototype`` methods into ``instance`` of pseudo-child. Supports nested multi-level inheritance
  with chains of ``_super`` calls in Javascript via ``$.SuperChain`` class.

Multi-level inheritance should be specified in descendant to ancestor order.

.. highlight:: javascript

For example to inherit from base class App.ClosablePopover, then from immediate ancestor class App.ButtonPopover,
use the following Javascript code::

    App.CustomPopover = function(options) {
        // Immediate ancestor.
        $.inherit(App.ButtonPopover.prototype, this);
        // Base ancestor.
        $.inherit(App.ClosablePopover.prototype, this);
        this.init(options);
    };

    (function(CustomPopover) {

        CustomPopover.init = function(options) {
            // Will call App.ButtonPopover.init(), with current 'this' context when such method is defined, or
            // will call App.ClosablePopower.init(), with current 'this' context, otherwise.
            // App.ButtonPopover.init() also will be able to call it's this._super._call('init', options);
            // as inheritance chain.
            this._super._call('init', options);
        };

    })(App.CustomPopover.prototype);

Real examples of inheritance are available in ``button-popover.js`` ``App.ButtonPopover`` class implementation and in
``grid.js``, including multi-level one::

    ActionTemplateDialog.inherit = function() {
        // First, import methods of direct ancestor.
        $.inherit(App.ActionsMenuDialog.prototype, this);
        // Second, import methods of base class that are missing in direct ancestor.
        $.inherit(App.Dialog.prototype, this);
        // Third, import just one method from ModelFormDialog (simple mixin).
        this.getButtons = App.ModelFormDialog.prototype.getButtons;
    };

Advanced popovers
~~~~~~~~~~~~~~~~~
App.ClosablePopover creates the popover with close button. The popover is shown when mouse enters the target area.
It's possible to setup the list of related popovers to auto-close the rest of popovers besides the current one like this::

    App.bag.messagingPopovers = [];

    var messagingPopover = new App.ClosablePopover({
        target: document.getElementById('notification_popover'),
        message: 'Test',
        relatedPopovers: App.bag.messagingPopovers,
    });

App.ButtonPopover creates closable popover with additional dialog button which allows to perform onclick action via
overridable ``.clickPopoverButton()`` method.

jQuery plugins
~~~~~~~~~~~~~~
* ``$.autogrow`` plugin to automatically expand text lines of textarea elements;
* ``$.linkPreview`` plugin to preview outer links in secured html5 iframes;
* ``$.scroller`` plugin - AJAX driven infinite vertical scroller;
* ``$.fn.replaceWithTag`` plugin to replace HTML tag with another one, used by `App.initClient`_ and by
  `Underscore.js templates`_ to create custom tags.

.. highlight:: html

Some of these jQuery plugins have corresponding Knockout.js bindings in ``app.js``, simplifying their usage in
client-side scripts:

* ``ko.bindingHandlers.autogrow``::

    <textarea data-bind="autogrow: {rows: 4}"></textarea>
* ``ko.bindingHandlers.linkPreview``::

    <div data-bind="html: text, linkPreview"></div>
* ``ko.bindingHandlers.scroller``::

    <div class="rows" data-bind="scroller: {top: 'loadPreviousRows', bottom: 'loadNextRows'}"></div>

tooltips.js
-----------
* Implements :doc:`viewmodels` for Bootstrap tooltips and popovers. These viewmodels are used in client-side part of
  AJAX forms validation, but not limited to.
