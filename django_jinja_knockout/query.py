import types
from copy import copy

from django.utils import six
from django.db import DEFAULT_DB_ALIAS, connections
from django.db.models.sql.compiler import SQLCompiler
from django.db.models.sql import Query, RawQuery
from django.db.models.query import RawQuerySet, QuerySet, ValuesQuerySet, ValuesListQuerySet


class RawSqlCompiler(SQLCompiler):

    def __init__(self, query, connection, using):
        super().__init__(query, connection, using)
        self.raw_query = None

    def as_sql(self, with_limits=True):
        refcounts_before = self.query.alias_refcount.copy()
        try:
            result = [self.raw_query.sql]
            params = list(self.raw_query.params)

            extra_select, order_by, group_by = self.pre_sql_setup()
            if with_limits and self.query.low_mark == self.query.high_mark:
                return '', ()
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

            if with_limits:
                if self.query.low_mark != self.query.high_mark:
                    if self.query.high_mark is not None:
                        result.append('LIMIT %d' % (self.query.high_mark - self.query.low_mark))
                    if self.query.low_mark:
                        if self.query.high_mark is None:
                            val = self.connection.ops.no_limit_value()
                            if val:
                                result.append('LIMIT %d' % val)
                        result.append('OFFSET %d' % self.query.low_mark)

            return ' '.join(result), tuple(params)
        finally:
            # Finally do cleanup - get rid of the joins we created above.
            self.query.reset_refcounts(refcounts_before)

    def results_iter(self, results=None):
        for row in self.raw_query:
            yield row


class FilteredRawQuery(RawQuery):

    def __init__(self, sql, using, params=None, context=None):
        super().__init__(sql, using, params, context)
        self.filtered_query = None
        self.annotation_select = {}

    @classmethod
    def clone_raw_query(cls, raw_query, filtered_query, is_already_filtered=True):
        if not isinstance(raw_query, RawQuery):
            raise ValueError('raw_query must be an instance of RawQuery')
        if isinstance(raw_query, cls):
            c = raw_query.clone(raw_query.using, is_already_filtered)
        else:
            c = cls(
                sql=raw_query.sql,
                using=raw_query.using,
                params=raw_query.params,
                context=raw_query.context
            )
            c.annotation_select = copy(raw_query.annotation_select)
        c.filtered_query = filtered_query if is_already_filtered else filtered_query.clone()
        return c

    def clone(self, using, is_already_filtered=True):
        super_c = super().clone(using)
        c = self.__class__(
            sql=super_c.sql,
            using=super_c.using,
            params=super_c.params,
            context=super_c.context
        )
        c.filtered_query = self.filtered_query if is_already_filtered else self.filtered_query.clone()
        # Do not copy 'cursor', it may cause infitite recursion.
        for prop in ('low_mark', 'high_mark', 'extra_select', 'annotation_select'):
            setattr(c, prop, copy(getattr(self, prop)))
        return c

    def get_compiler(self, using=None, connection=None):
        compiler = self.filtered_query.get_compiler(using, connection)
        for method_name in ('as_sql', 'results_iter'):
            setattr(compiler, method_name, types.MethodType(getattr(RawSqlCompiler, method_name), compiler))
        compiler.raw_query = self
        return compiler

    def set_limits(self, low=None, high=None):
        self.filtered_query.set_limits(low, high)

    def _execute_query(self):
        compiler = self.get_compiler(DEFAULT_DB_ALIAS)
        result, params = compiler.as_sql()

        self.cursor = connections[self.using].cursor()
        self.cursor.execute(result, params)


class FilteredRawQuerySet(RawQuerySet):

    def __init__(self, *args, **kwargs):
        self.filtered_qs = kwargs.pop('filtered_qs', None)
        super().__init__(*args, **kwargs)

    @classmethod
    def clone_raw_queryset(cls, raw_qs, filtered_qs=None):
        if not isinstance(raw_qs, RawQuerySet):
            raise ValueError('raw_qs must be an instance of RawQuerySet')
        if filtered_qs is None:
            filtered_qs = raw_qs.model.objects.all()
        if not isinstance(filtered_qs, QuerySet):
            raise ValueError('filtered_qs must be an instance of QuerySet')
        if isinstance(raw_qs, cls):
            c = raw_qs._clone()
        else:
            c = cls(
                raw_query=raw_qs.raw_query,
                model=raw_qs.model,
                query=raw_qs.query,
                params=raw_qs.params,
                translations=raw_qs.translations,
                using=raw_qs._db,
                hints=raw_qs._hints
            )
            c.query = FilteredRawQuery.clone_raw_query(raw_query=raw_qs.query, filtered_query=filtered_qs.query)
        c.filtered_qs = filtered_qs
        c.query.filtered_query = filtered_qs.query
        return c

    def _clone(self):
        query = FilteredRawQuery.clone_raw_query(raw_query=self.query, filtered_query=self.query.filtered_query)
        filtered_qs = self.filtered_qs._clone()
        c = self.__class__(
            raw_query=self.raw_query,
            model=self.model,
            params=copy(self.params),
            translations=copy(self.translations),
            using=self._db,
            hints=copy(self._hints),
            query=query,
            filtered_qs=filtered_qs
        )
        return c

    def filter(self, *args, **kwargs):
        return self.__class__.clone_raw_queryset(
            raw_qs=self,
            filtered_qs=self.filtered_qs.filter(*args, **kwargs)
        )

    def exclude(self, *args, **kwargs):
        return self.__class__.clone_raw_queryset(
            raw_qs=self,
            filtered_qs=self.filtered_qs.exclude(*args, **kwargs)
        )

    def order_by(self, *field_names):
        return self.__class__.clone_raw_queryset(
            raw_qs=self,
            filtered_qs=self.filtered_qs.order_by(*field_names)
        )

    def distinct(self, *field_names):
        return self.__class__.clone_raw_queryset(
            raw_qs=self,
            filtered_qs=self.filtered_qs.distinct(*field_names)
        )

    # Warning: might return incorrect number for raw query with non-LEFT JOIN of another table(s).
    # todo: Implement as annotation: see sql.Query.get_count().
    def count(self):
        return self.filtered_qs.count()

    def values(self, *fields):
        # Do not pass _fields=fields because it will raise errors for raw query annotated fields.
        values_queryset = self.filtered_qs._clone(klass=RawValuesQuerySet, setup=True, _fields=())
        values_queryset.values_fields = fields if len(fields) > 0 else self.columns
        values_queryset.raw_queryset = self
        return values_queryset

    def values_list(self, *fields, **kwargs):
        flat = kwargs.pop('flat', False)
        if kwargs:
            raise TypeError('Unexpected keyword arguments to values_list: %s'
                    % (list(kwargs),))
        if flat and len(fields) > 1:
            raise TypeError("'flat' is not valid when values_list is called with more than one field.")
        # Do not pass _fields=fields because it will raise errors for raw query annotated fields.
        values_list_queryset = self.filtered_qs._clone(klass=RawValuesListQuerySet, setup=True, flat=flat,
                           _fields=())
        values_list_queryset.values_fields = fields if len(fields) > 0 else self.columns
        values_list_queryset.raw_queryset = self
        return values_list_queryset

    def __getitem__(self, k):
        """
        Retrieves an item or slice from the set of results.
        """
        if not isinstance(k, (slice,) + six.integer_types):
            raise TypeError
        assert ((not isinstance(k, slice) and (k >= 0)) or
                (isinstance(k, slice) and (k.start is None or k.start >= 0) and
                 (k.stop is None or k.stop >= 0))), \
            "Negative indexing is not supported."

        qs = self._clone()
        if isinstance(k, slice):
            if k.start is not None:
                start = int(k.start)
            else:
                start = None
            if k.stop is not None:
                stop = int(k.stop)
            else:
                stop = None
            qs.query.set_limits(start, stop)
            return list(qs)[::k.step] if k.step else qs

        qs.query.set_limits(k, k+1)
        return list(qs)[0]


class RawQuerySetMixin():

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.raw_queryset = None
        self.values_fields = None

    def _clone(self, klass=None, setup=False, **kwargs):
        c = super()._clone(klass, setup, **kwargs)
        c.raw_queryset = self.raw_queryset
        c.values_fields = self.values_fields[:]
        return c


class RawValuesQuerySet(RawQuerySetMixin, ValuesQuerySet):

    def iterator(self):
        for row in self.raw_queryset.__iter__():
            value = {attr: getattr(row, attr) for attr in self.values_fields}
            yield value


class RawValuesListQuerySet(RawQuerySetMixin, ValuesListQuerySet):

    def iterator(self):
        for row in self.raw_queryset.__iter__():
            if self.flat:
                yield getattr(row, self.values_fields[0])
            else:
                value = [getattr(row, attr) for attr in self.values_fields]
                yield value
