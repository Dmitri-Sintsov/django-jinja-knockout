import types
from operator import attrgetter
from copy import copy
from sqlparse.tokens import Token
from sqlparse.lexer import tokenize

from django.utils import six
from django.core.exceptions import ObjectDoesNotExist
from django.db import DEFAULT_DB_ALIAS, connections
from django.db import models
from django.db.models import Q
from django.db.models.fields import Field
from django.db.models.sql.compiler import SQLCompiler
from django.db.models.sql import RawQuery
from django.db.models.query import RawQuerySet, QuerySet


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

            # Django 1.8 uses self.query.where.
            # Django 1.9, 1.10 uses self.where.
            query_where = getattr(self, 'where', self.query.where)
            where, w_params = self.compile(query_where) if query_where is not None else ("", [])
            if where:
                result.append('WHERE %s' % where)
                params.extend(w_params)

            # Django 1.8 uses self.query.having.
            # Django 1.9, 1.10 uses self.having.
            query_having = getattr(self, 'having', getattr(self.query, 'having', None))
            having, h_params = self.compile(query_having) if query_having is not None else ("", [])
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


class ValuesQuerySetMixin:

    def _get_row_attr(self, row, attr):
        if '__' in attr:
            value = row
            keypath = attr.split('__')
            obj_exists = True
            # Try to get value from the relation path.
            for key in keypath:
                try:
                    value = getattr(value, key)
                except ObjectDoesNotExist:
                    obj_exists = False
                    value = None
                    break
            if not obj_exists:
                try:
                    # Try to get raw attribute when there is no relation path.
                    value = getattr(row, keypath[-1])
                except (AttributeError, ObjectDoesNotExist):
                    pass
        else:
            try:
                value = getattr(row, attr)
            except ObjectDoesNotExist:
                return None
            if isinstance(value, models.Model):
                value = value.pk
        return value

    def _values(self, values_fields):
        c = self._clone()
        for row in c.__iter__():
            value = {attr:self._get_row_attr(row, attr) for attr in values_fields}
            yield value

    def _values_list(self, values_fields, flat):
        c = self._clone()
        for row in c.__iter__():
            if flat:
                yield self._get_row_attr(row, values_fields[0])
            else:
                value = [self._get_row_attr(row, attr) for attr in values_fields]
                yield value


class FilteredRawQuerySet(ValuesQuerySetMixin, RawQuerySet):

    def __init__(self, *args, **kwargs):
        self.filtered_qs = kwargs.pop('filtered_qs', None)
        self.relation_map = kwargs.pop('relation_map', {})
        super().__init__(*args, **kwargs)

    @classmethod
    def clone_raw_queryset(cls, raw_qs, filtered_qs=None, relation_map={}):
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
                hints=raw_qs._hints,
                relation_map=relation_map
            )
            c.query = FilteredRawQuery.clone_raw_query(raw_query=raw_qs.query, filtered_query=filtered_qs.query)
        c.filtered_qs = filtered_qs
        c.query.filtered_query = filtered_qs.query
        return c

    def _clone(self):
        query = FilteredRawQuery.clone_raw_query(raw_query=self.query, filtered_query=self.query.filtered_query)
        filtered_qs = self.filtered_qs._clone()
        relation_map = copy(self.relation_map)
        c = self.__class__(
            raw_query=self.raw_query,
            model=self.model,
            params=copy(self.params),
            translations=copy(self.translations),
            using=self._db,
            hints=copy(self._hints),
            query=query,
            filtered_qs=filtered_qs,
            relation_map=relation_map
        )
        return c

    def get_mapped_field(self, field):
        stripped_field = field.lstrip('-')
        fieldpath = stripped_field.split('__')
        fieldname = fieldpath[0]
        fieldpath[0] = '{}__{}'.format(self.relation_map[fieldname], fieldname) \
            if fieldname in self.relation_map \
            else fieldname
        mapped_field = '__'.join(fieldpath)
        return '-' + mapped_field if field.startswith('-') else mapped_field

    def get_mapped_fields(self, *field_names):
        return [self.get_mapped_field(field) for field in field_names]

    def get_mapped_filter_args(self, *args):
        mapped_args = []
        for q in args:
            if not isinstance(q, Q):
                raise ValueError('Only Q objects are supported')
            for key, child in enumerate(q.children):
                fieldname, val = child
                q.children[key] = self.get_mapped_field(fieldname), val
            mapped_args.append(q)
        return mapped_args

    def get_mapped_filter_kwargs(self, **kwargs):
        mapped_kwargs = {}
        for fieldname, value in kwargs.items():
            mapped_kwargs[self.get_mapped_field(fieldname)] = value
        return mapped_kwargs

    def filter(self, *args, **kwargs):
        filtered_qs = self.filtered_qs.filter(
            *self.get_mapped_filter_args(*args),
            **self.get_mapped_filter_kwargs(**kwargs)
        )
        return self.__class__.clone_raw_queryset(
            raw_qs=self,
            filtered_qs=filtered_qs
        )

    def exclude(self, *args, **kwargs):
        return self.__class__.clone_raw_queryset(
            raw_qs=self,
            filtered_qs=self.filtered_qs.exclude(
                *self.get_mapped_filter_args(*args),
                **self.get_mapped_filter_kwargs(**kwargs)
            )
        )

    def order_by(self, *field_names):
        return self.__class__.clone_raw_queryset(
            raw_qs=self,
            filtered_qs=self.filtered_qs.order_by(*self.get_mapped_fields(*field_names))
        )

    def distinct(self, *field_names):
        return self.__class__.clone_raw_queryset(
            raw_qs=self,
            filtered_qs=self.filtered_qs.distinct(*self.get_mapped_fields(*field_names))
        )

    # todo: Implement as annotation: see sql.Query.get_count().
    def count(self):
        # Reset .order_by() which is not required for .count() and may cause
        # 'column "FOO" must appear in the GROUP BY clause or be used in an aggregate function'
        # error when particular column is in the list of currently applied order_by().
        # .filter() seems not to be affected.
        c = self.order_by()

        # Rewrite query arguments to 'count(*)' function.
        stmts = tokenize(c.query.sql)
        rewrite_query = []
        is_rewritten = False
        copying = True
        for token_type, token_value in stmts:
            if copying:
                rewrite_query.append(token_value)
            if token_type == Token.Keyword.DML and token_value.upper() == 'SELECT':
                copying = False
                is_rewritten = True
                rewrite_query.append(' count(*) ')
            elif token_type == Token.Keyword and token_value.upper() == 'FROM':
                copying = True
                rewrite_query.append(token_value)

        if is_rewritten:
            c.query.sql = ''.join(rewrite_query)
            query = iter(c.query)
            for values in query:
                count = values[0]
                return count

        # Fallback to approximate QuerySet.count() when SQL query rewrite failed.
        return c.filtered_qs.count()

    def values(self, *fields):
        values_fields = fields if len(fields) > 0 else self.columns
        yield from self._values(values_fields)

    def values_list(self, *fields, **kwargs):
        flat = kwargs.pop('flat', False)
        if kwargs:
            raise TypeError(
                'Unexpected keyword arguments to values_list: %s' % (list(kwargs),)
            )
        if flat and len(fields) > 1:
            raise TypeError("'flat' is not valid when values_list is called with more than one field.")
        values_fields = fields if len(fields) > 0 else self.columns
        yield from self._values_list(values_fields, flat=flat)

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

        qs.query.set_limits(k, k + 1)
        return list(qs)[0]


# To use with Prefetch() 'to_attr' keyword argument object results.
class ListQuerySet(ValuesQuerySetMixin):

    def __init__(self, lst):
        if not isinstance(lst, list):
            raise ValueError('lst argument should have list type')
        self.list = lst

    def _clone(self):
        c = self.__class__(
            copy(self.list)
        )
        return c

    def _match(self, key, query_val, obj):
        tokens = key.split('__', 1)
        if len(tokens) == 1:
            return hasattr(obj, key) and getattr(obj, key) == query_val
        else:
            match_method = getattr(self, '_match_{}'.format(tokens[1]))
            if not hasattr(obj, tokens[0]):
                return False
            return match_method(getattr(obj, tokens[0]), query_val)

    def _match_contains(self, field_val, query_val):
        return query_val in field_val

    def _match_gt(self, field_val, query_val):
        return field_val > query_val

    def _match_gte(self, field_val, query_val):
        return field_val >= query_val

    def _match_icontains(self, field_val, query_val):
        return query_val.lower() in field_val.lower()

    def _match_isnull(self, field_val, query_val):
        return (field_val is None) is query_val

    def _match_in(self, field_val, query_val):
        return field_val in query_val

    def _match_lt(self, field_val, query_val):
        return field_val < query_val

    def _match_lte(self, field_val, query_val):
        return field_val <= query_val

    def _filter(self, positive, *args, **kwargs):
        filtered_list = []
        for obj in self.list:
            matches = True
            for key, val in kwargs.items():
                if self._match(key, val, obj) is not positive:
                    matches = False
                    break
            if matches:
                filtered_list.append(obj)
        return self.__class__(
            filtered_list
        )

    def filter(self, *args, **kwargs):
        return self._filter(True, *args, **kwargs)

    def exclude(self, *args, **kwargs):
        return self._filter(False, *args, **kwargs)

    def order_by(self, *field_names):
        c = self._clone()
        for fieldname in reversed(field_names):
            canon_name = fieldname.lstrip('-')
            is_desc = fieldname.startswith('-')
            c.list.sort(key=attrgetter(canon_name), reverse=is_desc)
        return c

    def first(self):
        return None if len(self.list) == 0 else self.list[0]

    def __repr__(self):
        return repr(self.list)

    def __iter__(self):
        return iter(self.list)

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

        if isinstance(k, slice):
            if k.start is not None:
                start = int(k.start)
            else:
                start = None
            if k.stop is not None:
                stop = int(k.stop)
            else:
                stop = None
            return self.__class__(
                self.list[start:stop:k.step]
            )

        return self.list[k]

    def _get_fields(self, fields):
        if len(self.list) == 0:
            return None
        if len(fields) > 0:
            return fields
        else:
            return [field.attname for field in self.list[0]._meta.get_fields() if isinstance(field, Field)]

    def values(self, *fields):
        values_fields = self._get_fields(fields)
        yield from self._values(values_fields)

    def values_list(self, *fields, **kwargs):
        flat = kwargs.pop('flat', False)
        if kwargs:
            raise TypeError('Unexpected keyword arguments to values_list: %s'
                            % (list(kwargs),))
        if flat and len(fields) > 1:
            raise TypeError("'flat' is not valid when values_list is called with more than one field.")
        values_fields = self._get_fields(fields)
        yield from self._values_list(values_fields, flat=flat)
