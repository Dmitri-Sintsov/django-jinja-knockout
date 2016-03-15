==============
Jinja2 macros
==============

ModelForms
----------

Usual ModelForm generation syntax is::

    {% extends 'base_min.htm' %}
    {% from 'bs_form.htm' import bs_form with context %}

    {% block main %}

    {{ bs_form(form=form, action=url('my_url_name'), opts={
        'class': 'form_css_class',
        'title': request.view_title,
        'submit_text': 'My button'
    }) }}

    {% endblock main %}


Inline formsets
---------------

Extended formset generation syntax is::

    {% extends 'base_min.htm' %}
    {% from 'bs_inline_formsets.htm' import bs_inline_formsets with context %}

    {% call(kwargs)
    bs_inline_formsets(related_form=form, formsets=formsets, action=url('my_url'), html={
        'class': 'project',
        'title': form.instance,
        'submit_text': 'My submit button'
    }) %}

    {% if 'formset_end' in kwargs and kwargs.formset_end.prefix == 'projectmember_set' %}
    {% set total_cost = form.project.get_total_cost() %}
    {% if total_cost > 0 %}
    <div class="default-padding">
        <table class="table">
            <colgroup>
                <col class="{{ kwargs.html.layout_classes.label }}">
                <col class="{{ kwargs.html.layout_classes.field }}">
            </colgroup>
            <tr>
                <th class="success">Total cost</th>
                <td class="info">{{ format_currency(total_cost) }}</td>
            </tr>
        </table>
    </div>
    {% endif %}

    {% endif %}

    {% endcall %}
