from django.utils.translation import gettext as _
from django.urls import path, re_path

from . import views

urlpatterns = [
    # Django allauth overrides for Jinja2 templates.
    path("signup/", views.signup, name="account_signup",
         kwargs={'allow_anonymous': True, 'view_title': _('Signup')}),
    path("login/", views.login, name="account_login",
         kwargs={'allow_anonymous': True, 'view_title': _('Sign In')}),
    path("logout/", views.logout, name="account_logout",
         kwargs={'allow_anonymous': True, 'view_title': _('Sign Out')}),

    path("password/change/", views.password_change, name="account_change_password"),
    path("password/set/", views.password_set, name="account_set_password"),

    path("inactive/", views.account_inactive, name="account_inactive",
         kwargs={'allow_anonymous': True}),

    # E-mail
    path("email/", views.email, name="account_email",
         kwargs={'view_title': _("Account")}),
    path("confirm-email/", views.email_verification_sent, name="account_email_verification_sent",
         kwargs={'allow_anonymous': True, 'view_title': _("Verify Your E-mail Address")}),
    re_path(r"^confirm-email/(?P<key>[-:\w]+)/$", views.confirm_email, name="account_confirm_email",
            kwargs={'allow_anonymous': True, 'view_title': _("Confirm E-mail Address")}),

    # password reset
    path("password/reset/", views.password_reset, name="account_reset_password",
         kwargs={'allow_anonymous': True, 'view_title': _("Password Reset")}),
    path("password/reset/done/", views.password_reset_done, name="account_reset_password_done",
         kwargs={'allow_anonymous': True, 'view_title': _("Password Reset")}),
    re_path(r"^password/reset/key/(?P<uidb36>[0-9A-Za-z]+)-(?P<key>.+)/$",
            views.password_reset_from_key, name="account_reset_password_from_key",
            kwargs={'allow_anonymous': True, 'view_title': _("Change Password")}),
    path("password/reset/key/done/", views.password_reset_from_key_done,
         name="account_reset_password_from_key_done",
         kwargs={'allow_anonymous': True, 'view_title': _("Change Password")}),
]
