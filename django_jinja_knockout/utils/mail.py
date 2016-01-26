from smtplib import SMTPDataError
import lxml.html
from bleach import linkify
from django.conf import settings
from django.utils.html import linebreaks
from django.utils.translation import ugettext_lazy as _
from django.core.mail import send_mail as django_send_mail
from django.contrib import messages


def send_mail(**kwargs):

    if 'html_message' not in kwargs:
        kwargs['html_message'] = linebreaks(linkify(kwargs['message']))
    elif 'message' not in kwargs:
        doc = lxml.html.fromstring(kwargs['html_message'])
        kwargs['message'] = doc.text_content()
    if 'from_email' not in kwargs:
        kwargs['from_email'] = settings.DEFAULT_FROM_EMAIL
    if 'fail_silently' not in kwargs:
        kwargs['fail_silently'] = False

    request = kwargs.pop('request', None)
    form = kwargs.pop('form', None)
    if request is None and form is None:
        return django_send_mail(**kwargs)

    try:
        # raise SMTPDataError(code=123, msg='Big error')
        return django_send_mail(**kwargs)
    except SMTPDataError as e:
        msg = _('Error "%(code)s" "%(msg)s" while sending email to %(email_list)s.') % {
            'code': e.smtp_code,
            'msg': e.smtp_error,
            'email_list': ', '.join(['"{}"'.format(email) for email in kwargs['recipient_list']])
        }
        if form is not None:
            form.add_error(None, msg)
        elif request is not None:
            messages.error(request, msg)
        else:
            raise e
