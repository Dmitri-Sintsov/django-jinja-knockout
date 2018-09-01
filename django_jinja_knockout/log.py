from django.utils.log import AdminEmailHandler


def send_admin_mail(subject, message=None, *args, **kwargs):
    from django.conf import settings
    from .utils.mail import SendmailQueue
    SendmailQueue()._add(
        subject=subject,
        body=message,
        html_body=kwargs.get('html_message', None),
        to=[v[1] for v in settings.ADMINS]
    )._flush(
        request=kwargs.get('request', None)
    )


try:
    from celery.decorators import task
    send_admin_mail_task = task(send_admin_mail, name='send_admin_mail')
except ImportError:
    send_admin_mail_task = send_admin_mail
    send_admin_mail_task.delay = send_admin_mail


def send_admin_mail_delay(subject, message=None, *args, **kwargs):
    try:
        # Try to send mail in background (if Celery is available).
        send_admin_mail_task.delay(subject, message, *args, **kwargs)
    except Exception:
        # If Celery is not running or is improperly configured, try to send mail immediately.
        send_admin_mail(subject, message, *args, **kwargs)


class DjkEmailHandler(AdminEmailHandler):

    def send_mail(self, subject, message, *args, **kwargs):
        send_admin_mail_delay(subject, message, *args, **kwargs)
