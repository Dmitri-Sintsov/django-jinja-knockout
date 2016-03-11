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
client-side viewmodels will be executed, which defines just one command: ``redirect_to`` specified ``url``. When user
cancels confirmation dialog, no extra viewmodels will be executed.

Now, how to execute these viewmodels we defined actually? At Javascript side it's the most obvious::

    App.viewResponse(viewmodels);

However, it does not provide much advantage over performing ``jQuery.prepend()`` and instantiating ``BootstrapDialog()``
manually, while losing some of their flexibility. Then why all of that?

Because you rarely are going to execute viewmodels from client-side directly. It's not the key point of their
introduction. They are most useful as foundation of interaction between server-side Django and client-side Javascript
via AJAX request / response and in few other special cases.

Viewmodel data format
~~~~~~~~~~~~~~~~~~~~~

Key ``'view'`` of each Javascript object / Python dict in the list stores value of ``viewmodel name``, that is tied to
Javascript ``viewmodel handler``. Rest of keys are argument names of each current ``viewmodel`` with corresponding
values. The following built-in viewmodel names currently are available (version 0.1.0)::

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

One can also add custom viewmodels easily in Javascript plugins. See ``tooltips.js`` for additional bundled viewmodels
names and their viewmodel handlers::

    'tooltip_error', 'popover_error', 'form_error'

which are primarily used for displaying errors of AJAX submitted POSTs.

Note that while the following syntax of defining custom viewmodel handler works::

    App.viewHandlers['popover_error'] = function(viewModel) {
        viewModel.instance = new App.fieldPopover(viewModel);
    };

it's recommended to use special method of ``app.js`` to add viewmodel handlers::

    App.addViewHandler('popover_error', function(viewModel) {
        ...
        App.viewHandlers['my_custom_viewmodel_name'](viewModel, App.MyCustomDialog);
    });

Note that the last example also shows chaining of viewmodel handlers, where newly defined handler executes already
existing one. ``viewModel`` argument of viewmodel handler receives actual instance of ``vm_list()``, returned from
Django view. Also custom Javascript ``bind context`` to object instance of ``App.MyCustomDialog`` is applied to
``'my_custom_viewmodel_name'`` viewmodel handler.

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
                        if(result) {
                            window.location.href = '/another_url';
                        }
                    }
                )
            },
            'json'
        )
    });

Such code have many disadvantages:

1. Repeated boilerplate code with multiple $.post() arguments, including manual specification of CSRF token.
2. Route urls are tied into client-side Javascript, instead of being supplied from Django.
3. What if your AJAX response should have finer control over client-side response? For exmaple, sometimes you need
   to open ``BootstrapDialog``, sometimes to redirect instead, sometimes to perform some custom action?

Now, with client-side viewmodels response routing, to execute AJAX post via button click, the following Jinja2 template
code is enough::

    <button class="button btn btn-default" data-route="{{ reverse('my_url_name') }}">
        Save your form template
    </button>

``app.js`` will care itself of both AJAX request POSTing and executing viewmodels returned via AJAX response.
If your Django view which maps to ``my_url_name`` returns standard client-side viewmodels only, you do not even have
to modify a bit of your Javascript code!

Example of Django response::

    from django_jinja_knockout.viewmodels import vm_list

    def my_url_view(request):
        return vm_list(
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

In case custom response is required, see the example above.
