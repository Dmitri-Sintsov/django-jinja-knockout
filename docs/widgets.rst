.. _$.optionalInput: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?utf8=%E2%9C%93&q=optionalinput
.. _bs_field(): https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/bs_field.htm
.. _DisplayText sample: https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=get_text_method&type=
.. _djk_sample: https://github.com/Dmitri-Sintsov/djk-sample
.. _ForeignKeyGridWidget wiki: https://github.com/Dmitri-Sintsov/djk-sample/wiki#ajax-inline-editing-with-foreign-key-editing
.. _MultipleKeyGridWidget: https://github.com/Dmitri-Sintsov/djk-sample/search?l=Python&q=MultipleKeyGridWidget
.. _ListQuerySet: https://github.com/Dmitri-Sintsov/django-jinja-knockout/search?l=Python&q=listqueryset&type=&utf8=%E2%9C%93
.. _plugins.js: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/static/djk/js/plugins.js
.. _PrefillWidget: https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=PrefillWidget&type=
.. _vLargeTextField: https://github.com/django/django/search?q=vLargeTextField&unscoped_q=vLargeTextField
.. _widget_prefill_dropdown.htm: https://github.com/Dmitri-Sintsov/django-jinja-knockout/blob/master/django_jinja_knockout/jinja2/render/widget_prefill_dropdown.htm

==========
widgets.py
==========

OptionalWidget
--------------

`OptionalWidget`_ - A two-component ``MultiField``: a checkbox that indicates optional value and a field itself
(``widget_class`` = ``Textarea`` by default). The field itself is enabled / disabled accrording to the checkbox state
via client-side `$.optionalInput`_ plugin, implemented in `plugins.js`_::

    from django_jinja_knockout.widgets import OptionalWidget

    OptionalWidget(attrs={'class': 'autogrow vLargeTextField', 'cols': 40, 'rows': 2})

See also `vLargeTextField`_ usage, although it's optional and is not the requirement for `OptionalWidget`_.

DisplayText
-----------

`DisplayText`_ - Read-only widget for existing ``ModelForm`` bound objects. Assign to ``ModelForm.widgets`` or to
``ModelForm.fields.widget`` to make selected form fields displayed as read-only text.

Use ``DisplayModelMetaclass`` from ``django_jinja_knockout.forms`` to set all field widgets of form as
``DisplayText``, making the whole form read-only.

In last case the form will have special table rendering in Jinja2 `bs_field()`_ macro.

Widget allows to specify custom formatting callback to display complex fields, including foreign relationships,
pre-defined string mapping for scalar ``True`` / ``False`` / ``None`` and layout override for :ref:`macros_bs_form`
/ :ref:`macros_bs_inline_formsets` macros. Note that it's possible to call these macros from Django language
templates like this::

    {% jinja 'bs_form.htm' with _render_=1 form=form action=view_action opts=opts %}

For example, to override ``Member`` model ``note`` field `DisplayText`_ widget html output via ``get_text_method()``::

    class MemberDisplayForm(WidgetInstancesMixin, RendererModelForm, metaclass=DisplayModelMetaclass):

        class Meta:

            def get_note(self, value):
                # self.instance.accepted_license.version
                if self.instance is None or self.instance.note.strip() == '':
                    # Do not display empty row.
                    self.skip_output = True
                    return None
                return format_html_attrs(
                    '<button {attrs}>Read</button>',
                    attrs={
                        'class': 'component btn btn-info',
                        'data-component-class': 'App.Dialog',
                        'data-event': 'click',
                        'data-component-options': {
                            'title': '<b>Note for </b> <i>{}</i>'.format(self.instance.profile),
                            'message': format_html('<div class="preformatted">{}</div>', self.instance.note),
                            'method': 'alert'
                        }
                    }
                )

            model = Member
            fields = '__all__'
            widgets = {
                'note': DisplayText(get_text_method=get_note)
            }


See `DisplayText sample`_ for the complete example.

.. _widgets_foreignkeygridwidget:

ForeignKeyGridWidget
--------------------

Implements django.admin -like widget to select the foreign key value with the optional support of in-place CRUD editing
of foreign key table rows.

* `ForeignKeyGridWidget wiki`_

See :ref:`datatables_foreignkeygridwidget` section of :doc:`datatables` for the detailed explanation.

Here is the scrinshot of the `ForeignKeyGridWidget`_ running `djk_sample`_ project:

.. image:: https://raw.githubusercontent.com/wiki/Dmitri-Sintsov/djk-sample/djk_change_or_create_foreign_key_for_inline_form.png
  :width: 740px

MultipleKeyGridWidget
---------------------

django.admin -like widget to select multiple foreign key values for the form relation.

See :ref:`datatables_multiplekeygridwidget` section of :doc:`datatables` for the detailed explanation.

PrefillWidget
-------------

`PrefillWidget`_ - Django form input field which supports both free text and quick filling of input text value from
the list of prefilled choices. `ListQuerySet`_ has ``prefill_choices()`` method, which allows to generate lists of
choices for `PrefillWidget`_ initial values like this::

    from django_jinja_knockout.widgets import PrefillWidget
    from django_jinja_knockout.query import ListQuerySet

    # ...

    self.related_members_qs = ListQuerySet(
        Member.objects.filter(
            club__id=self.request.resolver_match.kwargs.get('club_id', None)
        )
    )
    if self.related_members_qs.count() > 1 and isinstance(form, MemberForm):
        # Replace standard Django CharField widget to PrefillWidget with incorporated standard field widget:
        form.fields['note'].widget = PrefillWidget(
            data_widget=form.fields['note'].widget,
            choices=self.related_members_qs.prefill_choices('note')
        )
        # Replace one more field widget to PrefillWidget:
        form.fields['name'].widget = PrefillWidget(
            data_widget=form.fields['name'].widget,
            choices=self.related_members_qs.prefill_choices('name')
        )

See ``djk-sample`` project for the sample of `PrefillWidget`_ usage with inline formsets. It is even simpler to use this
widget in single ModelForm without the inline formsets.

See `widget_prefill_dropdown.htm`_ macro for the default rendering of `PrefillWidget`_.
