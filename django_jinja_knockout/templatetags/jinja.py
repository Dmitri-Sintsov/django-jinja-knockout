from django import template
from django.template.loader import _engine_list
from django_jinja import backend

register = template.Library()


def do_jinja(parser, token):
    try:
        # split_contents() knows not to split quoted strings.
        tag_name, format_string = token.split_contents()
    except ValueError:
        raise template.TemplateSyntaxError(
            "%r tag requires a single argument" % token.contents.split()[0]
        )
    if not (format_string[0] == format_string[-1] and format_string[0] in ('"', "'")):
        raise template.TemplateSyntaxError(
            "%r tag's argument should be in quotes" % tag_name
        )
    return JinjaNode(format_string[1:-1])


class JinjaNode(template.Node):

    def __init__(self, template_name):
        self.template_name = template_name

    def render(self, context):
        engines = _engine_list()
        for engine in engines:
            if isinstance(engine, backend.Jinja2):
                t = engine.get_template(self.template_name)
                template_context = {}
                # Merge context dicts from all context processors available.
                for context_dict in context:
                    template_context.update(context_dict)
                return t.render(request=context.request, context=context_dict)
        raise ValueError('Cannot find django_jinja.backend.Jinja2')


# {% jinja 'template.htm' %}
register.tag('jinja', do_jinja)
