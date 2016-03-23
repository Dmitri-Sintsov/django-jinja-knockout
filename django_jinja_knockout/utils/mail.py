from socket import gaierror
from smtplib import SMTPDataError
from bleach import linkify
from django.utils.html import linebreaks
from django.utils.translation import ugettext_lazy as _
from django.core import mail
from django.contrib import messages
from ..tpl import html_to_text
from ..middleware import ImmediateJsonResponse

# @todo: Use Celery to send mass-mails, check whether it is possible to report async mail errors via socket.io.
class SendmailQueue:

    def __init__(self, defaults={}):
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

    def add(self, **kwargs):
        if 'html_body' not in kwargs:
            html_body = linebreaks(linkify(kwargs['body']))
        elif 'body' not in kwargs:
            html_body = kwargs.pop('html_body')
            kwargs['body'] = html_to_text(html_body)
        kwargs = dict(self.defaults, **kwargs)
        message = mail.EmailMultiAlternatives(**kwargs)
        message.attach_alternative(html_body, 'text/html')
        self.messages.append(message)
        return self

    def flush(self, **kwargs):
        kwargs = dict({
            'request': None,
            'form': None,
            'fail_silently': False,
        }, **kwargs)
        request = kwargs.pop('request', None)
        form = kwargs.pop('form', None)
        self.connection = kwargs.get('connection', self.connection)
        self.connection = self.connection or mail.get_connection(**kwargs)
        if request is None and form is None:
            result = self.connection.send_messages(self.messages)
            self.messages = []
            return result

        try:
            # raise SMTPDataError(code=123, msg='Big error')
            result = self.connection.send_messages(self.messages)
            self.messages = []
            return result
        except (SMTPDataError, gaierror) as e:
            if isinstance(e, SMTPDataError):
                title = e.smtp_code
                msg = _('Error "%(code)s" "%(msg)s" while sending email.') % {
                    'code': e.smtp_code,
                    'msg': e.smtp_error,
                }
            else:
                title = e.errno
                msg = _('Error "%(code)s" "%(msg)s" while resolving inet address.') % {
                    'code': e.errno,
                    'msg': e.strerror,
                }
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
            else:
                raise e

EmailQueue = SendmailQueue()
