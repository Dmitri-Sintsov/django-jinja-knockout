#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import pip.download
from pip.req import parse_requirements

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
install_reqs = [str(ir.req) for ir in parse_requirements('requirements.txt', session=pip.download.PipSession())]

setup(
    name='django-jinja-knockout',
    version=version,
    description="""Django AJAX ModelForms. Read-only display ModelForms. Django AJAX grids with CRUD and custom actions. Supports DTL.""",
    long_description=readme + '\n\n' + history,
    author='Dmitriy Sintsov',
    author_email='questpc256@gmail.com',
    url='https://github.com/Dmitri-Sintsov/django-jinja-knockout',
    packages=[
        'django_jinja_knockout',
    ],
    include_package_data=True,
    install_requires=install_reqs,
    license="BSD",
    zip_safe=False,
    keywords='django jinja knockout.js ajax forms grid datagrid'.split(),
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
