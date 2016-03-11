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

When executed, these ``viewmodels`` will perform ``jQuery.prepend()`` function on specified ``selector``, then it will
show ``BootstrapDialog`` confirmation window with specified ``title`` and ``message``. In case ``Ok`` button of
``BootstrapDialog`` will be pressed by end-user, nested ``callback`` list of client-side viewmodels will be executed,
which defines just one command: ``redirect_to`` specified ``url``. When user cancels confirmation dialog, no extra
viewmodels will be executed.

Now, how to execute these viewmodels we defined actually? At Javascript side it's the most obvious::

    App.viewResponse(viewmodels);

However, it does not provide much advantage over performing ``jQuery.prepend()`` and instantiating ``BootstrapDialog()``
manually, while losing some of flexibility. Then why all of that?

Because you rarely are going to execute viewmodels from client-side directly. It's not the key point of their
introduction. They are most useful as foundation of interaction between server-side Django and client-side Javascript
via AJAX request / response.

AJAX response routing
---------------------

Imagine you are developing mixed web application with traditional server-side generated html responses but also
having lots of AJAX interaction. With tradidional approach, you will have to write a lot of boilerplate code, like this,
html::

    <button id="my_button" class="btn btn-default">Save your form template</button>

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

1. Repeated boilerplate code with $.post() arguments, including manual specification of CSRF token.
2. Route urls tied into client-side Javascript, instead of being supplied from Django.
3. What if your AJAX response should have finer control over client-side response? For exmaple, sometimes you need
   to open ``BootstrapDialog``, sometimes to redirect instead, sometimes to perform some custom action?

Enter client-side viewmodels routing. With ``django_jinja_knockout``, one just defines AJAX route as client-side in
your context_processors.py (just once)::

    from django_jinja_knockout.context_processors import TemplateContextProcessor as BaseContextProcessor


    class TemplateContextProcessor(BaseContextProcessor):

        CLIENT_ROUTES = (
            ('my_url_name', False),
        )


    def template_context_processor(HttpRequest=None):
        return TemplateContextProcessor(HttpRequest).get_context_data()
