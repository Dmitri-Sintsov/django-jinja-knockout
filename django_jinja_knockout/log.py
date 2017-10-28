from django.utils.log import AdminEmailHandler

from .utils.mail import send_admin_mail


class DjkEmailHandler(AdminEmailHandler):

    def send_mail(self, subject, message, *args, **kwargs):
        send_admin_mail.delay(subject, message, *args, **kwargs)
