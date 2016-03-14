=================================================
Client-side viewmodels and AJAX response routing
=================================================

Client-side viewmodels
----------------------

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
passed to their ``viewmodel handler``. The following built-in viewmodel names currently are available (version 0.1.0)::

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

Imagine you are developing mixed web application with traditional server-side generated html responses but also
having lots of AJAX interaction. With tradidional approach, you will have to write a lot of boilerplate code, like this,
html::

    <button id="my_button" class="button btn btn-default">Save your form template</button>

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
   route in ``urls.py``, and will forget to update url path in Javascript, AJAX POST may break.
3. What if your AJAX response should have finer control over client-side response? For exmaple, sometimes you need
   to open ``BootstrapDialog``, sometimes to redirect instead, sometimes to perform some custom action?

Now, with client-side viewmodels response routing, to execute AJAX post via button click, the following Jinja2 template
code is enough::

    <button class="button btn btn-default" data-route="{{ reverse('my_url_name') }}">
        Save your form template
    </button>

``app.js`` will care itself of setting Javascript event handler, performing AJAX request POST and AJAX response routing
will execute viewmodels returned from Django view. If you want to ensure AJAX requests, just set your ``urls.py`` route
kwargs key ``is_ajax`` to ``True`` (optional step)::

    url(r'^button-click/$', 'my_app.views.button_click', name='my_url_name', kwargs={'ajax': True}),

register AJAX client-side route in ``context_processors.py``::

    from django_jinja_knockout.context_processors import TemplateContextProcessor as BaseContextProcessor


    class TemplateContextProcessor(BaseContextProcessor):

        CLIENT_ROUTES = (
            ('my_url_name', False),
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

If your Django view which maps to ``'my_url_name'`` returns standard client-side viewmodels only, like just above, you
do not even have to modify a single bit of your Javascript code!

Also it is possible to set client-side bind context with the second argument of viewmodel handler::

    App.addViewHandler('set_context_title', function(viewModel, bindContext) {
        bindContext.setTitle(viewModel.title);
    });

but in last case to have instance of bind_context to be passed to viewmodel handler, one has to perform AJAX GET / POST
manually via::

    App.post('my_url_name', post_data, bind_context);

and of course Django view mapped to ``'my_url_name'`` (see :doc:`installation`) should return ``vm_list()`` instance
with one of it's elements having the key ``{'view': 'set_context_title'}`` to have the viewmodel handler above to be
actually called.
