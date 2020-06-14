.. _app.js: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/static/djk/js/app.js
.. _App.Actions: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=App.Actions(&type=&utf8=%E2%9C%93
.. _App.ActionTemplateDialog: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=ActionTemplateDialog
.. _App.components: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=App.components&utf8=%E2%9C%93
.. _App.destroyTooltipErrors: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=App.destroyTooltipErrors&type=&utf8=%E2%9C%93
.. _App.EditForm: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=editform&type=&utf8=%E2%9C%93
.. _App.EditForm usage: https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=EditForm
.. _App.EditInline: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=editinline&type=&utf8=%E2%9C%93
.. _App.ViewModelRouter.applyHandler(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=applyHandler
.. _App.ViewModelRouter.filterExecuted(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=filterExecuted
.. _App.vmRouter: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=App.vmRouter&type=&utf8=%E2%9C%93
.. _App.ko.Grid: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/static/djk/js/grid.js
.. _ActionsView: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=ActionsView&type=&utf8=%E2%9C%93
.. _App.ModelFormActions: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=App.ModelFormActions&type=&utf8=%E2%9C%93
.. _callback_action: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=callback_action
.. _club-grid.js: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/djk_sample/static/js/club-grid.js
.. _ViewmodelView: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=ViewmodelView&type=Code
.. _KoGridView: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=KoGridView&type=&utf8=%E2%9C%93
.. _App.GridActions: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=App.GridActions&type=&utf8=%E2%9C%93
.. _ModelFormActionsView: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=ModelFormActionsView&type=&utf8=%E2%9C%93
.. _PageContext.onload_vm_list(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=onload_vm_list
.. _tooltips.js: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/static/djk/js/tooltips.js
.. _viewmodel_name: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=viewmodel_name
.. _vm_list: https://github.com/Dmitri-Sintsov/djk-sample/search?l=Python&q=vm_list&type=&utf8=%E2%9C%93
.. _vm_list.find_by_kw(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=find_by_kw


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

Now, how to execute these viewmodels we defined actually? At Javascript side it's a simple call (since version 0.7.0)::

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

    // viewmodel bind context with method
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
    // Will execute all four handlers attached above with passed viewmodel argument:
    App.vmRouter.exec('my_view', {'a': 1, 'b': 2});
    // ...
    // Unsubscribe handlers. The order is arbitrary.
    App.vmRouter.removeHandler('my_view', {fn: App.MyClass.prototype.myMethod2, context: App.myClassInstance})
        .removeHandler('my_view', myFunc)
        .removeHandler('my_view', handler)
        .removeHandler('my_view', 'App.MyClass');

Javascript bind context
~~~~~~~~~~~~~~~~~~~~~~~
The bind context is used when the viewmodel response is processed. It is used by ``add()`` / ``addHandler()`` viewmodel
router methods and as well as `AJAX actions`_ callback.

The following types of context arguments of  are available:

* unbound function: subscribe viewmodel to that function;
* plain object with optional ``fn`` and ``context`` arguments: to subscribe to bound method;
* string: Javascript class name to instantiate;

See `App.ViewModelRouter.applyHandler()`_ for the implementation details.

Viewmodel data format
~~~~~~~~~~~~~~~~~~~~~

Key ``'view'`` of each Javascript object / Python dict in the list specifies the value of ``viewmodel name``, that is
bound to particular Javascript ``viewmodel handler``. The viewmodel itself is used as the Javascript object argument of
each particular ``viewmodel handler`` with the corresponding keys and their values. The following built-in viewmodel
names currently are available in `app.js`_ (since version 0.7.0)::

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

Automatic AJAX POST is available with ``post`` viewmodel and even an AJAX callback is not required for POST because each
``post`` viewmodel AJAX response will be interpreted (routed) as the list of viewmodels - making chaining / nesting of
HTTP POSTs easily possible.

There are class-based `AJAX actions`_ available, which allow to bind multiple methods of the Javascript class instance
to single viewmodel handler: to perform multiple actions bound to the one viewmodel name.

Defining custom viewmodel handlers
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

One may add custom viewmodel handlers via Javascript plugins to define new actions. See `tooltips.js`_ for the
additional bundled viewmodel names and their viewmodel handlers::

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
``viewmodel``. This instance of `App.vmRouter`_ could be used to call another viewmodel handler inside the current
handler, or to add / remove handlers via calling vmRouter instance methods::

    App.vmRouter.add('my_view1', function(viewModel, vmRouter) {
        // dynamically add 'my_view2' viewmodel handler when 'my_view1' handler is executed:
        vmRouter.add('my_view2', function(viewModelNested, vmRouter) {
            // will receive argument viewModelNested == {'a': 1, 'b': 2}}
            // execute viewModelNested here...
        });
        // ... skipped ...
        // nested execution of 'my_view2' viewmodel from 'my_view1' handler:
        vmRouter.exec('my_view2', {'a': 1, 'b': 2});
    });

New properties might be added to viewmodel for further access, like ``.instance`` property which holds an instance of
``App.FieldPopover`` in the following code::

    App.vmRouter.add('tooltip_error', function(viewModel) {
        // Adding .instance property at the client-side to server-side generated viewModel:
        viewModel.instance = new App.FieldPopover(viewModel);
    });

Every already executed viewmodel is stored in ``.executedViewModels`` property of `App.vmRouter`_ instance, which may be
processed later. An example of such processing is `App.destroyTooltipErrors`_ static method, which clears form input
Bootstrap tooltips previously set by ``'tooltip_error'`` viewmodel handler then removes these viewmodels from
``.executedViewModels`` list via `App.ViewModelRouter.filterExecuted()`_ method::

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
        vmRouter.exec('tooltip_error', viewModel);
        // or, to preserve the bound context (if any):
        vmRouter.exec('tooltip_error', viewModel, this);
    });

where newly defined handler ``popover_error`` executes already existing ``tooltip_error`` viewmodel handler to re-use
it's code.

The purpose of passing ``this`` bind context as an optional third argument of ``vmRouter.exec()`` call is to preserve
currently passed Javascript bind context.

AJAX response routing
---------------------

.. highlight:: html

When one develops mixed web application with traditional server-side generated html responses but also having lots of
AJAX interaction, with tradidional approach, the developer would have to write a lot of boilerplate code, like this,
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
2. Repeated boilerplate code with ``$.post()`` numerous arguments, including manual specification ``$.post()`` arguments.
3. Route url names are hardcoded into client-side Javascript, instead of being supplied from Django server-side. If one
   changes an url of route in ``urls.py``, and forgets to update url path in Javascript code, AJAX POST will fail.
4. What if the AJAX response should have finer control over client-side response? For example, sometimes you need
   to open ``BootstrapDialog``, sometimes to redirect instead, sometimes to perform a custom client-side action for the
   same HTTP POST url?

.. highlight:: html

Enter client-side viewmodels response routing: to execute AJAX post via button click, the following Jinja2 template
code will be enough::

    <button class="button btn btn-default" data-route="button-click">
        Save your form template
    </button>

.. highlight:: python

`app.js`_ will care itself of setting Javascript event handler, performing AJAX request POST, then AJAX response routing
will execute viewmodels returned from Django view. Define the view path in project ``urls.py``::

    from my_app.views import button_click
    # ...
    url(r'^button-click/$', button_click, name='button-click', kwargs={'is_anonymous': True}),

.. _viewmodels_client_side_routes:

Client-side routes
~~~~~~~~~~~~~~~~~~
Let's implement the view. Return the list of viewmodels which will be returned via button click in my_app/views.py::

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

Register AJAX client-side route (url name) in ``settings.py``, to make url available in `app.js`_ Javascript::

    DJK_CLIENT_ROUTES = {
        # True means that the 'button-click' url will be available to anonymous users:
        ('button-click', True),
    }

Register ``button-click`` url mapped to my_app.views.button_click in your ``urls.py``::

    from my_app.views import button_click
    # ...
    url(r'^button-click/$', button_click, name='button-click', 'allow_anonymous': True, 'is_ajax': True}),

That's all.

Django view that processes ``button-click`` url (route) returns standard client-side viewmodels only, so it does not
even require to modify a single bit of built-in Javascript code. To execute custom viewmodels, one would have to register
their handlers in Javascript (see `Defining custom viewmodel handlers`_).

It is possible to specify client-side routes per view, not having to define them globally in template context processor::

    from django_jinja_knockout.views import create_page_context

    def my_view(request):
        create_page_context(request).add_client_routes({
            'club_detail',
            'member_grid',
        })

or via decorator::

    from django.shortcuts import render
    from django_jinja_knockout.views import page_context_decorator

    @page_context_decorator(client_routes={
            'club_detail',
            'member_grid',
    })
    def my_view(request):
        # .. skipped ..
        return render(request, 'sample_template.htm', {'sample': 1})

and per class-based view::

    class MyGridView(KoGridView):

        client_routes = {
            'my_grid_url_name'
        }

.. highlight:: javascript

It is possible to specify view handler function bind context via ``.add()`` method optional argument::

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

        AjaxDialog.receiveMessages = function() {
            /**
             * When AJAX response will contain one of 'add_received_message' / 'add_sent_message' viewmodels,
             * currently bound instance of App.AjaxDialog passed via App.post() this argument
             * methods .vm_addReceivedMessage() / .vm_addSentMessage() will be called:
             */
            App.post('my_url_name', this.postData, this);
        };

        // Subscribe to 'add_received_message' / 'add_sent_message' custom viewmodel handlers:
        App.vmRouter.add({
            'add_received_message': AjaxDialog.vm_addReceivedMessage,
            'add_sent_message': AjaxDialog.vm_addSentMessage,
        });

    })(App.AjaxDialog.prototype);

    var ajaxDialog = new App.AjaxDialog(options);
    ajaxDialog.receiveMessages();

.. highlight:: python

Django ``MyView`` mapped to ``'my_url_name'`` (see :ref:`installation_context-processor`) should return `vm_list`_ ()
instance with one of it's elements having the structure like this::

    from django.views import View
    from django_jinja_knockout.viewmodels import vm_list
    # skipped ...

    class MyView(View):

        def post(self, request, *args, **kwargs):
            return vm_list([
                {
                    # Would call .vm_addReceivedMessage() of Javascript ajaxDialog instance with 'text' argument:
                    'view': 'add_received_message',
                    'text': 'Thanks, I am fine!'
                },
                {
                    # Would call .vm_addSentMessage() of Javascript ajaxDialog instance with 'text' argument:
                    'view': 'add_sent_message',
                    'text': 'How are you?'
                }
            ])

to have ``ajaxDialog`` instance ``.vm_addReceivedMessage()`` / ``.vm_addSentMessage()`` methods to be actually called.
Note that with viewmodels the server-side Django view may dynamically decide which client-side viewmodels will be
executed, the order of their execution and their arguments like the value of 'text' dict key in this example.

.. highlight:: jinja

In case AJAX POST button route contains kwargs / query parameters, one may use ``data-url`` html5 attribute instead
of ``data-route``::

    <button class="btn btn-sm btn-success" data-url="{{
        tpl.reverseq('post_like', kwargs={'feed_id': feed.id}, query={'type': 'upvote'})
    }}">

Non-AJAX server-side invocation of client-side viewmodels
---------------------------------------------------------

Besides direct client-side invocation of viewmodels via `app.js`_ ``App.vmRouter.respond()`` method, and AJAX POST /
AJAX GET invocation via AJAX response routing, there are two additional ways to execute client-side viewmodels with
server-side invocation:

.. highlight:: python

Client-side viewmodels can be injected into generated HTML page and then executed when page DOM is loaded. It's
useful to prepare page / form templates which may require automated Javascript code applying, or to display
BootstrapDialog alerts / confirmations when the page is just loaded. For example to display confirmation dialog when the
page is loaded, you can override class-based view ``get()`` method like this::

    from django_jinja_knockout.views ViewmodelView

    class MyView(ViewmodelView):

        def get(self, request, *args, **kwargs):
            load_vm_list = self.page_context.onload_vm_list('client_data')
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

Read more about :ref:`PageContext (page_context)`.

The second way of server-side viewmodels invocation is similar to just explained one. It stores client-side viewmodels
in the current user session, making them persistent across requests. This allows to set initial page viewmodels after
HTTP POST or after redirect to another page (for example after login redirect), to display required viewmodels in the
next request::

    def set_session_viewmodels(request):
        last_message = Message.objects.last()
        # Custom viewmodel. Define it's handler at client-side with .add() method::
        # App.vmRouter.add('session_view', function(viewModel) { ... });
        # // or:
        # App.vmRouter.add({'session_view': {fn: myMethod, context: myClass}});
        view_model = {
            'view': 'session_view'
        }
        if last_message is not None:
            view_model['message'] = {
                'title': last_message.title,
                'text': last_message.text
            }
        page_context = create_page_context(request)
        session_vm_list = page_context.onload_vm_list(request.session)
        # Find whether 'session_view' viewmodel is already stored in HTTP session vm_list:
        idx, old_view_model = session_vm_list.find_by_kw(view='session_view')
        if idx is not False:
            # Remove already existing 'session_view' viewmodel, otherwise they will accumulate.
            # Normally it should not happen, but it's better to be careful.
            session_vm_list.pop(idx)
        if len(view_model) > 1:
            session_vm_list.append(view_model)

To inject client-side viewmodel when page DOM loads just once (function view)::

    onload_vm_list = create_page_context(request).onload_vm_list('client_data')
    onload_vm_list.append({'view': 'my_view'})

In CBV view, inherited from `ViewmodelView`_::

    onload_vm_list = self.page_context.onload_vm_list('client_data')
    onload_vm_list.append({'view': 'my_view'})

To inject client-side viewmodel when page DOM loads persistently in user session (function view)::

    session_vm_list = create_page_context(request).onload_vm_list(request.session)
    session_vm_list.append({'view': 'my_view'})

In CBV view, inherited from `ViewmodelView`_::

    session_vm_list = self.page_context.onload_vm_list(request.session)
    session_vm_list.append({'view': 'my_view'})

See `PageContext.onload_vm_list()`_ and `vm_list.find_by_kw()`_ for the implementation details.

Require viewmodels handlers
---------------------------
.. highlight:: javascript

Sometimes there are many separate Javascript source files which define different viewmodel handlers. To assure that
required external source viewmodel handlers are immediately available, use `App.vmRouter`_ instance ``.req()`` method::

    App.vmRouter.req('field_error', 'carousel_images');

Nested / conditional execution of client-side viewmodels
--------------------------------------------------------
Nesting viewmodels via callbacks is available for automated conditional / event subscribe viewmodels execution. Example
of such approach is the implementation of ``'confirm'`` viewmodel in `app.js`_ ``App.Dialog`` callback via
``App.vmRouter.respond()`` method conditionally processing returned viewmodels::

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

There is one drawback of using `vm_list`_: it is execution is synchronous and does not support promises by default.
In some complex cases, for example when one needs to wait for some DOM loaded first, then to execute viewmodels, one may
"save" viewmodels received from AJAX response, then "restore" (execute) these later in another DOM event / promise
handler.

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
        // Execute viewmodels previously received in 'popup_modal_error' viewmodel handler.
        App.vmRouter.loadResponse('popupModal');
    });

Multiple save points might be set by calling `App.vmRouter`_ ``.saveResponse()`` with the particular ``name`` argument
value, then calling `App.vmRouter`_ ``.loadResponse()`` with the matching ``name`` argument value.

.. _viewmodels_ajax_actions:

AJAX actions
------------
Large classes of AJAX viewmodel handlers inherit from `ActionsView`_ at server-side and from `App.Actions`_ at
client-side, which utilize the same viewmodel handler for multiple actions. It allows to structurize AJAX code and to
build the client-server AJAX interaction more easily.

`ModelFormActionsView`_ and `KoGridView`_ inherit from `ActionsView`_, while client-side `App.ModelFormActions`_ and
`App.GridActions`_ inherit from `App.Actions`_. See :doc:`datatables` for more info.

Viewmodel router defines own (our) viewmodel name as Python `ActionsView`_ class `viewmodel_name`_ attribute /
Javascript `App.Actions`_ class ``.viewModelName`` property. By default it has the value ``action`` but the derived
classes may change it's name; for example grid datatables use ``grid_page`` as the viewmodel name.

Viewmodels which have non-matching names are not processed by ``App.Actions`` directly. Instead, they are routed to
standard viewmodel handlers, added via `App.vmRouter`_ methods - see `Defining custom viewmodel handlers`_ section.
Such way standard built-in viewmodel handlers are not ignored. For example server-side exception reporting is done with
``alert_error`` viewmodel handler (see `app.js`_), while AJAX form validation errors are processed via ``form_error``
viewmodel handler (see `tooltips.js`_).

The difference between handling AJAX viewmodels with `App.vmRouter`_ (see `Defining custom viewmodel handlers`_) and
AJAX actions is that the later shares the same viewmodel handler by routing multiple actions to methods of
`App.Actions`_ class or it's descendant class.

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

To implement custom server-side actions, one has to:

* Inherit class-based view class from `ActionsView`_ or it's descendants like `ModelFormActionsView`_ or `KoGridView`_
  (see also :doc:`datatables`)
* Define the action by overriding the view class ``.get_actions()`` method
* Implement ``action_my_action`` method of the view class, which usually would return action viewmodel(s).

Here is the example of defining two custom actions, ``save_equipment`` and ``add_equipment`` at the server-side::

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

Note that ``form_action`` argument of the ``.vm_form()`` method overrides default action name for the generated form.

See the complete example: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/club_app/views_ajax.py

The execution path of the action
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. highlight:: javascript

The execution of action usually is initiated in the browser via the :ref:`clientside_components` DOM event / Knockout.js
binding handler, or is programmatically invoked in Javascript via the `App.Actions`_ inherited class ``.perform()``
method::

    App.ClubActions = function(options) {
        // Comment out, when overriding App.ko.Grid actions.
        // $.inherit(App.GridActions.prototype, this);
        $.inherit(App.Actions.prototype, this);
        this.init(options);
    };

    var clubActions = new App.ClubActions({
        route: 'club_actions_view',
        actions: {
            'review_club': {},
        }
    });
    var actionOptions = {'club_id': 1};
    var ajaxCallback = function(viewmodel) {
        console.log(viewmodel);
        // process viewmodel...
    };
    clubActions.perform('review_club', actionOptions, ajaxCallback);

``actionOptions`` and ``ajaxCallback`` arguments are the optional ones.

* In case there is ``perform_review_club()`` method defined in ``App.ClubActions`` Javascript class, it will be called
  first.

* If there is no ``perform_review_club()`` method defined, ``.ajax()`` method will be called, executing AJAX POST request
  with ``actionOptions`` value becoming the queryargs to the Django url ``club_actions_view``.

  * In such case, Django ``ClubActionsView`` view class should have ``review_club`` action defined
    (see `Custom actions at the server-side`_).

  * Since v0.9.0 ``ajaxCallback`` argument accepts `Javascript bind context`_ as well as viewmodel ``before`` and
    ``after`` callbacks, to define custom viewmodel handlers on the fly::

       var self = this;
       App.clubActions.ajax(
            'member_names',
            {
                club_id: this.club.id,
            },
            {
                // 'set_members' is a custom viewmodel handler defined on the fly:
                after: {
                    set_members: function(viewModel) {
                        self.setMemberNames(viewModel.users);
                    },
                }
            }
       );

       App.clubActions.ajax(
            'member_roles',
            {
                club_id: this.club.id,
            },
            // viewmodel response will be returned to the bound method App.clubRolesEditor.updateMemberRoles():
            {
                context: App.clubRolesEditor,
                fn: App.ClubRolesEditor.updateMemberRoles,
            }
       );

* Note: ``actionOptions`` value may be dynamically altered / generated via optional ``queryargs_review_club()`` method in
  case it's defined in ``App.ClubActions`` class.

* Custom ``perform_review_club()`` method could execute some client-side Javascript code first then call ``.ajax()``
  method manually to execute Django view code, or just perform a pure client-side action only.

* In case ``App.ClubActions`` class ``.ajax()`` method was called, the resulting viewmodel will be passed to
  ``App.ClubActions`` class ``callback_review_club()`` method, in case it's defined. That makes the execution chain of
  AJAX action complete.

See `Client-side routes`_ how to make ``club_actions_view`` Django view name (route) available in Javascript.

See `club-grid.js`_ for sample overriding of ``App.ko.Grid`` actions. See :doc:`datatables` for more info.

Overriding action callback
~~~~~~~~~~~~~~~~~~~~~~~~~~

.. highlight:: python

Possible interpretation of server-side `ActionsView`_ class ``.action\*()`` method (eg ``.action_perform_review()``)
result (AJAX response):

* ``None`` - client-side `App.Actions`_ class ``.callback_perform_review()`` method will be called, no arguments passed
  to it except the default `viewmodel_name`_;
* ``False`` - client-side `App.Actions`_ class ``.callback_perform_review()`` will be suppressed, not called at all;
* ``list`` / ``dict`` - the result will be converted to `vm_list`_

  * In case the viewmodel ``view`` key is omitted or contains the default Django view `viewmodel_name`_ attribute value,
    the default client-side `App.Actions`_ class ``.callback_perform_review()`` method will be called;
  * The rest of viewmodels (if any) will be processed by the `App.vmRouter`_;

* `special case`: override callback method by routing to ``another_action`` Javascript `App.Actions`_ class
  ``.callback_another_action()`` method by providing `callback_action`_ key with the value ``another_action`` in the
  viewmodel dict response.

  For example to conditionally "redirect" to ``show_readonly`` action callback for ``edit_inline`` action in a
  `KoGridView`_ derived class::

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
                # App.Action.callback_show_readonly() will be called instead of the default
                # App.Action.callback_edit_inline() with the following viewmodel as the argument.
                return {
                    'callback_action': 'show_readonly',
                    'title': title,
                }
        else:
            return super().action_edit_inline()


Custom actions at the client-side
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. highlight:: javascript

To implement or to override client-side processing of AJAX action response, one should define custom Javascript class,
inherited from `App.Actions`_ (or from `App.GridActions`_ in case of custom grid :doc:`datatables`)::

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
            meta: {
                user_id: queryArgs.user_id,
            },
        }).show();
    };

.. highlight:: XML

For such client-only actions `App.ActionTemplateDialog`_ utilizes Underscore.js templates for one-way binding, or
Knockout.js templates when two way binding is required. Here is the sample template ::

    <script type="text/template" id="my_form_template">
        <card-default>
            <card-body>
                <form class="ajax-form" enctype="multipart/form-data" method="post" role="form" data-bind="attr: {'data-url': actions.getLastActionUrl()}">
                    <input type="hidden" name="csrfmiddlewaretoken" data-bind="value: getCsrfToken()">
                    <div class="jumbotron">
                        <div class="default-padding">
                            The user id is <span data-bind="text: meta.user_id"></span>
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

For more detailed example of using viewmodel actions routing, see the documentation :doc:`datatables` section
:ref:`datatables_client_side_action_routing`. Internally, AJAX actions are used by `App.EditForm`_, `App.EditInline`_
and by `App.ko.Grid`_ client-side components. See also `App.EditForm usage`_ in ``djk-sample`` project.
