from django.core.management.base import BaseCommand
from django.apps import apps
from django.conf import settings
# from django.core.management.base import CommandError
# from django.utils.module_loading import import_string

from django_jinja_knockout.contenttypes import models_seeds, create_content_types


class Command(BaseCommand):
    # Django command help
    help = 'Seed initial data into the database after migrations are complete.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--create-content-types',
            action='store_true',
            dest='create_content_types',
            default=False,
            help='Create selected app models content types (by default is off).'
        )
        parser.add_argument(
            '--skip-seeds',
            action='store_true',
            dest='skip_seeds',
            default=False,
            help='Do not create seeds (creates them by default).'
        )
        parser.add_argument(
            '--only-apps',
            action='store',
            dest='only_apps',
            default=None,
            help='Apply seeds only to the comma-separated list of app labels.',
            type=str
        )
        parser.add_argument(
            '--only-models',
            action='store',
            dest='only_models',
            default=None,
            help='Apply seeds only to the comma-separated list of models.',
            type=str
        )
        parser.add_argument(
            '--exclude-apps',
            action='store',
            dest='exclude_apps',
            default='',
            help='Exclude app labels from applying seeds via comma-separated list.',
            type=str
        )
        parser.add_argument(
            '--exclude-models',
            action='store',
            dest='exclude_models',
            default='',
            help='Exclude models from applying seeds via comma-separated list.',
            type=str
        )

    def yield_app_config(self):
        for app_label in self.only_apps:
            if app_label not in self.exclude_apps:
                # app = import_string(f'{app_name}.apps')
                app_config = apps.get_app_config(app_label)
                yield app_config

    def get_app_label(self, app_name):
        return app_name.split('.')[-1]

    def handle(self, *args, **options):
        self.only_apps = [self.get_app_label(app_name) for app_name in settings.DJK_APPS] \
            if options['only_apps'] is None \
            else options['only_apps'].split(',')
        self.exclude_apps = options['exclude_apps'].split(',')
        only_models = None if options['only_models'] is None else options['only_models'].split(',')
        exclude_models = options['exclude_models'].split(',')
        if options['create_content_types']:
            for app_config in self.yield_app_config():
                print(f'Creating content types for app {app_config} models')
                create_content_types(sender=app_config)
        if not options['skip_seeds']:
            for app_config in self.yield_app_config():
                models_seeds(
                    sender=app_config,
                    recreate=True,
                    only_models=only_models,
                    exclude_models=exclude_models
                )
