from django.template import loader as tpl_loader
from django.http import HttpResponseRedirect
from django.views.generic import TemplateView, DetailView, UpdateView
from django.utils.html import format_html

from .base import FormatTitleMixin, FormViewmodelsMixin

from ..utils.sdv import str_to_numeric
from ..tpl import escape_css_selector, reverse
from ..models import get_object_description, model_fields_verbose_names, get_verbose_name
from ..viewmodels import vm_list


class FormDetailView(FormatTitleMixin, UpdateView):

    template_name = 'form_detail_view.htm'


# See also https://github.com/AndrewIngram/django-extra-views
class FormWithInlineFormsetsMixin(FormViewmodelsMixin):

    # Only related form without formsets.
    form = None

    ajax_refresh = False

    # Related form with inline formsets or inline formsets without related form.
    # Required to define ONLY when form_with_inline_formsets has FormClass = None
    # ("edit many related formsets without master form" mode).
    form_with_inline_formsets = None

    def get_form_action_url(self, kwargs=None):
        if kwargs is None:
            if hasattr(self, 'pk_url_kwarg'):
                kwargs = {
                    self.pk_url_kwarg: self.kwargs[self.pk_url_kwarg]
                }
        return reverse(
            self.request.resolver_match.url_name, kwargs=kwargs
        )

    def get_success_url(self):
        return self.get_form_action_url()

    # Do not just remove bs_form() options.
    # BootstrapDialog panel might render with overlapped layout without these options.
    def get_bs_form_opts(self):
        return {}
        """
        return {
            'is_ajax': True,
            'layout_classes': {
                'label': 'col-md-4',
                'field': 'col-md-6'
            }
        }
        """

    def get_form_with_inline_formsets(self, request, create=False):
        # UPDATE mode by default (UPDATE / VIEW).
        if self.__class__.form is None:
            return self.__class__.form_with_inline_formsets(request, create=create)
        else:
            if self.__class__.form_with_inline_formsets is not None:
                raise ValueError('Ambiguous .form and .form_with_inline_formsets class attributes')
            from ..forms import FormWithInlineFormsets
            return FormWithInlineFormsets(request, form_class=self.__class__.form, create=create)

    def get_model(self):
        return getattr(self.__class__, 'model', None)

    def dispatch(self, request, *args, **kwargs):
        self.ff = self.get_form_with_inline_formsets(request)
        form_class = self.ff.get_form_class()
        self.model = self.get_model()
        if self.model is None and form_class is not None:
            self.model = form_class._meta.model
        return super().dispatch(request, *args, **kwargs)

    def get_ajax_refresh_selector(self):
        return '.formsets.panel:has([data-url="{}"])'.format(
            escape_css_selector(self.get_form_action_url())
        )

    def get_alert_title(self):
        return format_html(
            '{} <b>-</b> {}',
            get_verbose_name(self.ff.model),
            str(self.ff.model)
        )

    def get_alert_message(self):
        return get_object_description(self.ff.model)

    def get_alert_verbose_field_names(self):
        return model_fields_verbose_names(self.ff.model)

    def get_success_viewmodels(self):
        if self.ajax_refresh:
            t = tpl_loader.get_template('bs_inline_formsets.htm')
            # Build the separate form with formset for GET because create=False version could have different forms
            # comparing to self.ff POST in create=True mode (combined create / update with different forms).
            ff = self.get_form_with_inline_formsets(self.request)
            ff.get(instance=self.ff.model)
            ff_html = t.render(request=self.request, context={
                '_render_': True,
                'form': ff.form,
                'formsets': ff.formsets,
                'action': self.get_form_action_url(),
                'html': self.get_bs_form_opts()
            })
            vms = vm_list(
                {
                    'view': 'replaceWith',
                    'selector': self.get_ajax_refresh_selector(),
                    'html': ff_html,
                },
                {
                    'view': 'alert',
                    'title': self.get_alert_title(),
                    'message': self.get_alert_message(),
                    'nestedListOptions': {
                        'showKeys': True,
                        'i18n': self.get_alert_verbose_field_names(),
                    }
                }
            )
            return vms
        else:
            # @note: Do not just remove 'redirect_to', otherwise deleted forms will not be refreshed
            # after successful submission. Use as callback for view: 'alert' or make your own view.
            return vm_list({
                'view': 'redirect_to',
                'url': self.get_success_url()
            })

    def form_valid(self, form, formsets):
        """
        Called if all forms are valid. Creates a model instance along with
        associated formsets models and then redirects to a success page.
        """
        if self.request.is_ajax():
            return self.get_success_viewmodels()
        else:
            return HttpResponseRedirect(self.get_success_url())

    def form_invalid(self, form, formsets):
        """
        Called if a form is invalid. Re-renders the context data with the
        data-filled forms and errors.
        """
        if self.request.is_ajax():
            return self.ajax_form_invalid(form, formsets)
        else:
            return self.render_to_response(
                self.get_context_data(form=self.ff.form, formsets=self.ff.formsets)
            )

    def get_object_from_url(self):
        raise NotImplementedError('Abstract method')

    def get(self, request, *args, **kwargs):
        """
        Handles GET requests and instantiates blank versions of the form
        and its inline formsets.
        """
        self.object = self.get_object_from_url()
        self.ff.get(instance=self.object)
        return self.render_to_response(
            self.get_context_data(form=self.ff.form, formsets=self.ff.formsets)
        )

    def post(self, request, *args, **kwargs):
        """
        Handles POST requests, instantiating a form instance and its inline
        formsets with the passed POST variables and then checking them for
        validity.
        """
        self.object = self.get_object_from_url()
        self.object = self.ff.save(instance=self.object)
        if self.object is not None:
            return self.form_valid(self.ff.form, self.ff.formsets)
        else:
            return self.form_invalid(self.ff.form, self.ff.formsets)


class InlineCreateView(FormWithInlineFormsetsMixin, FormatTitleMixin, TemplateView):

    template_name = 'cbv_edit_inline.htm'

    def get_form_with_inline_formsets(self, request):
        return super().get_form_with_inline_formsets(request, create=True)

    def get_object_from_url(self):
        return None


# @note: Suitable both for CREATE and for VIEW actions (via form metaclass=DisplayModelMetaclass).
class InlineDetailView(FormatTitleMixin, FormWithInlineFormsetsMixin, DetailView):

    template_name = 'cbv_edit_inline.htm'

    def get_object(self):
        pk = str_to_numeric(self.kwargs.get(self.pk_url_kwarg, None))
        if pk == 0 or pk is None:
            return self.model()
        else:
            return super().get_object()
