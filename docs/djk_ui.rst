.. _3bs.sh: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/cli/3bs.sh
.. _4bs.sh: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/cli/4bs.sh
.. _5bs.sh: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/cli/5bs.sh
.. _Bootstrap 3: https://getbootstrap.com/docs/3.3/
.. _Bootstrap 4: https://getbootstrap.com/docs/4.6/
.. _Bootstrap 5: https://getbootstrap.com/docs/5.1/
.. _djk-bootstrap3: https://github.com/Dmitri-Sintsov/djk-bootstrap3
.. _djk-bootstrap4: https://github.com/Dmitri-Sintsov/djk-bootstrap4
.. _djk-bootstrap5: https://github.com/Dmitri-Sintsov/djk-bootstrap5
.. _requirements-bs3.txt: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/requirements/bs3.txt
.. _requirements-bs4.txt: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/requirements/bs4.txt
.. _requirements-bs5.txt: https://github.com/Dmitri-Sintsov/djk-sample/blob/master/requirements/bs5.txt

======
djk_ui
======

django-jinja-knockout supports `Bootstrap 3`_ / `Bootstrap 4`_ / `Bootstrap 5`_ via the ``djk_ui`` Django application
module.

``djk_ui`` module is installed from `djk-bootstrap3`_ / `djk-bootstrap4`_ / `djk-bootstrap5`_ packages, respectively.
This means that `djk-bootstrap3`_ / `djk-bootstrap4`_ / `djk-bootstrap5`_ packages are mutually exclusive and only one
has to be installed in the project virtualenv at the same time.

Unfortunately pip does not support requirements.txt files with de-installation directives. Thus one has to use pip with
separate `requirements-bs3.txt`_ / `requirements-bs4.txt`_ / `requirements-bs5.txt`_ files, to install the current
stable version, or to copy and then run `3bs.sh`_ / `4bs.sh`_ / `5bs.sh`_ shell scripts, to switch between current
master (possibly unstable) versions of ``djk_ui``. Usually most of projects does not require changing Bootstrap version
on the fly, so that's not much of problem.

.. _djk_ui_conf:

conf.py
-------
Contains the default ``layout_classes`` values, for example for Bootstrap 5 (version 2.2.1)::

    LAYOUT_CLASSES = {
        '': {
            'label': 'col-md-3',
            'field': 'col-md-7',
        },
        'display': {
            'label': 'w-25 table-info',
            'field': 'w-100 table-light',
        },
    }

where '' key specifies the layout classes of editable model forms, 'display' key specifies the layout classes of the
display-only model forms.

These default values can be overridden via the project `settings` module ``LAYOUT_CLASSES`` variable. See also
:ref:`forms_opts` for more info how layout classes are applied to form / formset renderers; see
:ref:`macros_layout_classes` how layout classes are used in form / formset macros.

.. _djk_ui_tpl:

tpl.py
------
Contains nested list / dict formatters, specific to used Bootstrap version. See :doc:`tpl` for more info.

Customization
-------------
This module implements both server-side (Python) and client-side (Javascript) parts of the code that differs between
`Bootstrap 3`_ / `Bootstrap 4`_ / `Bootstrap 5`_. While it's possible to implement much larger ``djk_ui`` wrappers for
more generic non-Bootstrap based UIs, currently I do not have enough of time / resources for that.
