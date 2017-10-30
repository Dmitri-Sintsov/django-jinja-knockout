from django.utils.log import AdminEmailHandler


def send_admin_mail(subject, message=None, *args, **kwargs):
    from django.conf import settings
    from .utils.mail import SendmailQueue
    sq = SendmailQueue()
    sq._add(
        subject=subject,
        body=message,
        html_body=kwargs.get('html_message', None),
        to=[v[1] for v in settings.ADMINS]
    )
    sq._flush(request=kwargs.get('request', None))


try:
    from celery.decorators import task
    send_admin_mail_wrapper = task(send_admin_mail, name='send_admin_mail')
except ImportError:
    send_admin_mail_wrapper = send_admin_mail
    send_admin_mail_wrapper.delay = send_admin_mail


def send_admin_mail_task(subject, message=None, *args, **kwargs):
    try:
        # Try to send mail in background (if Celery is available).
        send_admin_mail_wrapper.delay(subject, message, *args, **kwargs)
    except Exception as e:
        # If Celery is not running or is improperly configured, try to send mail immediately.
        send_admin_mail(subject, message, *args, **kwargs)


class DjkEmailHandler(AdminEmailHandler):

    def send_mail(self, subject, message, *args, **kwargs):
        send_admin_mail_task(subject, message, *args, **kwargs)
