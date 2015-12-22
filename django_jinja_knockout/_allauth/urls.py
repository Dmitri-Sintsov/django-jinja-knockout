from django.utils.translation import ugettext as _
from django.conf.urls import url

from . import views


urlpatterns = [
    # Django allauth overrides for Jinja2 templates.
    url(r"^signup/$", views.signup, name="account_signup",
        kwargs={'allow_anonymous': True, 'view_title': _('Signup')}),
    url(r"^login/$", views.login, name="account_login",
        kwargs={'allow_anonymous': True, 'view_title': _('Sign In')}),
    url(r"^logout/$", views.logout, name="account_logout",
        kwargs={'allow_anonymous': True, 'view_title': _('Sign Out')}),

    url(r"^password/change/$", views.password_change, name="account_change_password"),
    url(r"^password/set/$", views.password_set, name="account_set_password"),

    url(r"^inactive/$", views.account_inactive, name="account_inactive",
        kwargs={'allow_anonymous': True}),

    # E-mail
    url(r"^email/$", views.email, name="account_email",
        kwargs={'view_title': _("Account")}),
    url(r"^confirm-email/$", views.email_verification_sent, name="account_email_verification_sent",
        kwargs={'allow_anonymous': True, 'view_title': _("Verify Your E-mail Address")}),
    url(r"^confirm-email/(?P<key>\w+)/$", views.confirm_email, name="account_confirm_email",
        kwargs={'allow_anonymous': True, 'view_title': _("Confirm E-mail Address")}),

    # password reset
    url(r"^password/reset/$", views.password_reset, name="account_reset_password",
        kwargs={'allow_anonymous': True, 'view_title': _("Password Reset")}),
    url(r"^password/reset/done/$", views.password_reset_done, name="account_reset_password_done",
        kwargs={'allow_anonymous': True, 'view_title': _("Password Reset")}),
    url(r"^password/reset/key/(?P<uidb36>[0-9A-Za-z]+)-(?P<key>.+)/$",
        views.password_reset_from_key, name="account_reset_password_from_key",
        kwargs={'allow_anonymous': True, 'view_title': _("Change Password")}),
    url(r"^password/reset/key/done/$", views.password_reset_from_key_done,
        name="account_reset_password_from_key_done",
        kwargs={'allow_anonymous': True, 'view_title': _("Change Password")}),
]
