===================
Client-side support
===================
.. _App.GridDialog: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=App.GridDialog&utf8=%E2%9C%93
.. _App.globalIoc: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=app.globalioc&type=&utf8=%E2%9C%93
.. _App.ko.Subscriber: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=App.ko.Subscriber&type=&utf8=%E2%9C%93
.. _App.Tpl: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=App.Tpl&utf8=%E2%9C%93
.. _App.vmRouter: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=App.vmRouter&type=&utf8=%E2%9C%93
.. _data-component-class: https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=data-component-class
.. _ko_grid(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/ko_grid.htm
.. _ko_grid_body(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/ko_grid_body.htm

app.js
------
Implements client-side helper classes, including:

* `Viewmodels (client-side response routing)`_
* `Underscore.js templates`_
* `Components`_
* `Multiple level Javascript class inheritance`_

Viewmodels (client-side response routing)
-----------------------------------------
See :doc:`viewmodels` for the detailed explanation.

* Separates AJAX calls from their callback processing, allowing to specify AJAX routes in button html5 data
  attributes not having to define implicit DOM event handler and implicit callback.
* Allows to write more modular Javascript code.
* Client-side view models can also be executed in Javascript directly.
* Possibility to optionally inject client-side viewmodels into html pages, executing these on load.
* Possibility to execute client-side viewmodels from current user session (persistent onload).
* `App.vmRouter`_ - predefined built-in AJAX response viewmodels router to perform standard client-side actions, such as
  displaying BootstrapDialogs, manipulate DOM content with graceful AJAX errors handling. It can be used to define new
  viewmodel handlers.

Simplifying AJAX calls
~~~~~~~~~~~~~~~~~~~~~~

* ``App.routeUrl`` - mapping of Django server-side route urls to client-side Javascript.
* ``App.ajaxButton`` - automation of button click event AJAX POST handling for Django.
* ``App.ajaxForm`` - Django form AJAX POST submission with validation errors display via response client-side viewmodels.

  By default only requires ``is_ajax=True`` argument of :ref:`macros_bs_form` / :ref:`macros_bs_inline_formsets` Jinja2
  macros.

  The whole process of server-side to client-side validation errors mapping is performed by the built-in
  :ref:`views_formwithinlineformsetsmixin` class ``.form_valid()`` / ``form_invalid()`` methods.

  Supports multiple Django POST routes for the same AJAX form via multiple ``input[type="submit"]`` buttons in the
  generated form html body.

* ``App.Dialog`` BootstrapDialog wrapper.
* ``App.get()`` / ``App.post()`` automate execution of AJAX POST handling for Django and allow to export named Django
  urls like ``url(name='my_url_name')`` to be used in client-side code directly.

* Client initialization performed separately from ``$(document).ready()`` initialization, because client initialization
  also may be used for dynamically added HTML DOM content (from AJAX response or via Knockout.js templates).
  For example, custom ``'formset:added'`` jQuery event automatically supports client initialization (field classes /
  field event handlers) when new form is added to inline formset dynamically.
* ``$(document).ready()`` event handler uses it's own hook system for plugins, to do not interfere with external scripts
  code.

.. _quickstart_underscore_js_templates:

Global IoC
----------
Since version 0.7.0, there is ``App.readyInstances`` variable which holds lazy definitions of global instances
initialized when browser document is loaded. It allows to re-define built-in global instances and to add custom
global instances in user scripts like this::

    // Late initialization allows to patch / replace classes in user scripts.
    App.readyInstances['App.userActions'] = {'App.Actions': {
        route: 'user_actions',
        actions: {
            'send': {},
            'receive_for_room': {},
            'room_list': {},
            'unread_count': {},
        }
    }};

Underscore.js templates
-----------------------
Underscore.js templates can be autoloaded as ``App.Dialog`` modal body content. Also they are used in conjunction with
Knockout.js templates to generate components, for example AJAX grids (Django datatables).

Since version 0.5.0 template processor was rewritten as `App.Tpl`_ class. It made possible to extend or to replace
template processor class by altering `App.globalIoc`_ factory ``['App.Tpl']`` key. Such custom template processor class
could override one of (sub)templates loading methods ``expandTemplate()`` or ``compileTemplate()``.

In the underscore.js template execution context, the instance of `App.Tpl`_ class is available as ``self`` variable.
Thus calling `App.Tpl`_ class ``.get('varname')`` method is performed as ``self.get('varname')``. See `ko_grid_body()`_
templates for the example of ``self.get`` method usage.

Internally template processor is used for optional client-side overriding of default grid templates, supported via
`App.Tpl`_ constructor ``options.templates`` argument.

* ``App.compileTemplate`` provides singleton factory for compiled underscore.js templates from ``<script>`` tag with
  specified DOM id ``tplId``.
* ``App.Tpl.domTemplate`` converts template with specified DOM id and template arguments into jQuery DOM subtee.
* ``App.Tpl.loadTemplates`` recursively loads existing underscore.js templates by their DOM id into DOM nodes with html5
  ``data-template-id`` attributes for specified ``$selector``.
* ``App.bindTemplates`` - templates class factory used by ``App.initClient`` autoinitialization of DOM nodes.

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

Components
----------
``App.Components`` class allows to automatically instantiate Javascript classes by their string path specified in
element's ``data-component-class`` html5 attribute and bind these to that element. It is used to provide Knockout.js
``App.ko.Grid`` component auto-loading / auto-binding, but is not limited to that.

.. highlight:: html

Since version 0.3.0, components can be also instantiated via target element event instead of document 'ready' event.
To enable that, define ``data-event`` html5 attribute on target element. For example, to bind component classes to
button 'click' / 'hover'::

    <button class="component" data-event="click"
        data-component-class="App.GridDialog"
        data-component-options='{"filterOptions": {"pageRoute": "club_member_grid"}}'>
        Click to see project list
    </button>

When target button is clicked, ``App.GridDialog`` class will be instantiated with ``data-component-options`` value
passed as constructor argument.

.. highlight:: jinja

JSON string value of ``data-component-options`` attribute can be nested object with many parameter values, so usually it
is generated in Jinja2 macro, such as `ko_grid()`_::

    <div{{ tpl.json_flatatt(wrapper_dom_attrs) }} data-component-options='{{ _grid_options|escapejs(True) }}'>
    <a name="{{ fragment_name }}"></a>
        <div{{ tpl.json_flatatt(_template_dom_attrs) }}>
        </div>
    </div>

.. highlight:: javascript

Version 0.3.0 also brings control over component binding and re-using. By default, current component instance is re-used
when the same event is fired. To have component re-instantiated, one should save target element in component instance
like this::

    MyComponent.runComponent = function(elem) {
        this.componentElement = elem;
        // Run your initialization code here ...
        this.doStuff();
    };

Then in your component shutdown code call ``App.components`` instance ``.unbind()`` method, then ``.add()`` method::

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

See `App.GridDialog`_ code for the example of built-in component, which allows to fire AJAX grids via click events.

Because ``App.GridDialog`` class constructor may have many options, including dynamically-generated ones, it's
preferable to generate ``data-component-options`` JSON string value in Python / Jinja2 code.

Search for `data-component-class`_ in djk-sample code for the examples of both document ready and button click
component binding.

Knockout.js subscriber
----------------------
Since version 0.7.0, there is Javascript class `App.ko.Subscriber`_ which may be used as mixin to Knockout.js viewmodels
classes to control viewmodel methods subscriptions. To add mixin to your class::

    $.inherit(App.ko.Subscriber.prototype, this);

In case there is observable property::

    this.meta.rowsPerPage = ko.observable();

Which changes should be notified to viewmodel method::

    Grid.on_meta_rowsPerPage = function(newValue) {
        this.actions.perform('list');
    };

Then to subscribe that method to this.meta.rowsPerPage() changes::

    this.subscribeToMethod(['meta', 'rowsPerPage']);

An example of temporary unsubscription / subscription to the method, used to alter observable value without the
execution of an observation handler::

    Grid.listCallback = function(data) {
        // ... skipped ...
        // Temporarily disable meta.rowsPerPage() subscription:
        this.disposeMethod(['meta', 'rowsPerPage']);

        // Update observable data but .on_meta_rowsPerPage() will not be executed:
        this.meta.prevRowsPerPage = this.meta.rowsPerPage();
        this.meta.rowsPerPage(data.rowsPerPage);

        // Re-enable meta.rowsPerPage() subscription:
        this.subscribeToMethod(['meta', 'rowsPerPage']);
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

jQuery plugins
~~~~~~~~~~~~~~
* ``$.autogrow`` plugin to automatically expand text lines of textarea elements;
* ``$.linkPreview`` plugin to preview outer links in secured html5 iframes;
* ``$.scroller`` plugin - AJAX driven infinite vertical scroller;
* ``$.fn.replaceWithTag`` plugin to replace HTML tag with another one, used by ``App.initClient`` and by
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
* Implements :doc:`viewmodels` for Bootstrap 3 tooltips and popovers. These viewmodels are used in client-side part of
  AJAX forms validation, but not limited to.
