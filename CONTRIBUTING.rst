============
Contributing
============

.. _Django: https://www.djangoproject.com/
.. _django_jinja_knockout: https://github.com/Dmitri-Sintsov/django-jinja-knockout
.. _djk-sample: https://github.com/Dmitri-Sintsov/djk-sample
.. _Selenium: http://www.seleniumhq.org/
.. _djk-sample unit tests: https://github.com/Dmitri-Sintsov/djk-sample#selenium-tests
.. _django-jinja-knockout python localization: https://poeditor.com/join/project/9hqQrFEdDM
.. _django-jinja-knockout javascript localization: https://poeditor.com/join/project/049HWzP3eb

`django_jinja_knockout`_ is an open source project originally written by very poor guy from Russia so feel free
to support it either by contributing new features / fixes / unit tests or by hiring me remotely to develop additional
required features.

Any non-trivial contribution will be recorded in authors list.

* Unit tests are partially implemented in `djk-sample`_ project which is used as showcase / testing project. `Selenium`_
  is used to test client-side parts of ``django-jinja-knockout``.
* The app is used in large enough project which is tested via actual manual work by real end-users.

You can contribute in many ways:

Types of Contributions
----------------------

Any good quality contribution is welcome.

Report Bugs
~~~~~~~~~~~

Report bugs at https://github.com/Dmitri-Sintsov/django-jinja-knockout/issues

If you are reporting a bug, please include:

* Your operating system name and Python / Django version used.
* Any details about your local setup that might be helpful in troubleshooting.
* Detailed steps to reproduce the bug.
* Feel free to fix bug or to suggest / implement a feature at github.

Translation / Localization
~~~~~~~~~~~~~~~~~~~~~~~~~~
If you know one of the currently available languages, please contribute to localization of the project:

* `django-jinja-knockout python localization`_
* `django-jinja-knockout javascript localization`_

There are not so many strings to translate so it should not take too much of time. However even incomplete localization
is better than none.

Submit Feedback
~~~~~~~~~~~~~~~

The best way to send feedback is to file an issue at https://github.com/Dmitri-Sintsov/django-jinja-knockout/issues

If you are proposing a feature:

* Explain in detail how it would work.
* Keep the scope as narrow as possible, to make it easier to implement.
* Remember that this is a volunteer-driven project, and that good quality contributions are welcome!

Get Started!
------------

Ready to contribute? Here's how to set up ``django_jinja_knockout`` for local development.

Fork the `django_jinja_knockout`_ repo on GitHub.

.. highlight:: bash

* Install your local copy into a virtualenv. Assuming you have virtualenvwrapper installed, this is how you set up your
  fork for local development::

    $ apt-get install python3-pip
    $ python3 -m venv django-jinja-knockout
    $ cd django-jinja-knockout/
    # Clone your fork locally
    $ git clone https://github.com/your_github_account/django-jinja-knockout.git
    $ source bin/activate
    # python setup.py develop
    $ cd django-jinja-knockout
    $ python3 -m pip install -U -r requirements.txt

Note that without `Django`_ installed, there is not much of usage for this pluggable app.

* Create a branch for local development::

    $ git checkout -b name-of-your-bugfix-or-feature

Now you can make your changes locally.

* Automated tests are partially implemented in `djk-sample unit tests`_.
* Check that your changes passes flake8::

    $ pip3 install flake8 flake8-bugbear
    $ flake8 --ignore E501 django_jinja_knockout

Then run the tests in `djk-sample unit tests`_

* Commit your changes and push your branch to GitHub::

    $ git add .
    $ git commit -m "Detailed description of your changes."
    $ git push origin name-of-your-bugfix-or-feature

* Submit a pull request through the GitHub website.

Write Documentation
~~~~~~~~~~~~~~~~~~~

`django_jinja_knockout`_ reusable application could always use more documentation, whether as part of the
official docs or in docstrings (but please not very long bloated ones).

Especially because I am not a native English speaker, though I try my best to avoid mistakes.

To check documentation changes install sphinx::

    python3 -m pip install sphinx

then run in your active virtual environment::

    $ cd $VIRTUAL_ENV/django-jinja-knockout/docs
    $ make html
    $ firefox _build/html/index.html &

Pull Request Guidelines
-----------------------

1. It would be great if the pull request included automated tests for `djk-sample`_.
2. If the pull request adds functionality, the docs should be updated. Implement new functionality into a function /
   class / method with a docstring. Major and important features should be briefly described in the README.rst /
   QUICKSTART.rst. Detailed documentation is not required but is welcomed and should be implemented in separate rst
   file.
3. The pull request should work for Python 3 / Django LTS at least.
