import re
from ast import literal_eval

from django import template

register = template.Library()

double_quotes_pattern = re.compile(r'^"|"$')
single_quotes_pattern = re.compile(r'^\'|\'$')


class AstEvalNode(template.Node):

    def __init__(self, varname, eval_str):
        self.varname = varname
        self.eval_str = eval_str

    def render(self, context):
        if self not in context.render_context:
            try:
                context.render_context[self] = literal_eval(self.eval_str)
            except Exception:
                if context.template.engine.debug:
                    raise SyntaxError(self.eval_str)
                context.render_context[self] = ''
        context[self.varname] = context.render_context[self]
        return ''


def do_ast_eval(parser, token):
    tokens = token.split_contents()
    if len(tokens) < 3:
        raise template.TemplateSyntaxError(
            "%r tag takes exactly two arguments: context variable name and string to be evaluated" % tokens[0]
        )
    elif len(tokens) == 3:
        if double_quotes_pattern.search(tokens[2]):
            eval_str = double_quotes_pattern.sub('', tokens[2])
        elif single_quotes_pattern.search(tokens[2]):
            eval_str = single_quotes_pattern.sub('', tokens[2])
        else:
            eval_str = tokens[2]
    else:
        eval_str = ' '.join(tokens[2:])
    return AstEvalNode(tokens[1], eval_str)


register.tag('ast_eval', do_ast_eval)
