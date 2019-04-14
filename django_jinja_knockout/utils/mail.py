from socket import gaierror
from smtplib import SMTPDataError, SMTPServerDisconnected
from bleach import linkify
from django.utils.html import linebreaks
from django.utils.translation import ugettext_lazy as _
from django.core import mail
from django.contrib import messages
from ..tpl import html_to_text
from ..http import ImmediateJsonResponse


class SendmailQueue:

    def __init__(self, defaults: dict = None):
        if defaults is None:
            defaults = {}
        self.ioc = object()
        self.messages = []
        self.defaults = {
            'subject': '',
            'body': '',
            'from_email': None,
            'to': None,
            'bcc': None,
            'attachments': None,
            'headers': None,
            'alternatives': None,
            'cc': None,
            'reply_to': None
        }
        self.connection = None
        self.defaults.update(defaults)

    def set_ioc(self, ioc_instance):
        self.ioc = ioc_instance

    def __getattr__(self, name):
        if hasattr(self.ioc, name):
            return getattr(self.ioc, name)
        else:
            return getattr(self, '_' + name)

    def _add(self, **kwargs):
        html_body = kwargs.pop('html_body', None)
        if html_body is None:
            html_body = linebreaks(linkify(kwargs['body']))
        if 'body' not in kwargs or kwargs['body'] is None:
            kwargs['body'] = html_to_text(html_body)
        kwargs = dict(self.defaults, **kwargs)
        message = mail.EmailMultiAlternatives(**kwargs)
        message.attach_alternative(html_body, 'text/html')
        self.messages.append(message)
        return self

    def __iter__(self):
        for message in self.messages:
            yield message

    def _flush(self, **kwargs):
        if len(self.messages) == 0:
            return
        kwargs = dict({
            'request': None,
            'form': None,
            'fail_silently': False,
        }, **kwargs)
        request = kwargs.pop('request', None)
        form = kwargs.pop('form', None)
        self.connection = kwargs.get('connection', self.connection)
        self.connection = self.connection or mail.get_connection(**kwargs)

        try:
            # raise SMTPDataError(code=123, msg='Test error')
            result = self.connection.send_messages(self.messages)
            if hasattr(self.ioc, 'success'):
                self.ioc.success()
            self.messages = []
            return result
        except (SMTPDataError, SMTPServerDisconnected, gaierror, ConnectionError) as e:
            if isinstance(e, SMTPDataError):
                title = e.smtp_code
                trans_msg = 'Error "%(err_type)s" "%(code)s" "%(msg)s" while sending email.'
                trans_params = {
                    'err_type': e.__class__.__name__,
                    'code': e.smtp_code,
                    'msg': e.smtp_error,
                }
            if isinstance(e, SMTPServerDisconnected):
                self.connection = mail.get_connection(**kwargs)
                title = 'SMTP server disconnected'
                trans_msg = 'Error "%(err_type)s" "%(msg)s" while sending email.'
                trans_params = {
                    'err_type': e.__class__.__name__,
                    'code': 1,
                    'msg': str(e),
                }
            else:
                title = e.errno
                trans_msg = 'Error "%(err_type)s" "%(code)s" "%(msg)s" while the transmission attempt.'
                trans_params = {
                    'err_type': e.__class__.__name__,
                    'code': e.errno,
                    'msg': e.strerror,
                }
            msg = _(trans_msg) % trans_params
            raise_error = self.ioc.error(**trans_params) if hasattr(self.ioc, 'error') else True
            if form is not None:
                form.add_error(None, msg)
            elif request is not None:
                if request.is_ajax():
                    raise ImmediateJsonResponse({
                        'view': 'alert_error',
                        'title': title,
                        'message': msg
                    })
                else:
                    messages.error(request, msg)
            elif raise_error:
                raise e


# Project-wide instance of SendmailQueue.
#
# Celery can be used to send mass-mails in background by creating custom ioc class which would extend the functionality
# of EmailQueue.add() / flush() or will add new methods to EmailQueue in your project AppConfig.ready() method like this:
"""
        from django_jinja_knockout.utils.mail import EmailQueue
        from my_email_app.tasks import EmailQueueIoc

        EmailQueueIoc(EmailQueue)
"""
EmailQueue = SendmailQueue()
