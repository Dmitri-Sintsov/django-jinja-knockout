from optparse import make_option
from django.core.management.base import BaseCommand
from django.apps import apps
from django.conf import settings
# from django.core.management.base import CommandError
# from django.utils.module_loading import import_string

from django_jinja_knockout.contenttypes import models_seeds, create_content_types


class Command(BaseCommand):
    # Django command help
    help = 'Seed initial data into the database after migrations are complete.'
    # https://docs.python.org/3/library/optparse.html#module-optparse
    option_list = BaseCommand.option_list + (
        make_option(
            '--create-content-types',
            action='store_true',
            dest='create_content_types',
            default=False,
            help='Create selected app models content types (by default is off).'
        ),
        make_option(
            '--skip-seeds',
            action='store_true',
            dest='skip_seeds',
            default=False,
            help='Do not create seeds (creates them by default).'
        ),
        make_option(
            '--only-apps',
            action='store',
            dest='only_apps',
            default=None,
            help='Apply seeds only to the comma-separated list of apps.',
            type='string'
        ),
        make_option(
            '--only-models',
            action='store',
            dest='only_models',
            default=None,
            help='Apply seeds only to the comma-separated list of models.',
            type='string'
        ),
        make_option(
            '--exclude-apps',
            action='store',
            dest='exclude_apps',
            default='',
            help='Exclude apps from applying seeds via comma-separated list.',
            type='string'
        ),
        make_option(
            '--exclude-models',
            action='store',
            dest='exclude_models',
            default='',
            help='Exclude models from applying seeds via comma-separated list.',
            type='string'
        ),
    )

    def yield_app_config(self):
        for app_name in self.only_apps:
            if app_name not in self.exclude_apps:
                # isp_app = import_string('{}.apps'.format(app_name))
                isp_app_config = apps.get_app_config(app_name)
                yield isp_app_config

    def handle(self, *args, **options):
        self.only_apps = settings.DJK_APPS if options['only_apps'] is None else options['only_apps'].split(',')
        self.exclude_apps = options['exclude_apps'].split(',')
        only_models = None if options['only_models'] is None else options['only_models'].split(',')
        exclude_models = options['exclude_models'].split(',')
        if options['create_content_types']:
            for isp_app_config in self.yield_app_config():
                print('Creating content types for app {0} models'.format(isp_app_config))
                create_content_types(sender=isp_app_config)
        if not options['skip_seeds']:
            for isp_app_config in self.yield_app_config():
                models_seeds(
                    sender=isp_app_config,
                    recreate=True,
                    only_models=only_models,
                    exclude_models=exclude_models
                )
