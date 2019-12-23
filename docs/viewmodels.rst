.. _app.js: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/static/djk/js/app.js
.. _App.Actions: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=App.Actions&type=&utf8=%E2%9C%93
.. _App.components: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=App.components&utf8=%E2%9C%93
.. _App.destroyTooltipErrors: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=App.destroyTooltipErrors&type=&utf8=%E2%9C%93
.. _App.EditForm: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=app.editform&type=&utf8=%E2%9C%93
.. _App.EditForm usage: https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=App.EditForm
.. _App.EditInline: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=app.editinline&type=&utf8=%E2%9C%93
.. _App.vmRouter: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=App.vmRouter&type=&utf8=%E2%9C%93
.. _App.ko.Grid: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/static/djk/js/grid.js
.. _ActionsView: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=ActionsView&type=&utf8=%E2%9C%93
.. _App.ModelFormActions: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=App.ModelFormActions&type=&utf8=%E2%9C%93
.. _callback_action: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=callback_action
.. _GetPostMixin: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?q=GetPostMixin&type=Code
.. _KoGridView: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=KoGridView&type=&utf8=%E2%9C%93
.. _App.GridActions: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=App.GridActions&type=&utf8=%E2%9C%93
.. _ModelFormActionsView: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=ModelFormActionsView&type=&utf8=%E2%9C%93
.. _tooltips.js: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/static/djk/js/tooltips.js
.. _vm_list: https://github.com/Dmitri-Sintsov/djk-sample/search?l=Python&q=vm_list&type=&utf8=%E2%9C%93


=================================================
Client-side viewmodels and AJAX response routing
=================================================

Client-side viewmodels
----------------------

.. highlight:: javascript

``django_jinja_knockout`` implements AJAX response routing with client-side viewmodels.

Viewmodels are defined as an array of simple objects in Javascript::

    var viewmodels = [
        {
            'view': 'prepend',
            'selector': '#infobar',
            'html': '<div class="alert alert-info">Welcome to our site!</div>'
        },
        {
            'view': 'confirm',
            'title': 'Please enter <i>your</i> personal data.',
            'message': 'After the registration our manager will contact <b>you</b> to validate your personal data.',
            'callback': [{
                'view': 'redirect_to',
                'url': '/homepage/'
            }],
            'cb_cancel': [{
                'view': 'redirect_to',
                'url': '/logout/'
            }]
        }
    ];

.. highlight:: python

and as the special list (`vm_list`_) of ordinary dicts in Python::


    from django_jinja_knockout.viewmodels import vm_list

    viewmodels = vm_list(
        {
            'view': 'prepend',
            'selector': '#infobar',
            'html': '<div class="alert alert-info">Welcome to our site!</div>'
        },
        {
            'view': 'confirm',
            'title': 'Please enter <i>your</i> personal data.',
            'message': 'After the registration our manager will contact <b>you</b> to validate your personal data.',
            'callback': vm_list({
                'view': 'redirect_to',
                'url': '/homepage/'
            }),
            'cb_cancel': vm_list({
                'view': 'redirect_to',
                'url': '/logout/'
            })
        }
    )

When executed, each viewmodel object (dict) from the ``viewmodels`` variable defined above, will be used as the function
argument of their particular handler:

* ``'view': 'prepend'``: executes ``jQuery.prepend(viewmodel.html)`` function for specified selector ``#infobar``;
* ``'view': 'confirm'``: shows ``BootstrapDialog`` confirmation window with specified ``title`` and ``message``;

  * ``'callback'``: when user hits ``Ok`` button of ``BootstrapDialog``, nested ``callback`` list of client-side
    viewmodels will be executed, which defines just one command: ``redirect_to`` with the specified url ``/homepage/``;
  * ``'cb_cancel``: when user cancels confirmation dialog, redirect to ``/logout/`` url will be performed.

.. highlight:: javascript

Now, how to execute these viewmodels we defined actually? At Javascript side it's a simple call (version 0.7.0)::

    App.vmRouter.respond(viewmodels);

While single viewmodel may be execuded via the following call::

    App.vmRouter.show({
        'view': 'form_error',
        'id': $formFiles[i].id,
        'messages': [message]
    });

However, it does not provide much advantage over performing ``jQuery.prepend()`` and instantiating ``BootstrapDialog()``
manually. Then why is all of that?

First reason: one rarely should execute viewmodels from client-side directly. It's not the key point of their
introduction. They are most useful as foundation of interaction between server-side Django and client-side Javascript
via AJAX requests where the AJAX response is the list of viewmodels generated at server-side, and in few other special
cases, such as sessions and document.onload viewmodels injecting.

Second reason: It is possible to setup multiple viewmodel handlers and then to remove these. One handler also could call
another handler. Think of event subscription: these are very similar, however not only plain functions are supported,
but also functions bound to particular instance (methods) and classpath strings to instantiate new Javascript classes::

    var handler = {
        fn: App.MyClass.prototype.myMethod,
        context: App.myClassInstance
    };
    // Subscribe to bound method:
    App.vmRouter.addHandler('my_view', handler)
    // Subscribe to bound method:
        .add('my_view', App.MyClass.prototype.myMethod2, App.myClassInstance)
    // Subscribe to unbound function:
        .add('my_view', myFunc)
    // Subscribe to instantiate a new class via classpath specified:
        .addHandler('my_view', 'App.MyClass');
    // ...
    // Will execute all four handlers attached above:
    App.vmRouter.exec('my_view', {'a': 1, 'b': 2});
    // ...
    // Unsubscribe handlers. The order is arbitrary.
    App.vmRouter.removeHandler('my_view', {fn: App.MyClass.prototype.myMethod2, context: App.myClassInstance})
        .removeHandler('my_view', myFunc)
        .removeHandler('my_view', handler)
        .removeHandler('my_view', 'App.MyClass');

Viewmodel data format
~~~~~~~~~~~~~~~~~~~~~

Key ``'view'`` of each Javascript object / Python dict in the list specifies the value of ``viewmodel name``, that is
bound to particular Javascript ``viewmodel handler``. The viewmodel itself is used as the Javascript object argument of
each particular ``viewmodel handler`` with the corresponding keys and their values. The following built-in viewmodel
names currently are available in `app.js`_ (version 0.7.0)::

    [
        'redirect_to',
        'post',
        'alert',
        'alert_error',
        'confirm',
        'trigger',
        'append',
        'prepend',
        'after',
        'before',
        'remove',
        'html',
        'replaceWith',
        'replace_data_url'
    ]

If your AJAX code just needs to perform one of these standard actions, such as display alert / confirm window,
trigger an event, redirect to some url or to perform series of jQuery DOM manipulation, then you may just use the list
of viewmodels that map to these already pre-defined handlers.

Even automatic AJAX POST is available with ``post`` viewmodel and even an AJAX callback is not required for POST because
each ``post`` viewmodel AJAX response will be interpreted (routed) as the list of viewmodels - making chaining / nesting
of POSTs easily possible.

Since version 0.6.0, there are class-based `AJAX actions`_ available, which allow to bind multiple methods of the
Javascript class instance to single viewmodel handler, to perform multiple actions bound to the one viewmodel name.

Defining custom viewmodel handlers
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

One may add custom viewmodels via Javascript plugins to define new actions. See `tooltips.js`_ for additional
bundled viewmodel names and their viewmodel handlers::

    'tooltip_error', 'popover_error', 'form_error'

which are primarily used to display errors for AJAX submitted forms via viewmodels AJAX response.

The following methods allows to attach one or multiple handlers to one viewmodel name::

    App.vmRouter.add('my_view', function(viewModel, vmRouter) {
        // execute viewmodel here...
    })
        .add('my_view2', {fn: App.MyClass.prototype.method, context: MyClassInstance})
        .add('my_view3', 'App.MyClass');
    // or
    App.vmRouter.add({
        'my_view': function(viewModel, vmRouter) {
            // execute viewmodel here...
        },
        'my_view2': {fn: App.MyClass.prototype.method, context: MyClassInstance},
        'my_view3': 'App.MyClass'
    });

The following syntax allows to reset previous handlers with the names specified (if any)::

    App.vmRouter.removeAll('my_view', 'my_view2', 'my_view3')
        .add({
            'my_view': function(viewModel, vmRouter) {
                // execute viewmodel here...
            },
            'my_view2': {fn: App.MyClass.prototype.method, context: MyClassInstance},
            'my_view3': 'App.MyClass'
        });

When ``function`` handler is called, it's ``viewModel`` argument receives the actual instance of ``viewmodel``.
Second optional argument ``vmRouter`` points to the instance of `App.vmRouter`_ that was used to process current
``viewmodel``. It could be used to call another viewmodel handler inside the current handler / add / remove handlers
via calling vmRouter instance methods::

    App.vmRouter.add('my_view1', function(viewModel, vmRouter) {
        vmRouter.add('my_view2', function(viewModelNested, vmRouter) {
            // viewModelNested == {'a': 1, 'b': 2}}
            // execute viewModelNested here...
        });
        // ... skipped ...
        vmRouter.exec('my_view2', {'a': 1, 'b': 2});
    });

Note that new properties might be added to viewmodel for further access, like ``.instance`` property which holds an
instance of ``App.FieldPopover`` in the following code::

    App.vmRouter.add('tooltip_error', function(viewModel) {
        // Adding .instance property at the client-side to server-side generated viewModel:
        viewModel.instance = new App.FieldPopover(viewModel);
    });

Every already executed viewmodel is stored in ``.executedViewModels`` property of `App.vmRouter`_ instance, which may be
processed later. An example of such processing is `App.destroyTooltipErrors`_ static method, which clears form input
Bootstrap tooltips previously set by ``'tooltip_error'`` viewmodel handler then removes these viewmodels from
``.executedViewModels`` list::

    App.destroyTooltipErrors = function(form) {
        App.vmRouter.filterExecuted(
            function(viewModel) {
                if (viewModel.view === 'tooltip_error' &&
                        typeof viewModel.instance !== 'undefined') {
                    viewModel.instance.destroy();
                    return false;
                }
                return true;
            }
        );
    };

It is possible to chain viewmodel handlers, implementing a code-reuse and a pseudo-inheritance of viewmodels::

    App.vmRouter.add('popover_error', function(viewModel, vmRouter) {
        viewModel.instance = new App.FieldPopover(viewModel);
        // Override viewModel.name without altering it:
        vmRouter.exec(viewModel, 'tooltip_error');
        // or, to preserve the bound context (if any):
        vmRouter.exec(viewModel, 'tooltip_error', this);
    });

where newly defined handler ``popover_error`` executes already existing ``tooltip_error`` viewmodel handler.
The purpose of passing ``this`` bind context as an optional third argument of vmRouter.exec() call is explained below
in the `AJAX response routing`_ section.

AJAX response routing
---------------------

.. highlight:: html

Imagine you are developing mixed web application with traditional server-side generated html responses but also
having lots of AJAX interaction. With tradidional approach, you will have to write a lot of boilerplate code, like this,
html::

    <button id="my_button" class="button btn btn-default">Save your form template</button>

.. highlight:: javascript

Javascript::

    $('#my_button').on('click', function(ev) {
        $.post(
            '/url_to_ajax_handler',
            {csrfmiddlewaretoken: App.conf.csrfToken},
            function(response) {
                BootstrapDialog.confirm('After the registration our manager will contact <b>you</b> ' +
                        'to validate your personal data.',
                    function(result) {
                        if (result) {
                            window.location.href = '/another_url';
                        }
                    }
                );
            },
            'json'
        )
    });

Such code have many disadvantages:

1. Too much of callback nesting.
2. Repeated boilerplate code with ``$.post()`` numerous arguments, including manual specification of CSRF token.
3. Route url names are hardcoded into client-side Javascript, instead of being supplied from Django server-side. If you
   change an url of route in ``urls.py``, and forget to update url path in Javascript code, AJAX POST may break.
4. What if your AJAX response should have finer control over client-side response? For exmaple, sometimes you need
   to open ``BootstrapDialog``, sometimes to redirect instead, sometimes to perform some custom action?

.. highlight:: html

Enter client-side viewmodels response routing: to execute AJAX post via button click, the following Jinja2 template
code is enough::

    <button class="button btn btn-default" data-route="button-click">
        Save your form template
    </button>

.. highlight:: python

`app.js`_ will care itself of setting Javascript event handler, performing AJAX request POST and AJAX response routing
will execute viewmodels returned from Django view. If you want to ensure AJAX requests, just set your ``urls.py`` route
kwargs key ``is_ajax`` to ``True`` (optional step)::

    from my_app.views import button_click
    # ...
    url(r'^button-click/$', button_click, name='button-click', kwargs={'ajax': True}),

.. _viewmodels_client_side_routes:

Client-side routes
~~~~~~~~~~~~~~~~~~
Register AJAX client-side route (url name) in ``context_processors.py``::

    from django_jinja_knockout.context_processors import TemplateContextProcessor as BaseContextProcessor


    class TemplateContextProcessor(BaseContextProcessor):

        CLIENT_ROUTES = (
            ('button-click', True),
        )


    def template_context_processor(HttpRequest=None):
        return TemplateContextProcessor(HttpRequest).get_context_data()

Return the list of viewmodels in my_app/views.py::

    from django_jinja_knockout.decorators import ajax_required
    from django_jinja_knockout.viewmodels import vm_list

    @ajax_required
    def button_click(request):
        return vm_list({
                'view': 'confirm',
                'title': 'Please enter <i>your</i> personal data.',
                'message': 'After the registration our manager will contact <b>you</b> to validate your personal data.',
                'callback': vm_list({
                    'view': 'redirect_to',
                    'url': '/homepage'
                })
        })

Register ``button-click`` url mapped to my_app.views.button_click in your ``urls.py``::

    from my_app.views import button_click
    # ...
    url(r'^button-click/$', button_click, name='button-click', 'allow_anonymous': True, 'is_ajax': True}),

that's all.

If your Django view which maps to ``button-click`` returns standard client-side viewmodels only, just like in the
example above, you do not even have to modify a single bit of your Javascript code.

It is possible to specify client-side routes per view, not having to define them globally in template context processor::

    from django_jinja_knockout.views import create_template_context

    def my_view(request):
        create_template_context(request).add_client_routes({
            'club_detail',
            'member_grid',
        })

and per class-based view::

    class MyGridView(KoGridView):

        client_routes = [
            'my_grid_url_name'
        ]

.. highlight:: javascript

Also it is possible to specify view handler function bind context via ``.add()`` method optional argument::

    App.vmRouter.add({
        'set_context_title': {
            fn: function(viewModel) {
                // this == bindContext1
                this.setTitle(viewModel.title);
            },
            context: bindContext1
        },
        'set_context_name': {
            fn: function(viewModel) {
                // this == bindContext2
                this.setName(viewModel.name);
            },
            context: bindContext2
        }
    });

It is also possible to override the value of context for viewmodel handler dynamically with ``App.post()`` optional
``bindContext`` argument::

    App.post('button-click', postData, bindContext);

That allows to use method prototypes bound to different instances of the same Javascript class::

    App.AjaxDialog = function(options) {
        $.inherit(App.Dialog.prototype, this);
        this.create(options);
    };

    (function(AjaxDialog) {

        AjaxDialog.receivedMessages = [];
        AjaxDialog.sentMessages = [];

        AjaxDialog.vm_addReceivedMessage = function(viewModel, vmRouter) {
            this.receivedMessages.push(viewModel.text);
        };

        AjaxDialog.vm_addSentMessage = function(viewModel, vmRouter) {
            this.sentMessages.push(viewModel.text);
        };

        AjaxDialog.getMessages = function() {
            // Call bound instance (this) of AjaxDialog .vm_addReceivedMessage / .vm_addSentMessage methods,
            // supposing that AJAX response will contain one of 'add_received_message' / 'add_sent_message' viewmodels:
            App.post('my_url_name', this.postData, this);
        };

        App.vmRouter.add({
            'add_received_message': AjaxDialog.vm_addReceivedMessage,
            'add_sent_message': AjaxDialog.vm_addSentMessage,
        });

    })(App.AjaxDialog.prototype);

    var ajaxDialog = new App.AjaxDialog(options);
    ajaxDialog.getMessages();

.. highlight:: python

Django ``MyView`` mapped to ``'my_url_name'`` (see :ref:`installation_context-processor`) should return `vm_list`_ ()
instance with one of it's elements having the structure like this::

    from django_jinja_knockout.viewmodels import vm_list
    # skipped ...

    class MyView(View):

        def post(self, request, *args, **kwargs):
            return vm_list([
                {
                    'view': 'add_received_message',
                    'text': 'Thanks, I am fine!'
                },
                {
                    'view': 'add_sent_message',
                    'text': 'How are you?'
                }
            ])

to have ``ajaxDialog`` instance ``.vm_addReceivedMessage()`` / ``.vm_addSentMessage()`` methods to be actually called.
Note that with viewmodels the server-side Django view may dynamically chose which client-side viewmodels will be
executed, the order of execution and their parameters like 'text' in this example.

.. highlight:: jinja

In case your AJAX POST button route contains kwargs / query parameters, you may use ``data-url`` html5 attribute
instead::

    <button class="btn btn-sm btn-success" data-url="{{
        tpl.reverseq('post_like', kwargs={'feed_id': feed.id}, query={'type': 'upvote'})
    }}">

Non-AJAX server-side invocation of client-side viewmodels
---------------------------------------------------------

Besides direct client-side invocation of viewmodels via `app.js`_ ``App.vmRouter.respond()`` method, and AJAX POST /
AJAX GET invocation via AJAX response routing, there are two additional ways to execute client-side viewmodels with
server-side invocation.

.. highlight:: python

Client-side viewmodels can be injected into generated HTML page and then executed when page DOM is loaded. It's
useful to prepare page / form templates which may require automated Javascript code applying, or to display
BootstrapDialog alerts / confirmations when the page is just loaded. For example to display confirmation dialog when the
page is loaded, you can override class-based view ``get()`` method like this::

    def get(self, request, *args, **kwargs):
        load_vm_list = request.template_context.onload_vm_list()
        load_vm_list.append({
            'view': 'confirm',
            'title': 'Please enter <i>your</i> personal data.',
            'message': 'After the registration our manager will contact <b>you</b> to validate your personal data.',
            'callback': [{
                'view': 'redirect_to',
                'url': '/homepage'
            }]
        })
        return super().get(self, request, *args, **kwargs)

Read more about :ref:`TemplateContext (djk context)`.

The second way of server-side invocation is similar to just explained one, but it stores client-side viewmodels in
current user session, making them persistent across requests. This allows to set initial page viewmodels during POST
or during redirect to another page (for example after login redirect) then display required viewmodels in the next
request::

    def set_session_viewmodels(request):
        last_message = Message.objects.last()
        # Custom viewmodel. Define it's handler at client-side with .add() method::
        # App.vmRouter.add('initial_views', function(viewModel) { ... });
        # // or:
        # App.vmRouter.add({'initial_views': {fn: myMethod, context: myClass}});
        view_model = {
            'view': 'initial_views'
        }
        if last_message is not None:
            view_model['message'] = {
                'title': last_message.title,
                'text': last_message.text
            }
        template_context = create_template_context(request)
        session_vm_list = template_context.onload_vm_list(request.session)
        idx, old_view_model = session_vm_list.find_by_kw(view='initial_views')
        if idx is not False:
            # Remove already existing 'initial_views' viewmodel, otherwise they will accumulate.
            # Normally it should not happen, but it's better to be careful.
            session_vm_list.pop(idx)
        if len(view_model) > 1:
            session_vm_list.append(view_model)

To inject client-side viewmodel when page DOM loads just once (function view)::

    onload_vm_list = create_template_context(request).onload_vm_list()
    onload_vm_list.append({'view': 'my_view'})

In CBV view, inherited from `GetPostMixin`_::

    onload_vm_list = self.request.template_context.onload_vm_list()
    onload_vm_list.append({'view': 'my_view'})

To inject client-side viewmodel when page DOM loads persistently in user session (function view)::

    session_vm_list = create_template_context(request).onload_vm_list(request.session)
    session_vm_list.append({'view': 'my_view'})

In CBV view, inherited from `GetPostMixin`_::

    session_vm_list = self.request.template_context.onload_vm_list(request.session)
    session_vm_list.append({'view': 'my_view'})

Require viewmodels handlers
---------------------------
.. highlight:: javascript

Sometimes there are many separate Javascript source files which define different viewmodel handlers. To assure that
required external source viewmodel handlers are immediately available, use `App.vmRouter`_ instance ``.req()`` method::

    App.vmRouter.req('field_error', 'carousel_images');

Nested / conditional execution of client-side viewmodels
--------------------------------------------------------
Nesting viewmodels via callbacks is available for automated conditional / event-based viewmodels execution. Example of
such approach is the implementation of ``'confirm'`` viewmodel in `app.js`_ ``App.Dialog.create()``::

    var self = this;
    var cbViewModel = this.dialogOptions.callback;
    this.dialogOptions.callback = function(result) {
        // @note: Do not use alert view as callback, it will cause stack overflow.
        if (result) {
            App.vmRouter.respond(cbViewModel);
        } else if (typeof self.dialogOptions.cb_cancel === 'object') {
            App.vmRouter.respond(self.dialogOptions.cb_cancel);
        }
    };

Asynchronous execution of client-side viewmodels
------------------------------------------------

There is one drawback of `vm_list`_: it is execution is synchronous and does not support promises by default. In some
complex arbitrary cases (for example one need to wait some DOM loaded first, then execute viewmodels), one may "save"
viewmodels received from AJAX response, then "restore" (execute) these later in another DOM event / promise handler.

`App.vmRouter`_ method ``.saveResponse()`` saves received viewmodels::

    App.vmRouter.add('popup_modal_error', function(viewModel, vmRouter) {
        // Save received response to execute it in the 'shown.bs.modal' event handler (see just below).
        vmRouter.saveResponse('popupModal', viewModel);
        // Open modal popup to show actual errors (received as viewModel from server-side).
        $popupModal.modal('show');
    });

`App.vmRouter`_ method ``loadResponse()`` executes viewmodels previously saved with ``.saveResponse()`` call::

    // Open modal popup.
    $popupModal.on('shown.bs.modal', function (ev) {
        // Execute viewmodels received in 'dialog_tooltip_error' viewmodel handler.
        App.vmRouter.loadResponse('popupModal');
    });

Multiple save points might be set by calling `App.vmRouter`_ ``.saveResponse()`` with the particular ``name`` argument
value, then calling `App.vmRouter`_ ``.loadResponse()`` with the matching ``name`` argument value.

.. _viewmodels_ajax_actions:

AJAX actions
------------
Since version 0.6.0, large classes of AJAX viewmodel handlers inherit from `ActionsView`_ at server-side and from
`App.Actions`_ at client-side, which utilize the same viewmodel handler for multiple actions. It allows to better
structurize AJAX code and to build the client-server AJAX interaction easily.

`ModelFormActionsView`_ and `KoGridView`_ inherit from `ActionsView`_, while client-side `App.ModelFormActions`_ and
`App.GridActions`_ inherit from `App.Actions`_. See (see :doc:`datatables`) for more info.

Viewmodel router defines own (our) viewmodel name as Python `ActionsView`_ class ``.viewmodel_name`` attribute /
Javascript `App.Actions`_ class ``.viewModelName`` property. By default it has value ``action`` but the derived classes
may change it's name; for example grid datatables use ``grid_page`` as the viewmodel name.

The viewmodels which have non-matching names are not processed by ``App.Actions`` directly. Instead, they are routed to
standard viewmodel handlers, added via `App.vmRouter`_ methods - see `Defining custom viewmodel handlers`_ section.
Such way standard built-in viewmodel handlers are not ignored. For example server-side exception reporting is done with
``alert_error`` viewmodel handler (`app.js`_), while AJAX form validation errors are produced via ``form_error``
viewmodel handler (`tooltips.js`_).

The difference between handling AJAX viewmodels with `App.vmRouter`_ (see `Defining custom viewmodel handlers`_) and
AJAX actions is that the later shares the same viewmodel handler by routing multiple actions to separate methods of
`App.Actions`_ class or it's descendant.

Custom actions at the server-side
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. highlight:: python

Server-side part of AJAX action with name ``edit_form`` is defined as `ModelFormActionsView`_ method
``action_edit_form``::

    def action_edit_form(self):
        obj = self.get_object_for_action()
        form_class = self.get_edit_form()
        form = form_class(instance=obj, **self.get_form_kwargs(form_class))
        return self.vm_form(
            form, verbose_name=self.render_object_desc(obj), action_query={'pk_val': obj.pk}
        )

This server-side action part generates AJAX html form, but it can be arbitrary AJAX data passed back to client-side via
one or multiple viewmodels.

To implement custom server-side actions, one has to inherit class-based view class from `ActionsView`_ or it's
descendants like `ModelFormActionsView`_ or `KoGridView`_ (see also :doc:`datatables`), then to define the action
via overriding ``.get_actions()`` method then defining ``action_my_action`` method of the inherited view. Here is
the example of defining two custom actions, ``save_equipment`` and ``add_equipment`` at the server-side::

    class ClubEquipmentGrid(KoGridView):

        def get_actions(self):
            actions = super().get_actions()
            actions['built_in']['save_equipment'] = {}
            actions['iconui']['add_equipment'] = {
                'localName': _('Add club equipment'),
                'css': 'iconui-wrench',
            }
            return actions

        # Creates AJAX ClubEquipmentForm bound to particular Club instance.
        def action_add_equipment(self):
            club = self.get_object_for_action()
            if club is None:
                return vm_list({
                    'view': 'alert_error',
                    'title': 'Error',
                    'message': 'Unknown instance of Club'
                })
            equipment_form = ClubEquipmentForm(initial={'club': club.pk})
            # Generate equipment_form viewmodel
            vms = self.vm_form(
                equipment_form, form_action='save_equipment'
            )
            return vms

        # Validates and saves the Equipment model instance via bound ClubEquipmentForm.
        def action_save_equipment(self):
            form = ClubEquipmentForm(self.request.POST)
            if not form.is_valid():
                form_vms = vm_list()
                self.add_form_viewmodels(form, form_vms)
                return form_vms
            equipment = form.save()
            club = equipment.club
            club.last_update = timezone.now()
            club.save()
            # Instantiate related EquipmentGrid to use it's .postprocess_qs() method
            # to update it's row via grid viewmodel 'prepend_rows' key value.
            equipment_grid = EquipmentGrid()
            equipment_grid.request = self.request
            equipment_grid.init_class()
            return vm_list({
                'update_rows': self.postprocess_qs([club]),
                # return grid rows for client-side EquipmentGrid component .updatePage(),
                'equipment_grid_view': {
                    'prepend_rows': equipment_grid.postprocess_qs([equipment])
                }
            })

Note that the ``form_action`` argument of ``vm_form()`` method overrides default action name for the generated form.

See the complete example: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/club_app/views_ajax.py

The execution path of the action
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. highlight:: javascript

The execution of action usually is initiated in the browser via the DOM event / knockout.js binding or is programmatically
invoked in Javascript via the `App.Actions`_ inherited class ``perform`` method::

    var myActions = new App.MyActions({
        route: 'my-action-view',
        actions: {
            'my_action': {},
        }
    });
    myActions.perform('my_action', actionOptions, ajaxCallback)

``actionOptions`` and ``ajaxCallback`` arguments are the optional ones.

See `Client-side routes`_ how to define ``my-action-view`` route at the server-side.

In case there is ``perform_my_action`` method defined in ``App.MyActions`` Javascript class, it will be called first.

If there is no ``perform_my_action`` method defined, ``.ajax()`` method will execute AJAX POST request with options /
queryargs to the Django url ``my-action-view`` with optional arguments, provided via ``actionOptions`` parameter and
optionally set via ``queryargs__my_action`` method when available.

Django ``MyActionsView`` view class should have ``my_action`` action defined in such case
(`Custom actions at the server-side`_).

Custom ``perform_my_action`` method could execute some client-side Javascript code first then call ``.ajax()`` method
manually to execute Django view code, or just perform a pure client-side action only.

In case ``App.MyActions`` class ``.ajax()`` method was called, the resulting viewmodel will be passed to
``App.MyActions`` class ``callback_my_action`` method, in case it's defined in custom derived ``App.MyActions``. That
makes the chain of AJAX action complete.

Overriding action callback
~~~~~~~~~~~~~~~~~~~~~~~~~~

.. highlight:: python

The possible interpretation of the the server-side `ActionsView`_ class ``action_my_action`` method result
(AJAX response):

* ``None`` - the default client-side `App.Actions`_ class ``callback_my_action`` method will be called, no arguments
  passed to it except the default ``viewmodel_name``;
* ``False`` - the default client-side `App.Actions`_ class ``callback_my_action`` will be suppressed, not called at all;
* ``list`` / ``dict`` - the result will be converted to `vm_list`_; in case the viewmodel ``view`` key is omitted or
  contains the default ``self.viewmodel_name`` value, the default client-side `App.Actions`_ class ``callback_my_action``
  method will be called, the rest of viewmodels (if any) will be processed by the `App.vmRouter`_;
* `special case`: override callback method by routing to another `App.Actions`_ class ``callback_another_action``
  instead of the default callback by providing `callback_action`_ key with the value ``another_action`` in the
  viewmodel dict response. For example to conditionally "redirect" to another action callback for ``edit_inline``
  action in a `KoGridView`_ derived class::

    def action_edit_inline(self):
        # Use qs = self.get_queryset_for_action() in case multiple objects are selected in the datatable.
        obj = self.get_object_for_action()
        if obj.is_editable:
            if obj.is_invalid:
                return {
                    'view': 'alert_error',
                    'title': obj.get_str_fields(),
                    'message': tpl.format_html('<div>Invalid object={}</div>', obj.pk)
                }
            else:
                title = obj.get_str_fields()
                # App.MyAction.callback_read_only_object() will be called instead of the default
                # App.MyAction.callback_edit_inline() with this dict viewmodel as the argument.
                return {
                    'callback_action': 'read_only_object',
                    'title': title,
                }
        else:
            return super().action_edit_inline()


Custom actions at the client-side
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. highlight:: javascript

To implement or to override client-side processing of AJAX action response, one should define custom Javascript class,
inherited from `App.Actions`_ (or from `App.GridActions`_ in case of custom grid datatables)::

    App.MyModelFormActions = function(options) {
        $.inherit(App.Actions.prototype, this);
        this.init(options);
    };

Client-side part of ``edit_form`` action response, which receives AJAX viewmodel(s) response is defined as::

    (function(MyModelFormActions) {

        MyModelFormActions.callback_edit_form = function(viewModel) {
            viewModel.owner = this.grid;
            var dialog = new App.ModelFormDialog(viewModel);
            dialog.show();
        };

        // ... See more sample methods below.

    })(App.MyModelFormActions.prototype);

Client-side `App.Actions`_ descendant classes can optionally add queryargs to AJAX HTTP request in a custom
``queryargs_ACTION_NAME`` method::

    MyFormActions.queryargs_edit_form = function(options) {
        // Add a custom queryarg to AJAX POST:
        options['myArg'] = 1;
    };

Client-side `App.Actions`_ descendant classes can directly process actions without calling AJAX viewmodel server-side
part (client-only actions) by defining ``perform_ACTION_NAME`` method::

    MyFormActions.perform_edit_form = function(queryArgs, ajaxCallback) {
        // this.owner may be instance of App.ko.Grid or another class which implements proper owner interface.
        new App.ActionTemplateDialog({
            template: 'my_form_template',
            owner: this.owner,
        }).show();
    };

.. highlight:: jinja

For such client-only actions ``App.ActionTemplateDialog`` utilizes underscore.js templates for one-way binding, or
knockout.js templates when two way binding is required. Here is the sample template ::

    <script type="text/template" id="my_form_template">
        <card-default>
            <card-body>
                <form class="ajax-form" enctype="multipart/form-data" method="post" role="form" data-bind="attr: {'data-url': actions.getLastActionUrl()}">
                    <input type="hidden" name="csrfmiddlewaretoken" data-bind="value: getCsrfToken()">
                    <div class="jumbotron">
                        <div class="default-padding">
                            This is the sample template. Copy this template with another id then add your MVVM fields here.
                        </div>
                    </div>
                </form>
            </card-body>
        </card-default>
    </script>

.. highlight:: javascript

Custom grid actions should inherit from both ``App.GridActions`` and it's base class ``App.Actions``::

    App.MyGridActions = function(options) {
        $.inherit(App.GridActions.prototype, this);
        $.inherit(App.Actions.prototype, this);
        this.init(options);
    };

For more detailed example of using viewmodel actions routing, see see :doc:`datatables` section
:ref:`datatables_client_side_action_routing`. Internally, AJAX actions are used by `App.EditForm`_, `App.EditInline`_
and by `App.ko.Grid`_ client-side components. See also `App.EditForm usage`_ in ``djk-sample`` project.
