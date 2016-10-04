from copy import copy

from django.db import DEFAULT_DB_ALIAS, connections
from django.db.models.query import RawQuerySet, QuerySet


class FilteredRawQuerySet(RawQuerySet):

    @classmethod
    def clone_raw(cls, raw_qs, qs=None):
        if not isinstance(raw_qs, RawQuerySet):
            raise ValueError('raw_qs must be an instance of RawQuerySet')
        self = cls(
            raw_query=raw_qs.raw_query,
            model=raw_qs.model,
            query=raw_qs.query,
            params=raw_qs.params,
            translations=raw_qs.translations,
            using=raw_qs._db,
            hints=raw_qs._hints
        )
        self.qs = raw_qs.model.objects.all() if qs is None else qs
        return self

    def filter(self, *args, **kwargs):
        return self.qs.filter(*args, **kwargs)

    def exclude(self, *args, **kwargs):
        return self.qs.exclude(*args, **kwargs)

    def order_by(self, *field_names):
        return self.qs.order_by(*field_names)

    def distinct(self, *field_names):
        return self.qs.distinct(*field_names)

    def _clone(self):
        c = self.__class__.clone_raw(self, qs=self.qs._clone())
        return c

    def _execute_query(self):
        result = [self.sql]
        params = copy(self.params)

        try:
            compiler = self.qs.query.get_compiler(DEFAULT_DB_ALIAS)
            extra_select, order_by, group_by = compiler.pre_sql_setup()

            distinct_fields = compiler.get_distinct()

            where, w_params = compiler.compile(compiler.query.where)
            if where:
                result.append('WHERE %s' % where)
                params.extend(w_params)

            having, h_params = compiler.compile(compiler.query.having)
            if having:
                result.append('HAVING %s' % having)
                params.extend(h_params)

            if compiler.query.distinct:
                distinct_result = compiler.connection.ops.distinct_sql(distinct_fields)

            grouping = []
            for g_sql, g_params in group_by:
                grouping.append(g_sql)
                params.extend(g_params)
            if grouping:
                if distinct_fields:
                    raise NotImplementedError(
                        "annotate() + distinct(fields) is not implemented.")
                if not order_by:
                    order_by = compiler.connection.ops.force_no_ordering()
                result.append('GROUP BY %s' % ', '.join(grouping))

            if having:
                result.append('HAVING %s' % having)
                params.extend(h_params)

            if order_by:
                ordering = []
                for _, (o_sql, o_params, _) in order_by:
                    ordering.append(o_sql)
                    params.extend(o_params)
                result.append('ORDER BY %s' % ', '.join(ordering))

            if compiler.query.low_mark != compiler.query.high_mark:
                if compiler.query.high_mark is not None:
                    result.append('LIMIT %d' % (compiler.query.high_mark - compiler.query.low_mark))
                if compiler.query.low_mark:
                    if compiler.query.high_mark is None:
                        val = self.connection.ops.no_limit_value()
                        if val:
                            result.append('LIMIT %d' % val)
                    result.append('OFFSET %d' % compiler.query.low_mark)
        finally:
            # Finally do cleanup - get rid of the joins we created above.
            compiler.query.reset_refcounts(refcounts_before)

        self.cursor = connections[self.using].cursor()
        self.cursor.execute(' '.join(result), params)
