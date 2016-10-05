import types
from copy import copy

from django.db import DEFAULT_DB_ALIAS, connections
from django.db.models.sql.compiler import SQLCompiler
from django.db.models.sql import RawQuery
from django.db.models.query import RawQuerySet, QuerySet, ValuesQuerySet


class RawSqlCompiler(SQLCompiler):

    def __init__(self, query, connection, using):
        super().__init__(query, connection, using)
        self.raw_query = None

    def as_sql(self):
        refcounts_before = self.query.alias_refcount.copy()
        try:
            result = [self.raw_query.sql]
            params = list(self.raw_query.params)
            extra_select, order_by, group_by = self.pre_sql_setup()

            distinct_fields = self.get_distinct()

            where, w_params = self.compile(self.query.where)
            if where:
                result.append('WHERE %s' % where)
                params.extend(w_params)

            having, h_params = self.compile(self.query.having)
            if having:
                result.append('HAVING %s' % having)
                params.extend(h_params)

            if self.query.distinct:
                distinct_result = self.connection.ops.distinct_sql(distinct_fields)

            grouping = []
            for g_sql, g_params in group_by:
                grouping.append(g_sql)
                params.extend(g_params)
            if grouping:
                if distinct_fields:
                    raise NotImplementedError(
                        "annotate() + distinct(fields) is not implemented.")
                if not order_by:
                    order_by = self.connection.ops.force_no_ordering()
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

            if self.query.low_mark != self.query.high_mark:
                if self.query.high_mark is not None:
                    result.append('LIMIT %d' % (self.query.high_mark - self.query.low_mark))
                if self.query.low_mark:
                    if self.query.high_mark is None:
                        val = self.connection.ops.no_limit_value()
                        if val:
                            result.append('LIMIT %d' % val)
                    result.append('OFFSET %d' % self.query.low_mark)
            # return result, params
            return ' '.join(result), tuple(params)
        finally:
            # Finally do cleanup - get rid of the joins we created above.
            self.query.reset_refcounts(refcounts_before)

class FilteredRawQuery(RawQuery):

    def __init__(self, sql, using, params=None, context=None):
        super().__init__(sql, using, params, context)
        self.filtered_query = None

    @classmethod
    def clone_raw_query(cls, raw_query=None, filtered_query=None):
        if not isinstance(raw_query, RawQuery):
            raise ValueError('raw_query must be an instance of RawQuery')
        self = cls(
            sql=raw_query.sql,
            using=raw_query.using,
            params=raw_query.params,
            context=raw_query.context.copy()
        )
        self.filtered_query = filtered_query
        for prop in ('cursor', 'low_mark', 'high_mark', 'extra_select', 'annotation_select'):
            setattr(self, prop, getattr(raw_query, prop))
        return self

    def get_compiler(self, using=None, connection=None):
        compiler = self.filtered_query.get_compiler(using, connection)
        compiler.as_sql = types.MethodType(RawSqlCompiler.as_sql, compiler)
        compiler.raw_query = self
        return compiler

    def _execute_query(self):
        compiler = self.get_compiler(DEFAULT_DB_ALIAS)
        result, params = compiler.as_sql()

        self.cursor = connections[self.using].cursor()
        self.cursor.execute(result, params)


class FilteredRawQuerySet(RawQuerySet):

    @classmethod
    def clone_raw_queryset(cls, raw_qs, qs=None):
        if not isinstance(raw_qs, RawQuerySet):
            raise ValueError('raw_qs must be an instance of RawQuerySet')
        filtered_qs = raw_qs.model.objects.all() if qs is None else qs
        if not isinstance(filtered_qs, QuerySet):
            raise ValueError('filtered_qs must be an instance of QuerySet')
        query = raw_qs.query if isinstance(raw_qs.query, FilteredRawQuery) else FilteredRawQuery.clone_raw_query(
            raw_query=raw_qs.query,
            filtered_query=filtered_qs.query
        )
        self = cls(
            raw_query=raw_qs.raw_query,
            model=raw_qs.model,
            query=query,
            params=raw_qs.params,
            translations=raw_qs.translations,
            using=raw_qs._db,
            hints=raw_qs._hints
        )
        self.filtered_qs = filtered_qs
        return self

    def filter(self, *args, **kwargs):
        self.filtered_qs = self.filtered_qs.filter(*args, **kwargs)
        self.query.filtered_query = self.filtered_qs.query
        return self

    def exclude(self, *args, **kwargs):
        self.filtered_qs = self.filtered_qs.exclude(*args, **kwargs)
        self.query.filtered_query = self.filtered_qs.query
        return self

    def order_by(self, *field_names):
        self.filtered_qs = self.filtered_qs.order_by(*field_names)
        self.query.filtered_query = self.filtered_qs.query
        return self

    def distinct(self, *field_names):
        self.filtered_qs = self.filtered_qs.distinct(*field_names)
        self.query.filtered_query = self.filtered_qs.query
        return self

    def _clone(self):
        c = self.__class__.clone_raw_queryset(self, qs=self.filtered_qs._clone())
        return c

    def values(self, *fields):
        values_query_set = self.filtered_qs._clone(klass=RawValuesQuerySet, setup=True, _fields=fields)
        values_query_set.raw_queryset = self
        return values_query_set


class RawValuesQuerySet(ValuesQuerySet):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.raw_queryset = None

    def iterator(self):
        # Purge any extra columns that haven't been explicitly asked for
        extra_names = list(self.query.extra_select)
        field_names = self.field_names
        annotation_names = list(self.query.annotation_select)
        model_init_names, model_init_pos, annotation_fields = self.raw_queryset.resolve_model_init_order()

        names = extra_names + field_names + [field for field, idx in annotation_fields]

        for row in self.raw_queryset.query.get_compiler(self.db).results_iter():
            yield dict(zip(names, row))
