#!/usr/bin/env python
# -*- coding: utf-8 -*-

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

setup(
    name='django-jinja-knockout',
    version=version,
    description="""Bootstrap / Jinja2 / Knockout.js integration into Django projects.""",
    long_description=readme + '\n\n' + history,
    author='Dmitriy Sintsov',
    author_email='questpc256@gmail.com',
    url='https://github.com/Dmitri-Sintsov/django-jinja-knockout',
    packages=[
        'django_jinja_knockout',
    ],
    include_package_data=True,
    install_requires=[
    ],
    license="BSD",
    zip_safe=False,
    keywords='django-jinja-knockout',
    classifiers=[
        'Environment :: Web Environment',
        'Framework :: Django',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: BSD License',
        'Operating System :: OS Independent',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.4',
        'Topic :: Internet :: WWW/HTTP',
        'Topic :: Internet :: WWW/HTTP :: Dynamic Content',
    ],
)
