from django import template
from django.template.loader import _engine_list
from django.template.base import token_kwargs
from django_jinja import backend

register = template.Library()


class JinjaNode(template.Node):

    def __init__(self, tpl, *args, **kwargs):
        self.template = tpl
        self.extra_context = kwargs.pop('extra_context', {})
        self.isolated_context = kwargs.pop('isolated_context', False)
        super(JinjaNode, self).__init__(*args, **kwargs)

    def get_jinja_engine(self):
        engines = _engine_list()
        for engine in engines:
            if isinstance(engine, backend.Jinja2):
                return engine
        raise ValueError('Cannot find django_jinja.backend.Jinja2')

    def render(self, context):
        try:
            tpl = self.template.resolve(context)
            # Does this quack like a Template?
            if not callable(getattr(tpl, 'render', None)):
                # If not, we'll try get_template
                tpl = self.get_jinja_engine().get_template(tpl)
            isolated_values = {
                name: var.resolve(context)
                for name, var in self.extra_context.items()
            }
            if self.isolated_context:
                return tpl.render(request=context.request, context=isolated_values)
            context_values = {}
            # Merge context dicts from all context processors available.
            for context_dict in context:
                context_values.update(context_dict)
            context_values.update(isolated_values)
            return tpl.render(request=context.request, context=context_values)
        except Exception:
            if context.template.engine.debug:
                raise
            return ''


@register.tag('jinja')
def do_jinja(parser, token):
    """
    Loads a Jinja2 template and renders it with the current context. You can pass
    additional context using keyword arguments.

    Example::

        {% jinja "foo/some_include" %}
        {% jinja "foo/some_include" with bar="BAZZ!" baz="BING!" %}

    Use the ``only`` argument to exclude the current context when rendering
    the included template::

        {% jinja "foo/some_include" only %}
        {% jinja "foo/some_include" with bar="1" only %}
    """
    tokens = token.split_contents()
    if len(tokens) < 2:
        raise template.TemplateSyntaxError(
            "%r tag takes at least one argument: the name of the template to "
            "be included." % tokens[0]
        )
    options = {}
    remaining_tokens = tokens[2:]
    while remaining_tokens:
        option = remaining_tokens.pop(0)
        if option in options:
            raise template.TemplateSyntaxError(
                'The %r option was specified more than once.' % option
            )
        if option == 'with':
            value = token_kwargs(remaining_tokens, parser, support_legacy=False)
            if not value:
                raise template.TemplateSyntaxError(
                    '"with" in %r tag needs at least one keyword argument.' % tokens[0]
                )
        elif option == 'only':
            value = True
        else:
            raise template.TemplateSyntaxError(
                'Unknown argument for %r tag: %r.' % (tokens[0], option)
            )
        options[option] = value
    isolated_context = options.get('only', False)
    namemap = options.get('with', {})
    return JinjaNode(
        parser.compile_filter(tokens[1]), extra_context=namemap, isolated_context=isolated_context
    )
