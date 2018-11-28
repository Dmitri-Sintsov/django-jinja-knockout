#!/usr/bin/env python
# -*- coding: utf-8 -*-

# Setup ~/.pypirc at https://packaging.python.org/guides/migrating-to-pypi-org/
# python setup.py sdist
# pip3 install twine
# twine upload -r test dist/django-jinja-knockout-0.6.0.tar.gz

import os
import sys

import django_jinja_knockout

try:
    from setuptools import setup
except ImportError:
    from distutils.core import setup

version = django_jinja_knockout.__version__

if sys.argv[-1] == 'publish':
    os.system('python setup.py sdist upload')
    os.system('python setup.py bdist_wheel upload')
    sys.exit()

if sys.argv[-1] == 'tag':
    print("Tagging the version on github:")
    os.system("git tag -a %s -m 'version %s'" % (version, version))
    os.system("git push --tags")
    sys.exit()

readme = open('README.rst').read()
history = open('HISTORY.rst').read().replace('.. :changelog:', '')

# http://stackoverflow.com/questions/14399534/how-can-i-reference-requirements-txt-for-the-install-requires-kwarg-in-setuptool
with open('requirements.txt', 'r') as f:
    install_reqs = [
        s for s in [
            line.strip(' \n') for line in f
        ] if not s.startswith('#') and s != ''
    ]

setup(
    name='django-jinja-knockout',
    version=version,
    description="""Django AJAX ModelForms. Read-only display ModelForms. Django AJAX grids with CRUD and custom actions. Supports Django Templates.""",
    long_description=readme + '\n\n' + history,
    author='Dmitriy Sintsov',
    author_email='questpc256@gmail.com',
    url='https://github.com/Dmitri-Sintsov/django-jinja-knockout',
    packages=[
        'django_jinja_knockout',
    ],
    include_package_data=True,
    install_requires=install_reqs,
    license="LGPL-3.0",
    zip_safe=False,
    keywords='django jinja knockout.js ajax forms grid datagrid datatables'.split(),
    classifiers=[
        'Development Status :: 4 - Beta',
        'Environment :: Web Environment',
        'Framework :: Django',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: BSD License',
        'Operating System :: OS Independent',
        'Programming Language :: Python :: 3',
        'Topic :: Internet :: WWW/HTTP :: Dynamic Content',
    ],
)
