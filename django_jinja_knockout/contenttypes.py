from django.db import connection, transaction
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType


def create_content_types(sender):
    ContentType.objects.get_for_models(*sender.get_models())


@transaction.atomic()
def create_additional_permissions(ADDITIONAL_PERMISSIONS):
    # Permission.objects.raw("UPDATE auth_permission SET name = regexp_replace(name, '^(Can add )(.*)', 'Может редактировать \2')")
    for model_name, permdef in ADDITIONAL_PERMISSIONS.items():
        content_type = ContentType.objects.filter(model=model_name).first()
        if content_type is None:
            raise ValueError('No such content type: {0}'.format(content_type))
        for codename, name in permdef.items():
            # Create or update new permission.
            Permission.objects.update_or_create(
                content_type=content_type, codename=codename, defaults={
                    'name': name
                }
            )


# Create built-in groups and assign permissions to these according to BUILTIN_GROUPS defined values.
@transaction.atomic()
def create_builtin_user_groups(BUILTIN_GROUPS):
    for group_name, permissions in BUILTIN_GROUPS.items():
        group, created = Group.objects.get_or_create(name=group_name)
        for model_name, codenames in permissions.items():
            content_type = ContentType.objects.filter(model=model_name).first()
            if content_type is None:
                raise ValueError('No such content type: {0}'.format(content_type))
            if codenames == '__all__':
                # Add all permissions to model.
                for permission in Permission.objects.filter(content_type=content_type):
                    group.permissions.add(permission)
            else:
                # Add specific CRUD permissions to model.
                for codename in codenames:
                    permission = Permission.objects.filter(content_type=content_type, codename=codename).first()
                    if permission is None:
                        raise ValueError('No such permission: {0}'.format(codename))
                    group.permissions.add(permission)
        group.save()


# Automatic seeding for app models, both from post_migrate signal and from management command.
def models_seeds(sender, recreate=False, only_models=None, exclude_models: list = None, **kwargs):
    if exclude_models is None:
        exclude_models = []
    # https://gist.github.com/rctay/527113
    for model in sender.get_seed_list() if hasattr(sender, 'get_seed_list') else sender.get_models():
        table_name = model._meta.db_table
        if table_name in connection.introspection.table_names():
            model_str = '.'.join([model._meta.app_label, model._meta.object_name])
            if (only_models is not None and model_str not in only_models) or model_str in exclude_models:
                continue
            if hasattr(model, 'seed'):
                print('Creating seed for table={0}, model={1}, recreate={2}'.format(table_name, model_str, recreate))
                model.seed(recreate)
