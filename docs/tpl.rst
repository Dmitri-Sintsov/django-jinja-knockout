.. _get_str_fields(): https://github.com/Dmitri-Sintsov/djk-sample/search?utf8=%E2%9C%93&q=get_str_fields

======
tpl.py
======

Various formatting functions, primarily to be used in ``django.admin`` ``admin.ModelAdmin`` classes ``readonly_fields``,
Jinja2 templates and ``DisplayText`` widgets.

* ``limitstr()`` - cut string after specified length.
* ``repeat_insert()`` - separate string every nth character with specified separator characters.
* ``print_list()`` - print nested HTML list. Used to format HTML in JSON responses and in custom ``DisplayText``
  widgets.
* ``print_table()`` - print uniform 2D table (no colspan / rowspan yet).
* ``print_bs_labels()`` - print HTML list as Boostrap 3 labels.
* ``reverseq()`` - construct url with query parameters from url name. Since version 0.4.0, when request instance is
  supplied, absolute url will be returned.

* Manipulation with css classes:

 * ``add_css_classes()`` - similar to client-side ``jQuery.addClass()``;
 * ``remove_css_classes()`` - similar to client-side ``jQuery.removeClass()``;
 * ``add_css_classes_to_dict()`` - optimized for usage as argument of ``django.forms.utils`` ``flatatt()``;
 * ``remove_css_classes_from_dict()`` - optimized for usage as argument of ``django.forms.utils`` ``flatatt()``;

* ``html_to_text()`` - convert HTML fragment with anchor links into plain text with text links. It's used in
  :doc:`utils_mail` ``SendmailQueue`` to convert HTML body of email message to text-only body.
* ``format_local_date()`` - output localized ``Date`` / ``DateTime``.

* ``str_dict()`` - Django models could define `get_str_fields()`_ method which maps model instance field values to their
  formatted string values, similar to ``Model`` ``__str()__`` method, but for each or to some selected separate fields.

  If these models have foreign keys pointing to another models which also have `get_str_fields()`_ defined,
  ``str_dict()`` can be used to convert nested dict `get_str_fields()`_ values to flat strings in ``__str__()`` method::

    class Member(models.Model):

        # ... skipped ...

        def get_str_fields(self):
            parts = OrderedDict([
                ('profile', self.profile.get_str_fields()),
                ('club', self.club.get_str_fields()),
                ('last_visit', format_local_date(timezone.localtime(self.last_visit))),
                ('plays', self.get_plays_display()),
                ('role', self.get_role_display()),
                ('is_endorsed', 'endorsed' if self.is_endorsed else 'unofficial')
            ])
            return parts

        def __str__(self):
            # Will flatten 'profile' and 'club' str_fields dict keys values
            # and convert the whole str_fields dict values into str.
            str_fields = self.get_str_fields()
            return str_dict(str_fields)

Internally ``str_dict()`` uses lower level ``flatten_dict()`` function which is defined in the same source file.
