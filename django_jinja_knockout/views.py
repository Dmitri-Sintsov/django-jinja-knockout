import json
import traceback
from django.conf import settings
from django.utils.six.moves.urllib.parse import urlparse
from django.utils.translation import ugettext as _
from django.utils.decorators import method_decorator
from django.http import HttpResponseRedirect, HttpResponseBadRequest, JsonResponse
from django.views.generic import TemplateView, DetailView, ListView
from django.shortcuts import resolve_url
from django.contrib.auth import REDIRECT_FIELD_NAME
from . import tpl as qtpl


def auth_redirect(request):
    if request.is_ajax():
        # Will use viewmodel framework to display client-side alert.
        return JsonResponse({
            'view': 'alert_error',
            'message': _('Access to current url is denied')
        })
    # Borrowed from django.contrib.auth.decorators.user_passes_test()
    path = request.build_absolute_uri()
    resolved_login_url = resolve_url(settings.LOGIN_URL)
    # If the login url is the same scheme and net location then just
    # use the path as the "next" url.
    login_scheme, login_netloc = urlparse(resolved_login_url)[:2]
    current_scheme, current_netloc = urlparse(path)[:2]
    if ((not login_scheme or login_scheme == current_scheme) and
            (not login_netloc or login_netloc == current_netloc)):
        path = request.get_full_path()
    from django.contrib.auth.views import redirect_to_login
    return redirect_to_login(path, resolved_login_url, REDIRECT_FIELD_NAME)


def error_response(request, html):
    if request.is_ajax():
        return JsonResponse({
            'view': 'alert_error',
            'message': html
        })
    else:
        return HttpResponseBadRequest(html)


def exception_response(request, e):
    if request.is_ajax():
        if settings.DEBUG:
            html = qtpl.print_list(
                row=[str(e), traceback.format_exc()],
                elem_tpl='<li style="white-space: pre-wrap;">{0}</li>\n'
            )
        else:
            html = 'Exception occured. Please contact administrator.'
        return error_response(request, html)
    else:
        raise e


# @note: Currently is unused, because url permission middleware checks permission_required from urls.py kwargs.
# @note: Usage:
# @cbv_decorator(permission_required('my_project.change_project'))
# class ProjectUpdate(BsTabsMixin, InlineDetailView):
# ...
def cbv_decorator(decorator):
    def inner(cls):
        orig_dispatch = cls.dispatch

        @method_decorator(decorator)
        def new_dispatch(self, request, *args, **kwargs):
            return orig_dispatch(self, request, *args, **kwargs)

        cls.dispatch = new_dispatch
        return cls
    return inner


def prepare_bs_navs(navs, request):
    # Select active nav tab according to request.path, if any.
    for key, nav in enumerate(navs):
        if nav['url'] == request.path:
            navs[key]['class'] = 'active'
        if 'class' not in nav:
            nav['class'] = ''


# Automatic template context processor for bs_navs() jinja2 macro. #
class BsTabsMixin(object):

    def get_context_data(self, **kwargs):
        context_data = super().get_context_data(**kwargs)
        main_navs = self.get_main_navs(
            self.request, None if not hasattr(self, 'object') or self.object is None else self.object.pk
        )
        prepare_bs_navs(main_navs, self.request)
        context_data['main_navs'] = main_navs
        return context_data


# See also https://github.com/AndrewIngram/django-extra-views
class FormWithInlineFormsetsMixin(object):
    # @note: Required to define ONLY when form_with_inline_formsets has FormClass is None
    # ("edit many related formsets without master form" mode).
    form_with_inline_formsets = None

    def get_form_with_inline_formsets(self, request):
        # UPDATE mode by default (UPDATE / VIEW).
        return self.__class__.form_with_inline_formsets(request)

    def get_model(self):
        return getattr(self.__class__, 'model', None)

    def dispatch(self, request, *args, **kwargs):
        self.ff = self.get_form_with_inline_formsets(request)
        form_class = self.ff.get_form_class()
        self.model = self.get_model()
        if self.model is None and form_class is not None:
            self.model = form_class._meta.model
        return super().dispatch(request, *args, **kwargs)

    def form_valid(self, form, formsets):
        """
        Called if all forms are valid. Creates a model instance along with
        associated formsets models and then redirects to a success page.
        """
        return HttpResponseRedirect(self.get_success_url())

    def form_invalid(self, form, formsets):
        """
        Called if a form is invalid. Re-renders the context data with the
        data-filled forms and errors.
        """
        return self.render_to_response(
            self.get_context_data(form=self.ff.form, formsets=self.ff.formsets)
        )

    def get_object_from_url(self):
        raise ValueError('Abstract')

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


class InlineCreateView(FormWithInlineFormsetsMixin, TemplateView):

    def get_form_with_inline_formsets(self, request):
        return self.__class__.form_with_inline_formsets(request, create=True)

    def get_object_from_url(self):
        return None


# @note: Suitable both for CREATE and for VIEW actions (via form metaclass=DisplayModelMetaclass).
class InlineDetailView(FormWithInlineFormsetsMixin, DetailView):

    def get_object_from_url(self):
        return self.get_object()


class ListViewSortMixin(ListView):

    order_key = 'list_order_by'
    # Do not need to duplicate both accending and descending ('-' prefix) orders.
    # Both are counted in.
    allowed_sort_orders = []

    def __init__(self):
        super().__init__()
        self.current_sort_order = None

    def try_allowed_sort_order(self, sort_order):
        if type(sort_order) not in [str, list]:
            raise ValueError('Invalid type of sorting order')
        # Tuple is not suitable because json.dumps() converts Python tuples to json lists.
        is_iterable = type(sort_order) is list
        stripped_order = [order.lstrip('-') for order in sort_order] if is_iterable else sort_order.lstrip('-')
        if stripped_order not in self.__class__.allowed_sort_orders:
            raise ValueError('Non-allowed sorting order')
        return is_iterable

    def get_current_sort_order_kwargs(self, query={}):
        if self.current_sort_order is None:
            return query
        else:
            result = {self.__class__.order_key: json.dumps(self.current_sort_order)}
            result.update(query)
            return result

    @staticmethod
    def negate_order_key(cls, order_key):
         return order_key.lstrip('-') if order_key[0] == '-' else '-{0}'.format(order_key)

    def get_sort_order_kwargs(self, sort_order, query={}):
        is_iterable = self.try_allowed_sort_order(sort_order)
        if self.current_sort_order == sort_order:
            # Negate current sort order.
            if is_iterable:
                sort_order = [self.__class__.negate_order_key(self.__class__, order_key) for order_key in sort_order]
            else:
                sort_order = self.__class__.negate_order_key(self.__class__, sort_order)
        result = {self.__class__.order_key: json.dumps(sort_order)}
        result.update(query)
        return result


    def get_context_data(self, **kwargs):
        context_data = super().get_context_data(**kwargs)
        context_data['cbv'] = self
        return context_data

    def get_queryset(self):
        queryset = super().get_queryset()
        sort_order = self.request.GET.get(self.__class__.order_key)
        if sort_order is None:
            self.current_sort_order = None
            return queryset
        sort_order = json.loads(sort_order)
        is_iterable = self.try_allowed_sort_order(sort_order)
        self.current_sort_order = sort_order
        return queryset.order_by(*sort_order) if is_iterable else queryset.order_by(sort_order)

class PostListView(ListView):

    def dispatch(self, request, *args, **kwargs):
        if request.method == 'POST':
            return self.post(request, *args, **kwargs)
        return super().dispatch(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        raise Exception('Not implemented')


class ContextDataMixin(object):

    extra_context_data = {}

    def get_context_data(self, **kwargs):
        context_data = self.__class__.extra_context_data.copy()
        context_data.update(super().get_context_data(**kwargs))
        return context_data
