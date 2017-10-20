from django.utils.log import AdminEmailHandler

def send_mail(subject, message, *args, **kwargs):
    from .utils.mail import SendmailQueue
    from django.conf import settings
    SendmailQueue()._add(
        subject=subject,
        body=message,
        html_body=kwargs['html_message'],
        to=[v[1] for v in settings.ADMINS]
    )._flush()

try:
    from celery.decorators import task
    send_mail = task(send_mail, name='send_error_report')
except ImportError:
    send_mail.delay = send_mail


class DjkEmailHandler(AdminEmailHandler):

    def send_mail(self, subject, message, *args, **kwargs):
        send_mail.delay(subject, message, *args, **kwargs)
