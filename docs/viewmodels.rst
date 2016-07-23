=================================================
Client-side viewmodels and AJAX response routing
=================================================

Client-side viewmodels
----------------------

.. highlight:: javascript

``django_jinja_knockout`` implements AJAX response routing with client-side viewmodels.

Viewmodels are defined as array of simple objects in Javascript::

    viewmodels = [
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
                'url': '/homepage'
            }]
        }
    ];

.. highlight:: python

and as the special list (vm_list) of ordinary dicts in Python::


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
                'url': '/homepage'
            })
        }
    )


When executed, viewmodels from ``viewmodels`` variable defined above, will perform ``jQuery.prepend()`` function on
specified ``selector``, then it will show ``BootstrapDialog`` confirmation window with specified ``title`` and
``message``. In case ``Ok`` button of ``BootstrapDialog`` will be pressed by end-user, nested ``callback`` list of
client-side viewmodels will be executed, which defines just one command: ``redirect_to`` specified ``url``. In case user
cancels confirmation dialog, no extra viewmodels will be executed.

.. highlight:: javascript

Now, how to execute these viewmodels we defined actually? At Javascript side it's the most obvious::

    App.viewResponse(viewmodels);

However, it does not provide much advantage over performing ``jQuery.prepend()`` and instantiating ``BootstrapDialog()``
manually, while losing some of their flexibility. Then why all of that?

Because one rarely are going to execute viewmodels from client-side directly. It's not the key point of their
introduction. They are most useful as foundation of interaction between server-side Django and client-side Javascript
via AJAX request / response and in few other special cases.

Viewmodel data format
~~~~~~~~~~~~~~~~~~~~~

Key ``'view'`` of each Javascript object / Python dict in the list stores value of ``viewmodel name``, that is tied to
Javascript ``viewmodel handler``. Rest of the keys are arguments of each current ``viewmodel`` with corresponding values,
passed to their ``viewmodel handler``. The following built-in viewmodel names currently are available (version 0.1.2)::

    [
        'redirect_to',
        'alert',
        'alert_error',
        'confirm',
        'append',
        'prepend',
        'after',
        'before',
        'remove',
        'html',
        'replaceWith'
    ]

If your AJAX code just needs to display alert / confirm window, redirect to some url or to perform series of jQuery DOM
manipulation, then you may just use list of viewmodels that map to these already pre-defined handlers.

Defining custom viewmodel handlers
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

One can also add custom viewmodels in Javascript plugins to define new actions. See ``tooltips.js`` for additional
bundled viewmodel names and their viewmodel handlers::

    'tooltip_error', 'popover_error', 'form_error'

which are primarily used to display errors in AJAX submitted forms.

The following method allows to attach multiple handlers to one viewmodel name::

    App.addViewHandler('popover_error', function(viewModel) {
        viewModel.instance = new App.fieldPopover(viewModel);
    });

The following syntax allows to reset previous handlers with that name (if any)::

    App.viewHandlers['popover_error'] = function(viewModel) {
        viewModel.instance = new App.fieldPopover(viewModel);
    };

When handler is called, ``function(viewModel)`` argument receives actual instance of ``viewmodel``.

Note that new properties might be added to viewmodel for further access, like ``.instance`` property which holds an
instance of ``App.fieldPopover`` above. Every executed viewmodel is stored in ``App.executedViewModels`` Javascript
array, which is possible to process later. Example of such processing is ``App.destroyTooltipErrors()`` method, which
clears form input Bootstrap 3 tooltips previously set by ``'tooltip_error'`` viewmodel handler then removes these
viewmodels from ``App.executedViewModels`` list::

    App.executedViewModels = _.filter(
        App.executedViewModels,
        function(viewModel) {
            if (viewModel.view === 'tooltip_error' &&
                    typeof viewModel.instance !== 'undefined') {
                viewModel.instance.destroy();
                return false;
            }
            return true;
        }
    );

It is possible to chain viewmodel handlers, creating a code-reuse and a pseudo-inheritance of viewmodels::

    App.addViewHandler('popover_error', function(viewModel) {
        viewModel.instance = new App.fieldPopover(viewModel);
        App.viewHandlers['tooltip_error'](viewModel);
    });

where newly defined handler ``popover_error`` executes already existing one ``tooltip_error``.


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

1. Repeated boilerplate code with ``$.post()`` numerous arguments, including manual specification of CSRF token.
2. Route urls are tied into client-side Javascript, instead of being supplied from Django. If you change an url of
   route in ``urls.py``, and forget to update url path in Javascript code, AJAX POST may break.
3. What if your AJAX response should have finer control over client-side response? For exmaple, sometimes you need
   to open ``BootstrapDialog``, sometimes to redirect instead, sometimes to perform some custom action?

.. highlight:: html

Now, with client-side viewmodels response routing, to execute AJAX post via button click, the following Jinja2 template
code is enough::

    <button class="button btn btn-default" data-route="my_url_name">
        Save your form template
    </button>

.. highlight:: python

``app.js`` will care itself of setting Javascript event handler, performing AJAX request POST and AJAX response routing
will execute viewmodels returned from Django view. If you want to ensure AJAX requests, just set your ``urls.py`` route
kwargs key ``is_ajax`` to ``True`` (optional step)::

    url(r'^button-click/$', 'my_app.views.button_click', name='my_url_name', kwargs={'ajax': True}),

register AJAX client-side route in ``context_processors.py``::

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

If your Django view which maps to ``'my_url_name'`` returns standard client-side viewmodels only, just like above, you
do not even have to modify a single bit of your Javascript code!

Since version 0.2.0, it is possible to specify client-side routes per view, not having to define them globally
in template context processor::

    def my_view(request):
        request.client_routes.extend([
            'my_url_name'
        ])

and per class-based view::

    class MyGrid(KoGridView):

        client_routes = [
            'my_grid_url_name'
        ]

.. highlight:: javascript

Also it is possible to change view handler Javascript bind context with the second argument of viewmodel handler::

    App.addViewHandler('set_context_title', function(viewModel, bindContext) {
        bindContext.setTitle(viewModel.title);
    });

but in last case to have instance of bind_context to be passed to viewmodel handler, one has to perform AJAX GET / POST
manually via::

    App.post('my_url_name', post_data, bind_context);

and of course Django view mapped to ``'my_url_name'`` (see :doc:`installation`) should return ``vm_list()`` instance
with one of it's elements having the key ``{'view': 'set_context_title'}`` to have the viewmodel handler above to be
actually called.

.. highlight:: jinja

In case your AJAX POST button route contains kwargs / query parameters, you may use ``data-url`` html5 attribute
instead::

    <button class="btn btn-sm btn-success" data-url="{{
        reverseq('post_like', kwargs={'feed_id': feed.id}, query={'type': 'upvote'})
    }}">

Non-AJAX server-side invocation of client-side viewmodels.
----------------------------------------------------------

Besides direct client-side invocation of viewmodels via ``app.js`` ``App.viewResponse()`` method, and AJAX POST /
AJAX GET invocation via AJAX response routing, there are two additional ways to execute client-side viewmodels with
server-side invocation.

.. highlight:: python

Client-side viewmodels can be injected into generated HTML page and then executed when page DOM is loaded. It's
useful to prepare page / form templates which may require automated Javascript code applying, or to display
BootstrapDialog alerts / confirmations when page is just loaded. For example you can override class-based view ``get()``
method like this::

    def get(self, request, *args, **kwargs):
        onload_vm_list = to_vm_list(request.client_data)
        onload_vm_list.append({
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
or during redirect to another page (for example after login redirect) then display required viewmodels::

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
        session_vm_list = to_vm_list(request.session)
        idx, old_view_model = session_vm_list.find_by_kw(view='initial_views')
        if idx is not False:
            # Remove already existing 'initial_views' viewmodel, otherwise they will accumulate.
            # Normally it should not happen, but it's better to be careful.
            session_vm_list.pop(idx)
        if len(view_model.keys()) > 1:
            session_vm_list.append(view_model)

To inject client-side viewmodels on page DOM load just once::

    onload_vm_list = to_vm_list(request.client_data)
    onload_vm_list.append({...})

To inject client-side viewmodels on page DOM load persistently in user session::

    session_vm_list = to_vm_list(request.session)
    session_vm_list.append({...})

Require viewmodels handlers
---------------------------
.. highlight:: javascript

Sometimes there are many separate Javascript source files which define different viewmodel handlers. To assure that
required external source viewmodel handlers are available, ``app.js`` provides ``App.requireViewHandlers()`` method::

    App.requireViewHandlers(['field_error', 'carousel_images']);

Nested / conditional execution of client-side viewmodels
--------------------------------------------------------
Nesting viewmodels as callbacks is available for automated conditional / event-based viewmodels execution. Example of
such approach is implementation of ``'confirm'`` viewmodel in ``app.js`` ``App.Dialog.create()``::

    var cbViewModel = this.dialogOptions.callback;
    this.dialogOptions.callback = function(result) {
        if (result) {
            App.viewResponse(cbViewModel);
        }
    }

Asynchronous execution of client-side viewmodels
------------------------------------------------

There is one drawback of the lists of viewmodels: these are not asynchronous and do not support promises by default.
In some more complex arbitrary cases (for example one need to wait some DOM loaded first, then executing viewmodels),
one may "save" viewmodels received from AJAX response, then "restore" (execute) these in required DOM event / promise
handler, ``App.saveResponse()`` saves received viewmodels::

    App.addViewHandler('popup_modal_error', function(viewModel) {
        // Save received response to execute it in the 'shown.bs.modal' event handler (see just below).
        App.saveResponse('popupModal', viewModel);
        // Open modal popup to show actual errors (received as viewModel from server-side).
        $popupModal.modal('show');
    });

    // Open modal popup.
    $popupModal.on('shown.bs.modal', function (ev) {
        // Execute viewmodels received in 'dialog_tooltip_error' viewmodel handler.
        App.loadResponse('popupModal');
    });

``App.loadResponse()`` executes previously saved viewmodels. Multiple save points might be set by calling
``App.saveResponse()``, then restored and executed by calling ``App.loadResponse()`` with different ``name`` argument
value.
