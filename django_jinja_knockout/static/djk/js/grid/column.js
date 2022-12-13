import { map, mapObject, find, each } from '../lib/underscore-esm.js';
import { odict } from '../dash.js';
import { blockTags } from '../ui.js';
import { renderNestedList, renderValue } from '../nestedlist.js';
import { ComponentManager } from '../components.js';

/**
 * Grid column ordering control.
 */

function GridColumnOrder(options) {

    this.init(options);

} void function(GridColumnOrder) {

    GridColumnOrder.init = function(options) {
        this.$switch = null;
        this.ownerGrid = options.ownerGrid;
        this.field = options.field;
        this.name = options.name;
        // '+' means 'asc', '-' means 'desc', null means unsorted.
        this.order = ko.observable(options.order);
        this.isSortedColumn = ko.observable(options.isSorted);
        this.orderCss = ko.computed(this.getOrderCss, this);
    };

    GridColumnOrder.getOrderCss = function() {
        return {
            'display-block': true,
            'sort-inactive': this.order() === null,
            'sort-asc': this.order() === '+',
            'sort-desc': this.order() === '-'
        };
    };

    GridColumnOrder.setSwitchElement = function($element) {
        this.$switch = $element;
    };

    GridColumnOrder.is = function(anotherOrder) {
        return this.field === anotherOrder.field;
    };

    GridColumnOrder.onSwitchOrder = function() {
        this.ownerGrid.deactivateAllSorting(this);
        if (this.order() === '+') {
            this.order('-');
        } else {
            // this.order() === null || this.order() === '-'
            this.order('+');
        }
        var orderBy = {};
        orderBy[this.field] = this.order();
        this.ownerGrid.setQueryOrderBy(orderBy);
        this.ownerGrid.listAction();
    };

    GridColumnOrder.blockTags = blockTags.list;

    GridColumnOrder.getCellContainer = function() {
        return $('<div>', {
            'class': 'grid-cell',
            'data-caption': this.name,
        });
    };

    GridColumnOrder.getNestedListOptions = function() {
        /**
         * Do not escape nested list because it's escaped by default in GridRow.htmlEncode().
         * This allows to have both escaped and unescaped nested lists in row cells
         * via Grid.isMarkSafeField()
         */
        var nestedListOptions = $.extend(
            {
                blockTags: this.blockTags,
                fn: 'html',
                /**
                 * Will try to use field name as a key prefix first,
                 * falling back to non-prefixed field names when missing.
                 *
                 * This avoids related fields name clashes when two different related models has the same field name
                 * (eg. 'category') but a different 'verbose_name'.
                 */
                keyPrefix: this.field,
                unwrapTop: true,
            },
            this.ownerGrid.meta.fkNestedListOptions
        );
        return nestedListOptions;
    };

    // Supports jQuery elements / nested arrays / objects / HTML strings as grid cell value.
    GridColumnOrder.renderRowValue = function(element, value) {
        renderValue(element, value, this.getNestedListOptions());
    };

}(GridColumnOrder.prototype);


/**
 * Compound column which contains one or more of GridColumnOrder instances.
 */

function GridColumn(options) {

    this.init(options);

} void function(GridColumn) {

    GridColumn.init = function(options) {
        this.ownerGrid = options.ownerGrid;
        this.lastColumnCss = {};
        this.columnOrders = ko.observableArray(options.columnOrders);
        this.columnCss = ko.computed(this.getColumnCss, this);
        this.names = ko.computed(this.getNames, this);
    };

    GridColumn.blockTags = blockTags.list;

    GridColumn.getColumnCss = function() {
        this.lastColumnCss = mapObject(this.lastColumnCss, function() {
            return false;
        });
        var highlightModeRule = this.ownerGrid.getHighlightModeRule();
        if (highlightModeRule.direction === 0) {
            // Finds foreach $index() inaccessible directly in computed.
            var index = this.ownerGrid.gridColumns().indexOf(this);
            this.lastColumnCss = $.extend(this.lastColumnCss, this.ownerGrid.getCycleCss(index));
        }
        var cellActions = this.ownerGrid.getCellActions('click', this.getFields());
        this.lastColumnCss['pointer'] = cellActions.length > 0;
        this.lastColumnCss['active-action'] = cellActions.length > 0;
        return this.lastColumnCss;
    };

    GridColumn.getFields = function() {
        var fields = [];
        find(this.columnOrders(), function(columnOrder) {
            fields.push(columnOrder.field);
        });
        return fields;
    };

    GridColumn.getNames = function() {
        var names = [];
        find(this.columnOrders(), function(columnOrder) {
            names.push(columnOrder.name);
        });
        return names.join(' / ');
    };

    GridColumn.getOrders_i18n = function() {
        var i18n = {};
        find(this.columnOrders(), function(columnOrder) {
            i18n[columnOrder.field] = columnOrder.name;
        });
        return i18n;
    };

    GridColumn.getColumnOrder = function(fieldName) {
        var result = null;
        find(this.columnOrders(), function(columnOrder) {
            if (columnOrder.field === fieldName) {
                result = columnOrder;
                return true;
            }
        });
        return result;
    };

    GridColumn.deactivateAllSorting = function(exceptOrder) {
        each(this.columnOrders(), function(columnOrder) {
            if (!columnOrder.is(exceptOrder)) {
                columnOrder.order(null);
            }
        });
    };

    GridColumn.getCompoundCells = function(gridRow) {
        var self = this;
        var cells = [];
        map(this.columnOrders(), function(columnOrder) {
            var $container = columnOrder.getCellContainer();
            columnOrder.renderRowValue(
                $container[0], ko.utils.unwrapObservable(
                    gridRow.displayValues[columnOrder.field]
                )
            );
            cells.push(
                odict(columnOrder.field, $container)
            );
        });
        return cells;
    };

    GridColumn.renderCompound = function(options, cells) {
        var $element = options.$element;
        var $render = $('<div>');
        var $result = renderNestedList($render, cells, {
            blockTags: this.blockTags,
            fn: 'html',
            showKeys: this.ownerGrid.options.showCompoundKeys,
            i18n: this.getOrders_i18n(),
        });
        if (options.row.useInitClient > 1) {
            // Nested components support. See also GridRow.prepare().
            var cm = new ComponentManager({'elem': $result});
            cm.detachNestedComponents();
            $element.data({'componentManager': cm});
        }
        $element.get(0).replaceChildren($result.children().get(0));
        $element.$ul = $result.$ul;
        return $element;
    };

    GridColumn.render = function(options) {
        options.$element.empty();
        var cells = this.getCompoundCells(options.row);
        if (cells.length === 1) {
            cells[0].v.attr('data-column-name', cells[0].k);
            if (options.row.useInitClient > 1) {
                // Nested components support. See also GridRow.prepare().
                var cm = new ComponentManager({'elem': cells[0].v});
                cm.detachNestedComponents();
                $(cells[0].v).data({'componentManager': cm});
            }
            options.$element.append(cells[0].v);
        } else if (cells.length > 1) {
            var $cell = this.renderCompound(options, cells).$ul;
            var cellNames = this.getFields();
            $cell.attr('data-column-name', JSON.stringify(cellNames));
        }
    };

}(GridColumn.prototype);

export { GridColumnOrder, GridColumn };
