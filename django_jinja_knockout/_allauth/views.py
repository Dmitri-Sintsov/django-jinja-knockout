from django.contrib.auth.decorators import login_required
from allauth.account.views import LoginView as AllauthLoginView, \
    SignupView as AllauthSignupView, \
    ConfirmEmailView as AllauthConfirmEmailView, \
    EmailView as AllauthEmailView, \
    PasswordChangeView as AllauthPasswordChangeView, \
    PasswordSetView as AllauthPasswordSetView, \
    PasswordResetView as AllauthPasswordResetView, \
    PasswordResetDoneView as AllauthPasswordResetDoneView, \
    PasswordResetFromKeyView as AllauthPasswordResetFromKeyView, \
    PasswordResetFromKeyDoneView as AllauthPasswordResetFromKeyDoneView, \
    LogoutView as AllauthLogoutView, \
    AccountInactiveView as AllauthAccountInactiveView, \
    EmailVerificationSentView as AllauthEmailVerificationSentView


class LoginView(AllauthLoginView):
    template_name = 'login.htm'

login = LoginView.as_view()


class SignupView(AllauthSignupView):
    template_name = 'signup.htm'

signup = SignupView.as_view()


class ConfirmEmailView(AllauthConfirmEmailView):

    def get_template_names(self):
        if self.request.method == 'POST':
            return ['email_confirmed.htm']
        else:
            return ['email_confirm.htm']

confirm_email = ConfirmEmailView.as_view()


class EmailView(AllauthEmailView):
    template_name = 'email.htm'

email = login_required(EmailView.as_view())


class PasswordChangeView(AllauthPasswordChangeView):
    template_name = 'password_change.htm'

password_change = login_required(PasswordChangeView.as_view())


class PasswordSetView(AllauthPasswordSetView):
    template_name = 'password_set.htm'

password_set = login_required(PasswordSetView.as_view())


class PasswordResetView(AllauthPasswordResetView):
    template_name = 'password_reset.htm'

password_reset = PasswordResetView.as_view()


class PasswordResetDoneView(AllauthPasswordResetDoneView):
    template_name = 'password_reset_done.htm'

password_reset_done = PasswordResetDoneView.as_view()


class PasswordResetFromKeyView(AllauthPasswordResetFromKeyView):
    template_name = 'password_reset_from_key.htm'

password_reset_from_key = PasswordResetFromKeyView.as_view()


class PasswordResetFromKeyDoneView(AllauthPasswordResetFromKeyDoneView):
    template_name = 'password_reset_from_key_done.htm'

password_reset_from_key_done = PasswordResetFromKeyDoneView.as_view()


class LogoutView(AllauthLogoutView):
    template_name = 'logout.htm'

logout = LogoutView.as_view()


class AccountInactiveView(AllauthAccountInactiveView):
    template_name = 'account_inactive.htm'

account_inactive = AccountInactiveView.as_view()


class EmailVerificationSentView(AllauthEmailVerificationSentView):
    template_name = 'verification_sent.htm'

email_verification_sent = EmailVerificationSentView.as_view()
