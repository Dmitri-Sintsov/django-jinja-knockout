from django.db import models, transaction
from django.db.models import Count, F, Value as V
from django.db.models.functions import Concat


# https://gist.github.com/victorono/cd9d14b013487b8b22975512225c5b4c
# https://docs.djangoproject.com/en/3.0/topics/db/aggregation/#order-of-annotate-and-values-clauses
# https://stackoverflow.com/questions/54249645/how-to-find-duplicate-records-based-on-certain-fields-in-django
class DupesManager(models.Manager):

    # Do not set the value to 0, otherwise all records will be deleted.
    max_dupe_count = 1
    dupe_id = 'dupe_id'
    dupe_count = 'dupe_count'

    def find_dupes(self, *fields):
        f_fields = []
        first = True
        for field in fields:
            if first:
                first = False
            else:
                f_fields.append(V('…'))
            f_fields.append(F(field))
        annotate_kwargs = {
            self.dupe_id=Concat(*f_fields, output_field=models.CharField())
            self.dupe_count=Count(self.dupe_id)
        }
        filter_kwargs = {
            f'{self.dupe_count}__gt'=self.max_dupe_count
        }
        qs = self.values(
            *fields
        ).order_by().annotate(
            **annotate_kwargs
        ).filter(
            **filter_kwargs
        )
        return qs

    def clear_dupes(self, *fields):
        dupes = self.find_dupes(*fields)
        for dupe in dupes:
            prune_kwargs = {field: dupe[field] for field in fields}
            self.prune_unique_together(**prune_kwargs)

    # Override in child class for smart filtering.
    def filter_dupe_pks(self, pks):
        return pks[self.max_dupe_count:]

    def prune_unique_together(self, **fields):
        pks_to_delete = []
        with transaction.atomic():
            pks = self.filter(**fields).values_list('pk', flat=True)
            if len(pks) > self.max_dupe_count:
                pks_to_delete = self.filter_dupe_pks(pks)
                self.filter(pk__in=pks_to_delete).delete()
        return pks, pks_to_delete

