from bleach import linkify
from django.conf import settings
from django.utils.html import linebreaks
from django.core.mail import send_mail as django_send_mail


def send_mail(**kwargs):

    if 'html_message' not in kwargs:
        kwargs['html_message'] = linebreaks(linkify(kwargs['message']))
    if 'from_email' not in kwargs:
        kwargs['from_email'] = settings.DEFAULT_FROM_EMAIL
    if 'fail_silently' not in kwargs:
        kwargs['fail_silently'] = False

    return django_send_mail(**kwargs)
