.. _Celery: https://github.com/celery/celery

=============
utils/mail.py
=============

class ``SendmailQueue``, which instance is available globally as ``EmailQueue``, allows to send multiple HTML
emails with attachments. In case sendmail error is occured, error message can be converted to form non-field errors with
``form`` named argument of ``.flush()`` method (works with AJAX and non-AJAX forms)::

    from django_jinja_knockout.utils.mail import EmailQueue

    EmailQueue.add(
        subject='Thank you for registration at our site!',
        html_body=body,
        to=destination_emails,
    ).flush(
        form=self.form
    )

When there is no form submitted or it's undesirable to add form's non-field error, ``request`` named argument of
``.flush()`` may be supplied instead. It also works with both AJAX and non-AJAX views. AJAX views would use client-side
:doc:`viewmodels`, displaying error messages in BootstrapDialog window. Non-AJAX views would use Django messaging
framework to display sendmail errors::

    from django_jinja_knockout.utils.mail import EmailQueue

    EmailQueue.add(
        subject='Thank you for registration at our site!',
        html_body=body,
        to=destination_emails,
    ).flush(
        request=self.request
    )

``SendmailQueue`` class functionality could be extended by injecting ioc class. It allows to use database backend or
non-SQL store to process emails in background, for example as `Celery`_ task. ``SendmailQueue`` class ``.add()`` and
``.flush()`` methods could be overridden in ``self.ioc`` and new methods can be added as well.

``uncaught_exception_email`` function can be used to monkey patch Django exception ``BaseHandler`` to use
``SendmailQueue`` to send the uncaught exception reports to selected email addresses.

Here is the example of extending ``EmailQueue`` instance of ``SendmailQueue`` via custom ioc class (``EmailQueueIoc``)
and monkey patching Django exception ``BaseHandler``. This code should be placed in the project's ``apps.py``::

    class MyAppConfig(AppConfig):
        name = 'my_app'
        verbose_name = "Verbose name of my application"

        def ready(self):
            from django_jinja_knockout.utils.mail import EmailQueue
            # EmailQueueIoc should have custom .add() and / or .flush() methods implemented.
            # Original .add() / .flush() methods may be called via ._add() / ._flush().
            from my_app.tasks import EmailQueueIoc

            EmailQueueIoc(EmailQueue)

            # Save uncaught exception handler.
            BaseHandler.original_handle_uncaught_exception = BaseHandler.handle_uncaught_exception
            # Override uncaught exception handler.
            BaseHandler.handle_uncaught_exception = uncaught_exception_email
            BaseHandler.developers_emails = ['user@host.org']
            BaseHandler.uncaught_exception_subject = 'Django exception stack trace for my project'

``my_app.tasks.py``::

    class EmailQueueIoc:

        def __init__(self, email_queue):
            self.queue = email_queue
            self.instances = []
            # Maximum count of messages to send in one batch.
            self.batch_limit = 10
            self.max_total_errors = 3
            email_queue.set_ioc(self)

        def add(self, **kwargs):
            # Insert your code here.
            # Call original _add():
            return self.queue._add(**kwargs)

        def flush(self, **kwargs):
            # Insert your code here.
            # Call original _flush():
            return self.queue._flush(**kwargs)

        def celery_task():
            # Insert your code here.

    @app.task
    def email_send_batch():
        EmailQueue.celery_task()
