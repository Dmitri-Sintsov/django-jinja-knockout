from django import template

from ..context_processors import create_page_context

register = template.Library()


class InitPageContextNode(template.Node):

    def render(self, context):
        if 'page_context' not in context:
            context['page_context'] = create_page_context(request=context['request'])
        return ''


def init_page_context(parser, token):
    return InitPageContextNode()


register.tag('init_page_context', init_page_context)
