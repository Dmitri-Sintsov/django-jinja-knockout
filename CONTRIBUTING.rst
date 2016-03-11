============
Contributing
============

``django_jinja_knockout`` is an open source project originally written by very poor guy from Russia so feel free
to support it either by contributing new features / fixes / unit tests or by hiring me remotely to develop additional
required features.

Any non-trivial contribution will be recorded in authors list.

You can contribute in many ways:

Types of Contributions
----------------------

Report Bugs
~~~~~~~~~~~

Report bugs at https://github.com/Dmitri-Sintsov/django-jinja-knockout/issues

If you are reporting a bug, please include:

* Your operating system name and Python / Django version used.
* Currently this reusable app supports only Python 3.4+ and Django 1.8 LTS, because I do not have enough time and
  resources to write unit tests and to check it througly against newer versions of Python / Django.
* While there is no automated tests, the app is used in large enough project which is tested via manual test cases.
* If I'll have the chance, I'd write unit tests and expand version usage, or you may help with that if this reusable app
  is useful to you.
* Any details about your local setup that might be helpful in troubleshooting.
* Detailed steps to reproduce the bug.
* Feel free to fix bug or to suggest / implement a feature at github.

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


Fork the ``django_jinja_knockout`` repo on GitHub.

3. Install your local copy into a virtualenv. Assuming you have virtualenvwrapper installed, this is how you set up your fork for local development::

    $ apt-get install python3-pip
    $ python3 -m venv django-jinja-knockout
    $ cd django-jinja-knockout/
    # Clone your fork locally
    $ git clone https://github.com/your_github_account/django-jinja-knockout.git
    $ source bin/activate
    # python setup.py develop
    $ cd django-jinja-knockout
    $ python3 -m pip install -U -r requirements.txt

See the following link, if you are using Ubuntu 14.04 https://bugs.launchpad.net/ubuntu/+source/python3.4/+bug/1290847

Note that without ``Django`` installed, there is not much of usage in this pluggable app.

4. Create a branch for local development::

    $ git checkout -b name-of-your-bugfix-or-feature

Now you can make your changes locally.

5. There is no automated tests and no continuous integration yet, alas.
When these will be available (not now!!!), check that your changes passes flake8 and the
tests, including testing other Python versions with tox::

    $ flake8 django_jinja_knockout tests
    $ python setup.py test
    $ tox

To get flake8 and tox::

    python3 -m pip install flake8 tox

6. Commit your changes and push your branch to GitHub::

    $ git add .
    $ git commit -m "Detailed description of your changes."
    $ git push origin name-of-your-bugfix-or-feature

7. Submit a pull request through the GitHub website.

Write Documentation
~~~~~~~~~~~~~~~~~~~

``django_jinja_knockout`` reusable app could always use more documentation, whether as part of the
official docs, in docstrings (but please not very long bloated ones).

Especially because I am not native English speaker, though I try my best to avoid mistakes.

To check documentation changes install sphinx::

    python3 -m pip install sphinx

then run in your active virtual environment::

    $ cd $VIRTUAL_ENV/django-jinja-knockout/docs
    $ make html
    $ firefox _build/html/index.html &

Pull Request Guidelines
-----------------------

Before you submit a pull request, check that it meets these guidelines:

1. It would be great if the pull request included automated tests, but that is not required yet.
2. If the pull request adds functionality, the docs should be updated. Put your new functionality into a function
   with a docstring, and add the feature to the list in README.rst.
3. The pull request should work for Python 3.4 / Django 1.8 at least.

Tips
----

To run a subset of tests (not available yet!)::

    $ python3 -m unittest tests.test_django_jinja_knockout
