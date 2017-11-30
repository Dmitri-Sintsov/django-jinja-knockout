.. _app.js: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/static/djk/js/app.js
.. _App.Actions: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=App.Actions&type=&utf8=%E2%9C%93
.. _App.components: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=App.components&utf8=%E2%9C%93
.. _App.destroyTooltipErrors: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=App.destroyTooltipErrors&type=&utf8=%E2%9C%93
.. _App.EditForm: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=app.editform&type=&utf8=%E2%9C%93
.. _App.EditForm usage: https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=App.EditForm
.. _App.EditInline: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=app.editinline&type=&utf8=%E2%9C%93
.. _App.vmRouter: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=App.vmRouter&type=&utf8=%E2%9C%93
.. _App.ko.Grid: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/static/djk/js/ko-grid.js
.. _ActionsView: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=ActionsView&type=&utf8=%E2%9C%93
.. _App.ModelFormActions: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=JavaScript&q=App.ModelFormActions&type=&utf8=%E2%9C%93
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
        .addFn('my_view', App.MyClass.prototype.myMethod2, App.myClassInstance)
    // Subscribe to unbound function:
        .addFn('my_view', myFunc)
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

    App.vmRouter.addFn('my_view', function(viewModel, vmRouter) {
        // execute viewmodel here...
    })
        .addHandler('my_view2', {fn: App.MyClass.prototype.method, context: MyClassInstance})
        .addHandler('my_view3', 'App.MyClass');
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

    App.vmRouter.addFn('my_view1', function(viewModel, vmRouter) {
        vmRouter.addFn('my_view2', function(viewModelNested, vmRouter) {
            // viewModelNested == {'a': 1, 'b': 2}}
            // execute viewModelNested here...
        });
        // ... skipped ...
        vmRouter.exec('my_view2', {'a': 1, 'b': 2});
    });

Note that new properties might be added to viewmodel for further access, like ``.instance`` property which holds an
instance of ``App.FieldPopover`` in the following code::

    App.vmRouter.addFn('tooltip_error', function(viewModel) {
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

    App.vmRouter.addFn('popover_error', function(viewModel, vmRouter) {
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

    <button class="button btn btn-default" data-route="my_url_name">
        Save your form template
    </button>

.. highlight:: python

`app.js`_ will care itself of setting Javascript event handler, performing AJAX request POST and AJAX response routing
will execute viewmodels returned from Django view. If you want to ensure AJAX requests, just set your ``urls.py`` route
kwargs key ``is_ajax`` to ``True`` (optional step)::

    url(r'^button-click/$', 'my_app.views.button_click', name='my_url_name', kwargs={'ajax': True}),

register AJAX client-side route (url name) in ``context_processors.py``::

    from django_jinja_knockout.context_processors import TemplateContextProcessor as BaseContextProcessor


    class TemplateContextProcessor(BaseContextProcessor):

        CLIENT_ROUTES = (
            ('my_url_name', True),
        )


    def template_context_processor(HttpRequest=None):
        return TemplateContextProcessor(HttpRequest).get_context_data()

and return the list of viewmodels in my_app/views.py::

    from django_jinja_knockout.viewmodels import vm_list

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

that's all.

If your Django view which maps to ``'my_url_name'`` returns standard client-side viewmodels only, just like in the
example above, you do not even have to modify a single bit of your Javascript code!

Since version 0.2.0, it is possible to specify client-side routes per view, not having to define them globally
in template context processor::

    def my_view(request):
        request.client_routes.extend([
            'my_url_name'
        ])

and per class-based view::

    class MyGridView(KoGridView):

        client_routes = [
            'my_grid_url_name'
        ]

.. highlight:: javascript

Also it is possible to specify view handler function bind context, specifying it via ``.addFn()`` / ``.addHandler()`` /
``.add()`` method argument::

    App.vmRouter.addFn('set_context_title', function(viewModel) {
        // this == bindContext
        this.setTitle(viewModel.title);
    }, bindContext);

    App.vmRouter.addHandler('set_context_title', {
        fn: function(viewModel) {
            // this == bindContext
            this.setTitle(viewModel.title);
        },
        context: bindContext
    });

    App.vmRouter.add({
        'set_context_title': {
            fn: function(viewModel) {
                // this == bindContext
                this.setTitle(viewModel.title);
            },
            context: bindContext
        },
        'set_context_name': {
            fn: function(viewModel) {
                // this == bindContext
                this.setName(viewModel.name);
            },
            context: bindContext
        }
    });

It is also possible to override the bindContext value for viewmodel handler dynamically with ``App.post()`` optional
``bindContext`` argument::

    App.post('my_url_name', post_data, bind_context);

That allows to use method prototypes bound to different instances of the same Javascript class::

    (function(MessagingDialog) {

        MessagingDialog.receivedMessages = [];
        MessagingDialog.sentMessages = [];

        MessagingDialog.vm_addReceivedMessage = function(viewModel, vmRouter) {
            this.receivedMessages.push(viewModel.text);
        };

        MessagingDialog.vm_addSentMessage = function(viewModel, vmRouter) {
            this.sentMessages.push(viewModel.text);
        };

        App.vmRouter.add({
            'add_received_message': MessagingDialog.vm_addReceivedMessage,
            'add_sent_message': MessagingDialog.vm_addSentMessage,
        });

    })(App.ko.MessagingDialog.prototype);


Django view mapped to ``'my_url_name'`` (see :doc:`installation`) should return `vm_list`_ () instance with one of it's
elements having the structure like this::

    [
        {
            'view': 'add_received_message',
            'text'; 'Thanks, I am fine!'
        },
        {
            'view': 'add_sent_message',
            'text'; 'How are you?'
        }
    ]

to have the viewmodel handler(s) above to be actually called.

.. highlight:: jinja

In case your AJAX POST button route contains kwargs / query parameters, you may use ``data-url`` html5 attribute
instead::

    <button class="btn btn-sm btn-success" data-url="{{
        tpl.reverseq('post_like', kwargs={'feed_id': feed.id}, query={'type': 'upvote'})
    }}">

Non-AJAX server-side invocation of client-side viewmodels.
----------------------------------------------------------

Besides direct client-side invocation of viewmodels via `app.js`_ ``App.viewResponse()`` method, and AJAX POST /
AJAX GET invocation via AJAX response routing, there are two additional ways to execute client-side viewmodels with
server-side invocation.

.. highlight:: python

Client-side viewmodels can be injected into generated HTML page and then executed when page DOM is loaded. It's
useful to prepare page / form templates which may require automated Javascript code applying, or to display
BootstrapDialog alerts / confirmations when the page is just loaded. For example to display confirmation dialog when the
page is loaded, you can override class-based view ``get()`` method like this::

    def get(self, request, *args, **kwargs):
        load_vm_list = onload_vm_list(request.client_data)
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

The second way of server-side invocation is similar to just explained one, but it stores client-side viewmodels in
current user session, making them persistent across requests. This allows to set initial page viewmodels during POST
or during redirect to another page (for example after login redirect) then display required viewmodels in the next
request::

    def set_session_viewmodels(request):
        last_message = Message.objects.last()
        # Custom viewmodel, requires App.addViewHandler('initial_views', function(viewModel) { ... }): at client-side.
        view_model = {
            'view': 'initial_views'
        }
        if last_message is not None:
            view_model['message'] = {
                'title': last_message.title,
                'text': last_message.text
            }
        session_vm_list = onload_vm_list(request.session)
        idx, old_view_model = session_vm_list.find_by_kw(view='initial_views')
        if idx is not False:
            # Remove already existing 'initial_views' viewmodel, otherwise they will accumulate.
            # Normally it should not happen, but it's better to be careful.
            session_vm_list.pop(idx)
        if len(view_model) > 1:
            session_vm_list.append(view_model)

To inject client-side viewmodel when page DOM loads just once::

    load_vm_list = onload_vm_list(request.client_data)
    load_vm_list.append({'view': 'my_view'})

To inject client-side viewmodel when page DOM loads persistently in user session::

    session_vm_list = onload_vm_list(request.session)
    session_vm_list.append({'view': 'my_view'})

Require viewmodels handlers
---------------------------
.. highlight:: javascript

Sometimes there are many separate Javascript source files which define different viewmodel handlers. To assure that
required external source viewmodel handlers are available, `app.js`_ provides ``App.requireViewHandlers()`` method::

    App.requireViewHandlers(['field_error', 'carousel_images']);

Nested / conditional execution of client-side viewmodels
--------------------------------------------------------
Nesting viewmodels as callbacks is available for automated conditional / event-based viewmodels execution. Example of
such approach is the implementation of ``'confirm'`` viewmodel in `app.js`_ ``App.Dialog.create()``::

    var cbViewModel = this.dialogOptions.callback;
    this.dialogOptions.callback = function(result) {
        // @note: Do not use alert view as callback, it will cause stack overflow.
        if (result) {
            App.viewResponse(cbViewModel);
        } else if (typeof self.dialogOptions.cb_cancel === 'object') {
            App.viewResponse(self.dialogOptions.cb_cancel);
        }
    };

Asynchronous execution of client-side viewmodels
------------------------------------------------

There is one drawback of `vm_list`_: it is execution is synchronous and does not support promises by default. In some
complex arbitrary cases (for example one need to wait some DOM loaded first, then execute viewmodels), one may "save"
viewmodels received from AJAX response, then "restore" (execute) these later in another DOM event / promise handler.

``App.saveResponse()`` saves received viewmodels::

    App.addViewHandler('popup_modal_error', function(viewModel) {
        // Save received response to execute it in the 'shown.bs.modal' event handler (see just below).
        App.saveResponse('popupModal', viewModel);
        // Open modal popup to show actual errors (received as viewModel from server-side).
        $popupModal.modal('show');
    });

``App.loadResponse()`` executes viewmodels previously saved with ``App.saveResponse()`` call::

    // Open modal popup.
    $popupModal.on('shown.bs.modal', function (ev) {
        // Execute viewmodels received in 'dialog_tooltip_error' viewmodel handler.
        App.loadResponse('popupModal');
    });

Multiple save points might be set by calling ``App.saveResponse()``with the particular ``name`` argument value, then
calling ``App.loadResponse()`` with the same ``name`` argument value.

.. _viewmodels_ajax_actions:

AJAX actions
------------
Since version 0.6.0, large classes of AJAX viewmodel handlers inherit from `ActionsView`_ at server-side and from
`App.Actions`_ at client-side, which utilize the same viewmodel handler for multiple actions. It allows to better
structurize AJAX code. `ModelFormActionsView`_ and `KoGridView`_ (see :doc:`grids`) inherit from `ActionsView`_, while
client-side `App.ModelFormActions`_ and `App.GridActions`_ (see :doc:`grids`) inherit from `App.Actions`_.

Viewmodel router defines own (our) viewmodel name as `ActionsView`_ ``.viewmodel_name`` Python attribute /
`App.Actions`_ ``.viewModelName`` Javascript property. By default it has value ``action`` but inherited classes may
change it's name; for example grid datatables use ``grid_page`` as viewmodel name.

The viewmodels which have different names are are not processed by ``App.Actions`` directly. Instead, they are routed to
standard viewmodel handlers, added with ``App.addViewHandler()`` - see `Defining custom viewmodel handlers`_ section.
Such way standard built-in viewmodel handlers are not ignored. For example server-side exception reporting is done with
``alert_error`` viewmodel handler (`app.js`_), while AJAX form validation errors with ``form_error`` viewmodel handler
(`tooltips.js`_).

.. highlight:: python

The difference between handling AJAX viewmodels with ``App.viewHandlers`` (see `Defining custom viewmodel handlers`_)
and AJAX actions is that the later shares the same viewmodel handler by routing multiple actions to separate methods
of `App.Actions`_ class or it's descendant.

For example, server-side part of AJAX action ``edit_form`` is defined as `ModelFormActionsView`_ method
``action_edit_form``::

    def action_edit_form(self):
        obj = self.get_object_for_action()
        form_class = self.get_edit_form()
        form = form_class(instance=obj, **self.get_form_kwargs(form_class))
        return self.vm_form(
            form, verbose_name=self.render_object_desc(obj), action_query={'pk_val': obj.pk}
        )

This server-side action part generates AJAX html form, but it can be arbitrary AJAX data passed back to client-side as
one or multiple viewmodels.

.. highlight:: javascript

To implement or to override client-side processing of AJAX action response, one should implement custom Javascript
class, inherited from `App.Actions`_ (or from `App.GridActions`_ in case of custom grid datatables)::

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

Client-side `App.Actions`_ descendant classes can optionally add queryargs to AJAX HTTP request with
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

For such client-only actions ``App.ActionTemplateDialog`` utilizes underscore.js or knockout.js (when two way binding is
required) template like this::

    <script type="text/template" id="my_form_template">
        <div class="panel panel-default">
            <div class="panel-body">
                <form class="ajax-form" enctype="multipart/form-data" method="post" role="form" data-bind="attr: {'data-url': actions.getLastActionUrl()}">
                    <input type="hidden" name="csrfmiddlewaretoken" data-bind="value: getCsrfToken()">
                    <div class="jumbotron">
                        <div class="default-padding">
                            This is the sample template. Copy this template with another id then add your MVVM fields here.
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </script>

.. highlight:: javascript

Custom grid actions should be inherited from both ``App.GridActions`` and it's base class ``App.Actions``::

    App.MyGridActions = function(options) {
        $.inherit(App.GridActions.prototype, this);
        $.inherit(App.Actions.prototype, this);
        this.init(options);
    };

For more detailed example of using viewmodel actions routing, see see :doc:`grids` section
:ref:`grids_client_side_action_routing`. Internally, AJAX actions are used by `App.EditForm`_, `App.EditInline`_ and
by `App.ko.Grid`_ client-side components. See also `App.EditForm usage`_ in ``djk-sample`` project.
