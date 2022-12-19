from django.utils.html import format_html
from django.template import loader as tpl_loader

from .. import tpl
from ..viewmodels import vm_list

from ..models import get_verbose_name, get_object_description


class BaseViewmodel:

    title = '{action_local_name}: {verbose_name}'
    form_action = None
    template = None

    def __init__(self, view, instance=None, source_action=None, **kwargs):
        self.view = view
        self.instance = instance
        self.source_action = source_action

    def render_title(self):
        context = {
            'action_local_name': self.get_action_local_name(),
            'verbose_name': self.get_verbose_name(),
        }
        return format_html(self.title, **context)

    def get_object_desc(self, obj):
        return get_object_description(obj)

    def render_object_desc(self, obj):
        i18n = self.view.get_all_verbose_names()
        return tpl.print_bs_badges(self.get_object_desc(obj), show_keys=None if i18n is None else 1, i18n=i18n)

    def get_action_local_name(self):
        return self.view.get_action_local_name(self.source_action)

    def get_form_model(self):
        raise NotImplementedError

    def get_verbose_name(self):
        verbose_name = get_verbose_name(self.get_form_model()) \
            if self.instance is None \
            else self.render_object_desc(self.instance)
        return verbose_name

    def render_template(self, template, context):
        t = tpl_loader.get_template(template)
        return t.render(request=self.view.request, context=context)

    def get_action_query(self):
        return self.view.get_action_query(self.source_action, self.instance)

    def get_action_url(self, form_action, action_query):
        return self.view.get_action_url(form_action, query=action_query)

    def get_bs_form_opts(self):
        return self.view.get_bs_form_opts()

    def get_template_context(self, form_action, action_query):
        if action_query is None:
            action_query = self.get_action_query()
        action = self.get_action_url(form_action, action_query)
        return {
            '_render_': True,
            'action': action,
            'opts': self.get_bs_form_opts(),
        }

    def __call__(
            self, form_action=None, action_query: dict = None, callback_action=None, template=None,
            *args, **kwargs
    ):
        if form_action is None:
            form_action = self.form_action
        if template is None:
            template = self.template
        title = self.render_title()
        message = self.render_template(template, context=self.get_template_context(form_action, action_query))
        vm = {
            'last_action': form_action,
            'title': title,
            'message': message,
        }
        if callback_action is not None:
            vm['callback_action'] = callback_action
        return vm_list(vm)


class FormViewmodel(BaseViewmodel):

    form_action = 'save_form'
    template = 'bs_form.htm'

    def __init__(self, view, form, instance=None, source_action=None, **kwargs):
        super().__init__(view, instance, source_action)
        self.form = form

    def get_form_model(self):
        return self.form.Meta.model

    def get_template_context(self, form_action, action_query):
        context = super().get_template_context(form_action, action_query)
        context['form'] = self.form
        return context


class InlineViewmodel(BaseViewmodel):

    form_action = 'save_inline'
    template = 'bs_inline_formsets.htm'

    def __init__(self, view, ff, instance=None, source_action=None, **kwargs):
        super().__init__(view, instance, source_action)
        self.ff = ff

    def get_form_model(self):
        return self.ff.get_form_class().Meta.model

    def get_template_context(self, form_action, action_query):
        context = super().get_template_context(form_action, action_query)
        context.update({
            'form': self.ff.form,
            'formsets': self.ff.formsets,
        })
        return context
