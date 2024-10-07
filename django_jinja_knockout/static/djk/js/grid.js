import { sprintf } from './lib/sprintf-esm.js';
import { any, each, mapObject, isArray, find, filter, size, indexOf } from './lib/underscore-esm.js';

import { isScalar, intVal, inherit, mixProps } from './dash.js';
import { propGet, propCall } from './prop.js';
import { Subscriber } from './ko.js';
import { Trans } from './translate.js';
import { getTemplateSubstitution } from './tpl.js';
import { initClient } from './initclient.js';
import { transformTags } from './ui.js';
import { ui } from './ui.js';

import { GridColumnOrder, GridColumn } from './grid/column.js';
import { GridFilterChoice, GridFilter, FkGridFilter, GridRangeFilter } from './grid/filters.js';
import { GridRow } from './grid/row.js';
import { GridActions } from './grid/actions.js';
import { gridActionIoc } from './grid/ioc.js';
import { ActionsMenuDialog } from './grid/dialogs.js';

ko.bindingHandlers.grid_row = {
    update: function(element, valueAccessor, allBindings, koGridRow, bindingContext) {
        // var realElement = ko.fromVirtual(element);
        koGridRow.setRowElement($(element));
    }
};

ko.virtualElements.allowedBindings.grid_row = true;

ko.bindingHandlers.grid_filter = {
    update: function(element, valueAccessor, allBindings, koGridFilter, bindingContext) {
        koGridFilter.setDropdownElement($(element));
    }
};

ko.bindingHandlers.grid_filter_choice = {
    update: function(element, valueAccessor, allBindings, koGridFilterChoice, bindingContext) {
        koGridFilterChoice.setLinkElement($(element));
    }
};

ko.bindingHandlers.grid_order_by = {
    update: function(element, valueAccessor, allBindings, koGridColumnOrder, bindingContext) {
        koGridColumnOrder.setSwitchElement($(element));
    }
};

/**
 * Supports jQuery elements / nested arrays / objects / HTML strings as grid cell value.
 * Render current compound cell indicated by KoGridColumn value.
 */
ko.bindingHandlers.grid_compound_cell = {
    update:  function(element, valueAccessor, allBindings, koGridColumn, bindingContext) {
        koGridColumn.render({
            $element: $(element),
            row: bindingContext.gridRow,
        });
    }
};

/**
 * Supports jQuery elements / nested arrays / objects / HTML strings as grid cell value.
 * Render single (non-compound) field cell, indicated by KoGridRow value and valueAccessor() as the field name.
 */
ko.bindingHandlers.grid_cell = {
    update: function(element, valueAccessor, allBindings, koGridRow, bindingContext) {
        var koGridColumnOrder = koGridRow.ownerGrid.getKoGridColumn(valueAccessor()).order;
        var displayValue = koGridRow.display(valueAccessor());
        koGridColumnOrder.renderRowValue(element, displayValue);
    }
};

/**
 * Pagination link ko model.
 */
function GridPage(options) {

    this.init(options);

} void function(GridPage) {

    GridPage.init = function(options) {
        this.ownerGrid = options.ownerGrid;
        this.isActive = options.isActive;
        this.title = options.title,
        this.pageNumber = options.pageNumber;
    };

    GridPage.onPagination = function() {
        this.ownerGrid.onPagination(this.pageNumber);
    };

}(GridPage.prototype);

/**
 * AJAX Grid powered by Knockout.js.
 *
 * To display custom-formatted field values, one has to inherit
 * from Grid to override Grid.iocRow() and
 * from GridRow to override GridRow.initDisplayValues().
 *
 * To implement custom client-side actions (such as multiple grids interaction) one has to inherit
 * from Grid to override Grid.iocGridActions() and
 * from GridActions / Actions to setup custom .perform_* / .callback_* / .queryargs_* methods.
 *
 */

function Grid(options) {

    this.init(options);

} void function(Grid) {

    Grid.queryKeys = {
        filter: 'list_filter',
        order:  'list_order_by',
        search: 'list_search'
    };

    Grid.localize = function() {
        this.local = {
            toBegin: Trans('First page'),
            toEnd: Trans('Last page'),
        };
        this.meta.searchPlaceholder = ko.observable(
            (this.options.searchPlaceholder === null) ? Trans('Search') : this.options.searchPlaceholder
        );
    };

    Grid.initAjaxParams = function() {
        this.queryArgs = $.extend({
                page: 1
            },
            this.options.ajaxParams
        );
        this.queryFilters = {};
    };

    Grid.firstLoad = function(callback) {
        var self = this;
        // todo: add 'firstLoad' queryarg in KoGridView.discover_grid_options().
        var actionOptions = {
            queryArgs: {firstLoad: 1},
        };
        if (this.options.preloadedMetaList) {
            var vm = this.options.preloadedMetaList;
            if (typeof vm.view === 'undefined') {
                vm.view = this.actions.viewModelName;
            }
            this.options.preloadedMetaList = false;
            this.actions.respond('meta_list', vm, propGet(callback, 'context'));
            self.meta.firstLoad(false);
            if (typeof callback === 'function') {
                callback(actionOptions);
            }
        } else if (this.options.separateMeta) {
            /**
             * this.options.separateMeta == true is required when 'list' action queryArgs / queryFilters depends
             * on result of 'meta' action. For example that is true for grids with advanced allowed_filter_fields
             * values of dict type: see views.GridActionxMixin.get_filters().
             */
            this.actions.perform('meta', actionOptions, function(viewmodel) {
                if (self.options.defaultOrderBy !== null) {
                    // Override 'list' action AJAX queryargs ordering.
                    self.setQueryOrderBy(self.options.defaultOrderBy);
                }
                self.actions.perform('list', actionOptions, function(viewmodel) {
                    self.meta.firstLoad(false);
                    if (typeof callback === 'function') {
                        callback(actionOptions);
                    }
                });
            });
        } else {
            // Save a bit of HTTP traffic by default.
            this.actions.perform('meta_list', actionOptions, function(viewmodel) {
                self.meta.firstLoad(false);
                if (typeof callback === 'function') {
                    callback(actionOptions);
                }
            });
        }
    };

    Grid.onFirstLoad = function(newValue) {
        if (!newValue) {
            this.propCall('ownerCtrl.onChildGridFirstLoad');
        }
    };

    Grid.applyBindings = function(selector) {
        var self = this;
        this.componentSelector = $(selector);
        ko.applySelector(this);
    };

    Grid.cleanBindings = function() {
        ko.utils.arrayForEach(this.gridFilters(), function(koFilter) {
            koFilter.cleanBindings();
        });
        ko.cleanSelector(this);
    };

    Grid.runComponent = function($selector) {
        this.applyBindings($selector);
        this.firstLoad();
    };

    Grid.removeComponent = function($selector) {
        this.cleanBindings();
    };

    Grid.iocGridActions = function(options) {
        return new GridActions(options);
    };

    Grid.onGridSearchStr = function(newValue) {
        this.searchSubstring(newValue);
    };

    Grid.onGridSearchDisplayStr = function(newValue) {
        this.gridSearchStr(newValue);
    };

    Grid.on_meta_rowsPerPage = function(newValue) {
        this.actions.perform('list');
    };

    Grid.onSwitchHighlight = function(data, ev) {
        var self = this;
        var nextRuleIdx = this.getHighlightRuleIdx() + 1;
        if (nextRuleIdx >= this.options.highlightModeRules.length) {
            nextRuleIdx = 0;
        }
        var nextRule = this.options.highlightModeRules[nextRuleIdx];
        for (var k in nextRule) {
            if (nextRule.hasOwnProperty(k)) {
                this.highlightMode(k);
                break;
            }
        }
    };

    Grid.onSelectAllRows = function(data, ev) {
        var selectAllRows = !this.hasSelectAllRows();
        for (var i = 0; i < this.gridRows().length; i++) {
            var koRow = this.gridRows()[i];
            koRow.isSelectedRow(selectAllRows);
        }
        return false;
    };

    // this.meta is the list of visual ko bindings which are formatting flags or messages, not model values.
    Grid.updateMeta = function(data) {
        ko.utils.setProps(data, this.meta);
    };

    Grid.uiActionTypes = ['button', 'button_footer', 'button_pagination', 'pagination', 'click', 'iconui'];

    Grid.init = function(options) {
        mixProps(Subscriber.prototype, this);
        var self = this;
        this.componentSelector = null;
        this.options = $.extend({
            alwaysShowPagination: true,
            ajaxParams: {},
            // Overrides this.meta.orderBy value when not null.
            defaultOrderBy: null,
            // 0 - do not expand templates, 1 - transform bs attributes, 2 - full initClient
            expandFilterContents: 1,
            fkGridOptions: {},
            highlightMode: 'cycleRows',
            // Currently available highlight directions:
            //   0 - do not highlight,
            //   1 - highlight columns,
            //   2 - highlight rows,
            highlightModeRules: ui.highlightModeRules,
            // false - no preloadedMetaList,
            // object - result of server-side preloaded 'action_meta_list' call in KoGridView.discover_grid_options().
            pkField: '',
            preloadedMetaList: false,
            rowsPerPage: 10,
            searchPlaceholder: null,
            selectMultipleRows: false,
            // https://django-jinja-knockout.readthedocs.io/en/latest/datatables.html?highlight=separatemeta
            separateMeta: false,
            showCompoundKeys: true,
            showNonSortableColumnNames: true,
            showSelection: false,
            switchHighlight: true,
            ownerCtrl: null,
            pageRoute: null,
            pageRouteKwargs: {},
            vScrollPage: true,
            // By default will use GridRow.useInitClient = false value:
            useInitClient : null,
        }, options);
        if (this.options.defaultOrderBy !== null) {
            // Requires  separate 'meta' action to properly show initial overridden ordering.
            this.options.separateMeta = true;
        }
        if (this.options.selectMultipleRows) {
            this.options.showSelection = true;
        }
        this.ownerCtrl = this.options.ownerCtrl;
        this.meta = {
            firstLoad: ko.observable(true),
            fkNestedListOptions: {},
            listOptions: {},
            pkField: this.options.pkField,
            hasSearch: ko.observable(false),
            // Key: fieldname, value: true: 'asc', false: 'desc'.
            orderBy: {},
            markSafeFields: [],
            prevRowsPerPage: this.options.rowsPerPage,
            rowsPerPage: ko.observable(this.options.rowsPerPage),
            rowsPerPageRange: ko.observable({}),
            rowsPerPageValues: ko.observableArray(),
            strDesc: false,
            verboseName: ko.observable(''),
            verboseNamePlural: ko.observable(''),
        };
        this.meta.firstLoad.subscribe(this.onFirstLoad, this);
        this.meta.rowsPerPage.extend({ rateLimit: 500 });
        this.actionTypes = {};
        this.actionTypesLength = {};
        each(this.uiActionTypes, function(type) {
            self.actionTypes[type] = ko.observableArray();
            self.actionTypesLength[type] = function(changes) {
                return self.actionTypes[type]().length;
            };
            self.actionTypes[type].subscribe(
                self.actionTypesLength[type], this, 'arrayChange'
            );
        });
        this.actions = this.iocGridActions({
            owner: this,
            route: this.options.pageRoute,
            routeKwargs: this.options.pageRouteKwargs,
        });
        this.sortOrders = {};
        this.selectedRowsPks = [];
        this.hasSelectAllRows = ko.observable(false);
        this.gridColumns = ko.observableArray();
        this.iconuiColumns = ko.computed(function() {
            return (this.actionTypesLength['iconui']() === 0) ? 0 : 1;
        }, this);
        this.totalColumns = ko.computed(function() {
            var totalColumns = this.gridColumns().length + this.iconuiColumns();
            if (this.options.showSelection) {
                totalColumns++;
            }
            return totalColumns;
        }, this);
        this.gridFilters = ko.observableArray();
        this.gridRows = ko.observableArray();
        this.gridPages = ko.observableArray();
        this.gridTotalPages = ko.observable(0);
        this.gridSearchStr = ko.observable('');
        this.gridSearchStr.subscribe(this.onGridSearchStr, this);
        this.gridSearchDisplayStr = ko.observable('');
        this.gridSearchDisplayStr.subscribe(this.onGridSearchDisplayStr, this);
        this.highlightMode = ko.observable(this.options.highlightMode);
        this.lastHeaderCss = {};
        this.headerCss = ko.computed(this.getHeaderCss, this);
        this.selectAllRowsCss = ko.computed(this.getSelectAllRowsCss, this);
        this.initAjaxParams();
        this.localize();

        /*
        $modal.on('show.bs.modal', function (ev) {
            // http://stackoverflow.com/questions/11570333/how-to-get-twitter-bootstrap-modals-invoker-element
            var $invoker = $(ev.relatedTarget);
            var $endPointHolder = $invoker.parents('[data-end-point-prefix]');
        });
        */

    };

    Grid.getHighlightRuleIdx = function() {
        var currMode = this.highlightMode();
        for (var i = 0; i < this.options.highlightModeRules.length; i++) {
            var ruleDef = this.options.highlightModeRules[i];
            if (typeof ruleDef[currMode] !== 'undefined') {
                return i;
            }
        }
        return 0;
    };

    Grid.getHighlightModeRule = function() {
        var ruleIdx = this.getHighlightRuleIdx();
        var ruleDef = this.options.highlightModeRules[ruleIdx];
        for (var k in ruleDef) {
            if (ruleDef.hasOwnProperty(k)) {
                return ruleDef[k];
            }
        }
    };

    Grid.isSortedField = function(field) {
        return typeof this.sortOrders[field] !== 'undefined';
    };

    Grid.getCycleCss = function(seqIdx) {
        var css = {};
        var cycler = this.getHighlightModeRule().cycler;
        if (seqIdx >= 0) {
            for (var i = 0; i < cycler.length; i++) {
                css[cycler[i]] = ((seqIdx % cycler.length) === i);
            }
        }
        return css;
    };

    Grid.getHeaderCss = function() {
        this.lastHeaderCss = mapObject(this.lastHeaderCss, function() {
            return false;
        });
        var highlightModeRule = this.getHighlightModeRule();
        this.lastHeaderCss[highlightModeRule.header] = true;
        return this.lastHeaderCss;
    };

    Grid.getSelectAllRowsCss = function() {
        return {
            'iconui-check': this.hasSelectAllRows(),
            'iconui-unchecked': !this.hasSelectAllRows(),
            'pointer': true,
        };
    };

    Grid.getFieldQueryFilter = function(field) {
        if (typeof this.queryFilters[field] !== 'undefined') {
            return this.queryFilters[field];
        } else {
            return [];
        }
    };

    /**
     * Supports multiple values of the field.
     * Supports multiple ORM lookups (gt / lt / etc.) of the field.
     */
    Grid.addQueryFilter = function(options) {
        var field = options.field;
        var value = options.value;
        var lookup = (typeof options.lookup === 'undefined') ? 'in' : options.lookup;
        if (typeof this.queryFilters[field] === 'undefined') {
            // New single scalar / single array value.
            if (isArray(value)) {
                if (lookup !== 'in') {
                    throw new Error(sprintf(
                        "Array value '%s' requires lookup type 'in', given lookup type='%s'",
                        JSON.stringify(value),
                        lookup
                    ));
                }
            }
            if (lookup === 'in') {
                if (isArray(value)) {
                    this.queryFilters[field] = {'in': value};
                } else {
                    this.queryFilters[field] = value;
                }
            } else {
                this.queryFilters[field] = {};
                this.queryFilters[field][lookup] = value;
            }
        } else {
            // Already has one or more values.
            if (lookup === 'in') {
                // Special case of 'in' lookup that may have multiple filter values.
                if (this.queryFilters[field] === value) {
                    // Already added single 'in' value.
                    return;
                }
                if (isScalar(this.queryFilters[field])) {
                    // Convert single value into array of values with 'in' lookup.
                    this.queryFilters[field] = {'in': [this.queryFilters[field]]};
                }
                if (find(this.queryFilters[field]['in'], function(val) { return val === value; }) === undefined) {
                    // Multiple values: 'field__in' at server-side.
                    this.queryFilters[field]['in'].push(value);
                }
            } else {
                if (isScalar(this.queryFilters[field])) {
                    // Convert single value into array of values with 'in' lookup.
                    this.queryFilters[field] = {'in': [this.queryFilters[field]]};
                }
                this.queryFilters[field][lookup] = value;
            }
        }
    };

    /**
     * Supports multiple values of the field.
     * Supports multiple ORM lookups (gt / lt / etc.) for each field.
     */
    Grid.removeQueryFilter = function(options) {
        var self = this;
        var field = options.field;
        var hasValue = typeof options.value !== 'undefined';
        var hasLookup = typeof options.lookup !== 'undefined';
        if (hasValue && isArray(options.value)) {
            var opt = $.extend({}, options);
            each(options.value, function(val) {
                opt.value = val;
                self.removeQueryFilter(opt);
            });
            return;
        }
        if (typeof this.queryFilters[field] === 'undefined') {
            return;
        }
        if (!hasLookup) {
            if (hasValue) {
                throw new Error("Set options.lookup to delete specific query filter options.value");
            }
            delete this.queryFilters[field];
            return;
        }
        if (options.lookup === 'in') {
            // Special case of 'in' lookup that may have multiple filter values.
            if (isScalar(this.queryFilters[field])) {
                if (hasValue) {
                    if (this.queryFilters[field] === options.value) {
                        delete this.queryFilters[field];
                    }
                } else {
                    delete this.queryFilters[field];
                }
            } else if (typeof this.queryFilters[field]['in'] !== 'undefined') {
                this.queryFilters[field]['in'] = filter(this.queryFilters[field]['in'], function(val) {
                    return val !== options.value;
                });
                var len = this.queryFilters[field]['in'].length;
                if (len === 1) {
                    this.queryFilters[field] = this.queryFilters[field]['in'].pop();
                } else if (len === 0) {
                    delete this.queryFilters[field]['in'];
                    if (size(this.queryFilters[field]) === 0) {
                        delete this.queryFilters[field];
                    }
                }
            }
        } else {
            if (!isScalar(this.queryFilters[field]) &&
                    typeof this.queryFilters[field][options.lookup] !== 'undefined') {
                if (hasValue) {
                    if (this.queryFilters[field][options.lookup] === options.value) {
                        delete this.queryFilters[field][options.lookup];
                    }
                } else {
                    delete this.queryFilters[field][options.lookup];
                }
                if (size(this.queryFilters[field]) === 0) {
                    delete this.queryFilters[field];
                }
            }
        }
    };

    // Supported multiple order_by at api level but not in 'ko_grid.htm' templates.
    Grid.setQueryOrderBy = function(orderBy) {
        var prefixedOrders = [];
        each(orderBy, function(direction, fieldName) {
            var prefixedOrder = '';
            // Django specific implementation.
            if (direction === '-') {
                prefixedOrder += '-';
            }
            prefixedOrder += fieldName;
            prefixedOrders.push(prefixedOrder);
        });
        if (prefixedOrders.length === 1) {
            prefixedOrders = prefixedOrders[0];
        }
        this.queryArgs[this.queryKeys.order] = JSON.stringify(prefixedOrders);
    };

    Grid.hasSelectedPkVal = function(pkVal) {
        if (pkVal === undefined) {
            throw new Error(
                sprintf("Supplied row has no '%s' key", this.meta.pkField)
            );
        }
        for (var i = 0; i < this.selectedRowsPks.length; i++) {
            if (this.selectedRowsPks[i] === pkVal) {
                return true;
            }
        }
        return false;
    };

    Grid.checkAllRowsSelected = function() {
        var result = true;
        $.each(this.gridRows(), function(k, koRow) {
            if (!koRow.isSelectedRow()) {
                result = false;
                return false;
            }
        });
        return result;
    };

    Grid.addSelectedPkVal = function(pkVal) {
        if (this.options.selectMultipleRows) {
            if (!this.hasSelectedPkVal(pkVal)) {
                this.selectedRowsPks.push(pkVal);
            }
        } else {
            this.selectedRowsPks = [pkVal];
        }
        this.hasSelectAllRows(this.checkAllRowsSelected());
    };

    Grid.removeSelectedPkVal = function(pkVal) {
        if (pkVal === undefined) {
            throw new Error(
                sprintf("Supplied row has no '%s' key", this.meta.pkField)
            );
        }
        this.selectedRowsPks = filter(this.selectedRowsPks, function(val) {
            return val !== pkVal;
        });
        this.hasSelectAllRows(this.checkAllRowsSelected());
    };

    Grid.removeAllSelectedPkVals = function() {
        this.selectedRowsPks = [];
        this.hasSelectAllRows(false);
    };

    Grid.propCall = propCall;

    /**
     * Called from child row when the row is selected.
     */
    Grid.onSelectRow = function(koRow) {
        var pkVal = koRow.getPkVal();
        this.addSelectedPkVal(pkVal);
        this.propCall('ownerCtrl.onChildGridSelectRow', pkVal);
    };

    /**
     * Called from child row when the row is unselected.
     */
    Grid.onUnselectRow = function(koRow) {
        var pkVal = koRow.getPkVal();
        this.removeSelectedPkVal(pkVal);
        this.propCall('ownerCtrl.onChildGridUnselectRow', pkVal);
    };

    Grid.findMatchingPkRow = function(savedRow) {
        var koRow = null;
        find(this.gridRows(), function(v) {
            if (v.matchesPk(savedRow)) {
                koRow = v;
                return true;
            }
        });
        return koRow;
    };

    /**
     * Find GridRow instance in this.gridRows by row pk value.
     */
    Grid.findKoRowByPkVal = function(options) {
        var self = this;
        var pkVal, withKey;
        if (typeof options === 'object') {
            pkVal = options.pkVal;
            withKey = propGet(options, 'withKey', false);
        } else {
            pkVal = options;
            withKey = false;
        }
        var intPkVal = intVal(pkVal);
        var koRow = null;
        var key = -1;
        $.each(this.gridRows(), function(k, v) {
            var val = v.getPkVal();
            if (val === pkVal || val === intPkVal) {
                koRow = v;
                key = k;
                return false;
            }
        });
        if (withKey) {
            return {
                koRow,
                key
            }
        } else {
            return koRow;
        }
    };

    /**
     * Select grid rows which have pk field values equal to pkVals supplied.
     *
     * @param pkVals scalar / array
     *     Values of grid rows pk fields to select.
     *     Grid rows not matching the criteria will be unselected.
     */
    Grid.selectKoRowsByPkVals = function(pkVals) {
        var self = this;
        this.removeAllSelectedPkVals();
        if (!isArray(pkVals)) {
            pkVals = [pkVals];
        }
        var intPkVals = [];
        for (var i = 0; i < pkVals.length; i++) {
            intPkVals.push(pkVals[i]);
            var intPkVal = intVal(pkVals[i]);
            if (intPkVal !== pkVals[i]) {
                intPkVals.push(intPkVal);
            }
        }
        each(this.gridRows(), function(v) {
            var val = v.getPkVal();
            var isSelected = indexOf(intPkVals, val) !== -1;
            if (isSelected) {
                self.addSelectedPkVal(val);
            }
            v.isSelectedRow(isSelected);
        });
    };

    /**
     * "Manually" unselect row by it's pk value.
     */
    Grid.unselectRow = function(pkVal) {
        var koRow = this.findKoRowByPkVal(pkVal);
        if (koRow !== null) {
            koRow.isSelectedRow(false);
        }
        // Next line is not required, because the action will be done by koRow.isSelectedRow.subscribe() function.
        // this.removeSelectedPkVal(koRow.getPkVal());
        return koRow;
    };

    Grid.unselectAllRows = function() {
        // Make a clone of this.selectedRowsPks, otherwise .isSelectedRow(false) subscription
        // will alter loop array in progress.
        var selectedRowsPks = this.selectedRowsPks.slice();
        for (var i = 0; i < selectedRowsPks.length; i++) {
            var koRow = this.findKoRowByPkVal(selectedRowsPks[i]);
            if (koRow !== null) {
                koRow.isSelectedRow(false);
            }
        }
        this.selectedRowsPks = [];
    };

    Grid.markUpdated = function(isUpdated) {
        var self = this;
        var koRow = null;
        each(this.gridRows(), function(koRow) {
            koRow.isUpdated(isUpdated);
        });
    };

    /**
     * Adds new grid rows from raw viewmodel rows supplied.
     *  newRows - list of raw rows supplied from server-side.
     *  opcode - operation to perform on this.gridRows, usually 'push' or 'unshift'.
     */
    Grid.addKoRows = function(newRows, opcode) {
        if (typeof opcode === 'undefined') {
            opcode = 'push';
        }
        for (var i = 0; i < newRows.length; i++) {
            var koRow = this.iocRowOwner({
                isSelectedRow: false,
                isUpdated: true,
                values: newRows[i]
            });
            this.gridRows[opcode](koRow);
        }
    };

    /**
     * Updates existing grid rows with raw viewmodel rows supplied.
     *     savedRows - raw viewmodel response rows.
     */
    Grid.updateKoRows = function(savedRows) {
        var notUpdatedRows = [];
        for (var i = 0; i < savedRows.length; i++) {
            var pkVal = savedRows[i][this.meta.pkField];
            var savedGridRow = this.iocRow({
                ownerGrid: this,
                isSelectedRow: this.hasSelectedPkVal(pkVal),
                isUpdated: true,
                values: savedRows[i]
            });
            if (typeof this.lastClickedKoRow !== 'undefined' &&
                    this.lastClickedKoRow.matchesPk(savedGridRow)) {
                this.lastClickedKoRow.update(savedGridRow);
            }
            var rowToUpdate = this.findMatchingPkRow(savedGridRow);
            // When rowToUpdate is null, that means updated row is not among currently displayed ones.
            if (rowToUpdate !== null) {
                rowToUpdate.update(savedGridRow);
                // Update ui lists of action buttons / menus per row.
                this.setACL(rowToUpdate);
            } else {
                notUpdatedRows.push(savedRows[i]);
            }
        }
        return notUpdatedRows;
    };

    Grid.updateAddKoRows = function(savedRows, opcode) {
        var addedRows = this.updateKoRows(savedRows);
        if (addedRows.length > 0) {
            this.addKoRows(addedRows, opcode);
        }
        return addedRows;
    };

    Grid.deleteKoRows = function(pks) {
        var notDeletedPks = [];
        for (var i = 0; i < pks.length; i++) {
            var pkVal = intVal(pks[i]);
            this.removeSelectedPkVal(pkVal);
            var koRow = this.unselectRow(pkVal);
            if (koRow !== null) {
                this.gridRows.remove(koRow);
            } else {
                notDeletedPks.push(pkVal);
            }
        }
        return notDeletedPks;
    };

    /**
     * Supports updating, adding and deleting multiple rows at once.
     */
    Grid.updatePage = function(viewModel) {
        this.markUpdated(false);
        // Delete first, because append / prepend may add rows with the same keys (refresh the same rows).
        if (typeof viewModel.deleted_pks !== 'undefined') {
            this.deleteKoRows(viewModel.deleted_pks);
        }
        if (typeof viewModel.append_rows !== 'undefined') {
            this.addKoRows(viewModel.append_rows);
        }
        if (typeof viewModel.prepend_rows !== 'undefined') {
            this.addKoRows(viewModel.prepend_rows, 'unshift');
        }
        if (typeof viewModel.update_rows !== 'undefined') {
            this.updateKoRows(viewModel.update_rows);
        }
    };

    /**
     * You may optionally postprocess returned row before applying it to ko viewmodel.
     */
    Grid.iocRow = function(options) {
        return new GridRow(options);
    };

    Grid.iocRowOwner = function(options) {
        options.ownerGrid = this;
        if (typeof options.isSelectedRow === 'undefined') {
            // raw row (direct access to pkField); for GridRow use .getPkVal().
            var pkVal = options.values[this.meta.pkField];
            options.isSelectedRow = this.hasSelectedPkVal(pkVal);
        }
        return this.iocRow(options);
    };

    Grid.afterRowRender = function(elements, koRow) {
        koRow.afterRender();
        if (this.totalRowsCount > 0 && koRow.index === this.totalRowsCount - 1) {
            // Detect end of foreach loop in Knockout.js.
            this.afterRowsRendered();
        }
    };

    Grid.afterRowsRendered = function() {
        /* noop */
    };

    Grid.onSearchReset = function() {
        this.gridSearchDisplayStr('');
    };

    Grid.onPagination = function(page) {
        var self = this;
        self.queryArgs.page = parseInt(page);
        if (isNaN(self.queryArgs.page)) {
            self.queryArgs.page = 1;
        }
        self.listAction();
    };

    Grid.selectOnlyKoRow = function(currKoRow) {
        var self = this;
        var currPkVal = currKoRow.getPkVal();
        // Unselect all rows except current one.
        each(this.gridRows(), function(koRow) {
            if (koRow.getPkVal() !== currPkVal) {
                koRow.isSelectedRow(false);
            }
        });
        // Current row must be inversed _after_ all unselected ones.
        // Otherwise FkGridWidget will fail to set proper input value.
        currKoRow.inverseSelection();
        return currPkVal;
    };

    Grid.iocActionsMenuDialog = function(options) {
        return new ActionsMenuDialog(options);
    };

    Grid.rowSelect = function(currKoRow) {
        console.log('Grid.rowClick() values: ' + JSON.stringify(currKoRow.values));
        if (this.options.selectMultipleRows) {
            currKoRow.inverseSelection();
        } else {
            var currPkVal = this.selectOnlyKoRow(currKoRow);
        }
    };

    Grid.rowClick = function(currKoRow, cellNames) {
        this.lastClickedKoRow = currKoRow;
        this.lastClickedCellNames = cellNames;
        var enabledActions = this.getEnabledActions(currKoRow, 'click', cellNames);
        if (enabledActions.length > 1) {
            // Multiple click actions are available. Open row click actions menu.
            this.actionsMenuDialog = this.iocActionsMenuDialog({
                owner: this
            });
            this.actionsMenuDialog.show();
        } else if (enabledActions.length > 0) {
            enabledActions[0].doForRow(currKoRow);
        } else {
            this.rowSelect(currKoRow);
        }
        /*
            if (this.actions.has('edit_formset')) {
                this.actions.perform('edit_formset', {queryArgs: {'pk_vals': this.selectedRowsPks}});
            }
            if (this.actions.has('edit_form')) {
                this.actions.perform('edit_form', {queryArgs: 'pk_val': currPkVal}});
            }
        */
    };

    Grid.deactivateAllSorting = function(exceptOrder) {
        each(this.gridColumns(), function(gridColumn) {
            gridColumn.deactivateAllSorting(exceptOrder);
        });
    };

    Grid.searchSubstring = function(s) {
        var self = this;
        if (typeof s !== 'undefined') {
            self.gridSearchStr(s);
        }
        self.queryArgs.page = 1;
        self.listAction();
    };

    Grid.iocKoGridColumn = function(options) {
        return new GridColumn(options);
    };

    Grid.iocKoGridColumnOrder = function(options) {
        return new GridColumnOrder(options);
    };

    // May be used in descendant of GridRow() to get metadata of current field.
    Grid.getKoGridColumn = function(fieldName) {
        var result = null;
        find(this.gridColumns(), function(gridColumn) {
            var columnOrder = gridColumn.getColumnOrder(fieldName);
            if (columnOrder !== null) {
                result = {
                    column: gridColumn,
                    order: columnOrder,
                };
                return true;
            }
        });
        return result;
    };

    Grid.setKoGridColumns = function(gridFields) {
        var koGridColumns = [];
        for (var i = 0; i < gridFields.length; i++) {
            if (!isArray(gridFields[i])) {
                gridFields[i] = [gridFields[i]];
            }
            var gridColumnOrders = gridFields[i];
            var koGridColumnOrders = [];
            for (var j = 0; j < gridColumnOrders.length; j++) {
                var gridColumn = gridColumnOrders[j];
                var order = propGet(this.meta.orderBy, gridColumn.field, null);
                koGridColumnOrders.push(this.iocKoGridColumnOrder({
                    field: gridColumn.field,
                    name: gridColumn.name,
                    isSorted: this.isSortedField(gridColumn.field),
                    order: order,
                    ownerGrid: this
                }));
            }
            koGridColumns.push(this.iocKoGridColumn({
                ownerGrid: this,
                columnOrders: koGridColumnOrders
            }));
        }
        this.gridColumns(koGridColumns);
    };

    Grid.iocKoFilterChoice = function(options) {
        return new GridFilterChoice(options);
    };

    Grid.getFkGridOptions = function(field) {
        if (typeof this.options.fkGridOptions[field] === 'undefined') {
            throw new Error(
                sprintf("Missing ['fkGridOptions'] constructor option argument for field '%s'", field)
            );
        }
        var options = this.options.fkGridOptions[field];
        if (typeof options !== 'object') {
            options = {'pageRoute': options};
        }
        return options;
    };

    Grid.expandFilterContents = function(elements, koFilter) {
        var self = koFilter.ownerGrid;
        if (self.options.expandFilterContents) {
            if (self.options.expandFilterContents > 1) {
                initClient(elements);
            } else {
                transformTags.applyAttrs(elements);
            }
        }
    };

    Grid.filterTemplateName = function(koFilter, bindingContext) {
        var templateName = koFilter.getTemplateName();
        var self = bindingContext.grid;
        return getTemplateSubstitution(self.componentSelector, templateName);
    };

    Grid.iocKoFilter_fk = function(filter, options) {
        options.fkGridOptions = $.extend(
            this.getFkGridOptions(filter.field),
            {
                selectMultipleRows: filter.multiple_choices,
                showSelection: true
            }
        );
        // Will use FkGridFilter to select filter choices.
        return {cls: FkGridFilter, options};
    };

    Grid.iocKoFilter_datetime = function(filter, options) {
        options.type = 'datetime';
        return {cls: GridRangeFilter, options};
    };

    Grid.iocKoFilter_date = function(filter, options) {
        options.type = 'date';
        return {cls: GridRangeFilter, options:options};
    };

    Grid.iocKoFilter_number = function(filter, options) {
        options.type = 'number';
        return {cls: GridRangeFilter, options};
    };

    Grid.iocKoFilter_choices = function(filter, options) {
        options.choices = filter.choices;
        return {cls: GridFilter, options};
    };

    Grid.createKoFilter = function(filter) {
        var options = {
            ownerGrid: this,
            field: filter.field,
            name: filter.name,
        };
        if (typeof filter.multiple_choices !== 'undefined') {
            options.allowMultipleChoices = filter.multiple_choices;
        }
        var iocMethod = 'iocKoFilter_' + filter.type;
        if (typeof this[iocMethod] !== 'function') {
            throw new Error(
                sprintf("Undefined method %s for filter type %s", iocMethod, filter.type)
            );
        }
        var iocResult = this[iocMethod](filter, options);
        return new iocResult.cls(iocResult.options);
    };

    // Get filter model by field name.
    Grid.getKoFilter = function(fieldName) {
        var result = null;
        find(this.gridFilters(), function(gridFilter) {
            if (gridFilter.field === fieldName) {
                result = gridFilter;
                return true;
            }
        });
        return result;
    };

    /**
     * Setup filters viewmodels (grid initial loading stage).
     */
    Grid.setupKoFilters = function(filters) {
        var gridFilters = [];
        for (var i = 0; i < filters.length; i++) {
            gridFilters.push(
                this.createKoFilter(filters[i])
            );
        }
        this.gridFilters(gridFilters);
    };

    Grid.hasActiveFilters = function() {
        var activeFiltersCount = 0;
        ko.utils.arrayForEach(this.gridFilters(), function(koFilter) {
            if (koFilter.hasActiveChoices()) {
                activeFiltersCount++;
            }
        });
        return activeFiltersCount;
    };

    /**
     * Setup multiple choices for multiple filters for already loaded grid then list data.
     * Can be used in overloaded .onFirstLoad() method to setup initial filters.
     */
    Grid.setFiltersChoices = function(filterChoices, listActionCallback ) {
        var self = this;
        var foundFilters = 0;
        each(filterChoices, function(choices, filterName) {
            var filter = self.getKoFilter(filterName);
            if (filter !== null) {
                foundFilters++;
                filter.setChoices(choices);
            }
        });
        if (foundFilters > 0) {
            var listActionArgs = [];
            if (typeof listActionCallback === 'function') {
                listActionArgs.push(listActionCallback);
            }
            this.listAction.apply(this, listActionArgs);
        }
    };

    Grid.iocGridPage = function(options) {
        options.ownerGrid = this;
        return new GridPage(options);
    };

    /**
     * Setup pagination viewmodel.
     */
    Grid.setKoPagination = function(totalPages, currPage) {
        var self = this;
        /**
         * Update queryArgs.page value because current page number may be recalculated
         * when meta.rowsPerPage value was changed.
         */
        self.queryArgs.page = currPage;
        self.gridPages([]);
        this.gridTotalPages(totalPages);
        var maxVisiblePages = 5;
        var hasFoldingPage = false;
        var startingPage = currPage - maxVisiblePages;
        if (startingPage < 1) {
            startingPage = 1;
        }
        self.gridPages.push(
            this.iocGridPage({
                'isActive': false /* (1 === currPage) */,
                'title': self.local.toBegin,
                'pageNumber': 1
            })
        );
        for (var i = startingPage; i <= totalPages; i++) {
            if (!hasFoldingPage &&
                    totalPages - startingPage - maxVisiblePages > 2 &&
                    (i === startingPage + maxVisiblePages + 1)
                ) {
                // folding page
                self.gridPages.push(
                    this.iocGridPage({
                        'isActive': (i === currPage),
                        'title': '...',
                        'pageNumber':  i
                    })
                );
                hasFoldingPage = true;
                i = totalPages;
            }
            self.gridPages.push(
                this.iocGridPage({
                    'isActive': (i === currPage),
                    'title': i,
                    'pageNumber':  i
                })
            );
        }
        self.gridPages.push(
            this.iocGridPage({
                'isActive': false /* (totalPages === currPage) */,
                'title': this.local.toEnd,
                'pageNumber': totalPages
            })
        );
    };

    Grid.hasVisiblePagination = function() {
        return this.options.alwaysShowPagination ||
            this.gridTotalPages() > 1 ||
            (this.actionTypesLength['pagination']() + this.actionTypesLength['button_pagination']()) > 0;
    };

    /**
     * Used in GridDialog to display title outside of message template.
     */
    Grid.ownerCtrlSetTitle = function(verboseNamePlural) {
    };

    Grid.getListQueryArgs = function() {
        this.queryArgs[this.queryKeys.search] = this.gridSearchStr();
        this.queryArgs[this.queryKeys.filter] = JSON.stringify(this.queryFilters);
        this.queryArgs['rows_per_page'] = this.meta.rowsPerPage();
        if (this.queryArgs['rows_per_page'] !== this.meta.prevRowsPerPage) {
            this.queryArgs['prev_rows_per_page'] = this.meta.prevRowsPerPage;
        }
        return this.queryArgs;
    };

    Grid.listAction = function(callback) {
        this.actions.perform('list', {}, callback);
    };

    Grid.loadMetaCallback = function(data) {
        if (typeof data.actions !== 'undefined') {
            this.actions.setActions(data.actions);
            this.setKoActionTypes(data.actions);
        }
        if (typeof data.meta !== 'undefined') {
            this.updateMeta(data.meta);
            this.ownerCtrlSetTitle(data.meta.verboseNamePlural);
        }
        if (typeof data.sortOrders !== 'undefined') {
            this.sortOrders = {};
            for (var i = 0; i < data.sortOrders.length; i++) {
                this.sortOrders[data.sortOrders[i]] = i;
            }
        }
        if (typeof data.gridFields !== 'undefined') {
            if (this.options.defaultOrderBy !== null) {
                // Override grid meta.orderBy via supplied Grid() options.
                this.meta.orderBy = this.options.defaultOrderBy;
            }
            this.setKoGridColumns(data.gridFields);
        }
        if (typeof data.filters !== 'undefined') {
            this.setupKoFilters(data.filters);
        }
        if (typeof data.markSafe !== 'undefined' && isArray(data.markSafe)) {
            this.meta.markSafeFields = data.markSafe;
        }
    };

    Grid.isMarkSafeField = function(fieldName) {
        return indexOf(this.meta.markSafeFields, fieldName) !== -1;
    };

    Grid.vScrollPage = function() {
        // Will work with standard templates. For custom template one may override the selector.
        this.componentSelector.find('.table-responsive.vscroll').scrollTop(0);
    };

    Grid.listCallback = function(data) {
        var self=this;
        if (propGet(data, 'has_errors') === true) {
            // There is nothing to list. Additional error viewmodel might be processed instead.
            return;
        }
        // console.log(data);
        if (this.options.vScrollPage) {
            this.vScrollPage();
        }
        // Set grid rows viewmodels.
        var gridRows = [];
        this.totalRowsCount = data.entries.length;
        each(data.entries, function(row, k) {
            // Recall previously selected grid rows from this.hasSelectedPkVal().
            if (typeof row[self.meta.pkField] === 'undefined') {
                throw new Error(
                    sprintf("Supplied row has no '%s' key", self.meta.pkField)
                );
            }
            gridRows.push(
                self.iocRowOwner({
                    values: row,
                    index: k
                })
            );
        });
        if (propGet(data, 'update') === true) {
            for (var i = 0; i < gridRows.length; i++) {
                var newRow = gridRows[i];
                var findResult = this.findKoRowByPkVal({
                    pkVal: newRow.getPkVal(),
                    withKey: true
                });
                if (findResult.koRow === null) {
                    newRow.isUpdated(true);
                    self.gridRows.unshift(newRow);
                } else if (!newRow.is(findResult.koRow)) {
                    newRow.isUpdated(true);
                    self.gridRows.splice(findResult.key, 1, newRow);
                }
            }
        } else {
            self.gridRows(gridRows);
        }
        this.hasSelectAllRows(this.checkAllRowsSelected());
        // Temporarily disable meta.rowsPerPage() subscription.
        this.disposeMethod('meta.rowsPerPage');
        this.meta.prevRowsPerPage = this.meta.rowsPerPage();
        this.meta.rowsPerPage(data.rowsPerPage);
        // Re-enable meta.rowsPerPage() subscription.
        this.subscribeToMethod('meta.rowsPerPage');
        // Set grid pagination viewmodels.
        this.setKoPagination(data.totalPages, data.page);
    };

    Grid.iocKoAction = function(options) {
        var classPath = propGet(options.actDef, 'classPath', 'KoGridAction');
        return gridActionIoc.factory(classPath, options);
    };

    Grid.setKoActionTypes = function(metaActions) {
        var self = this;
        each(this.uiActionTypes, function(type) {
            self.actionTypes[type]([]);
        });
        // Do not forget to include all possible types of actions into this list.
        each(metaActions, function(actions, actionType) {
            // Built-in actions are invisible to Knockout.js UI and should not be added into self.actionTypes.
            if (actionType !== 'built_in') {
                if (typeof self.actionTypes[actionType] === 'undefined') {
                    throw new Error(
                        sprintf('Unknown action type: "%s"', actionType)
                    );
                }
                for (var i = 0; i < actions.length; i++) {
                    var actDef = actions[i];
                    if (typeof actDef.enabled === 'undefined') {
                        actDef.enabled = true;
                    }
                    if (actDef.enabled) {
                        self.actionTypes[actionType].push(Grid.iocKoAction({
                            grid: self,
                            actDef: actDef
                        }));
                    }
                }
            }
        });
    };

    /**
     * Get ui ko action by it's name, optionally restricted to specific action type.
     * Can be used to perform grid-wide action programmatically via .doAction(),
     * row-specific action via .doForRow() methods.
     */
    Grid.getKoAction = function(actionName, actionType) {
        var action = null;
        $.each(this.actionTypes, function(actType, actions) {
            if (typeof actionType === 'undefined' || actType === actionType) {
                for (var i = 0; i < actions().length; i++) {
                    if (actions()[i].name === actionName) {
                        action = actions()[i];
                        return false;
                    }
                }
            }
        });
        return action;
    };

    // Pass fired visual action from ko ui to actual action implementation.
    Grid.performKoAction = function(koAction, actionOptions) {
        this.actions.setLastKoAction(koAction);
        this.actions.performLastAction(actionOptions);
    };

    Grid.performAction = function(actionName, actionType, actionOptions) {
        var koAction = this.getKoAction(actionName, actionType);
        this.performKoAction(koAction, actionOptions);
    };

    Grid.getCellActions = function(actionType, cellNames) {
        var enabledActions = [];
        var actions = ko.utils.unwrapObservable(this.actionTypes[actionType]);
        if (cellNames !== undefined && !Array.isArray(cellNames)) {
            cellNames = [cellNames];
        }
        for (var i = 0; i < actions.length; i++) {
            var action = actions[i];
            if (cellNames === undefined || any(cellNames, action.hasCell.bind(action))) {
                enabledActions.push(action);
            }
        }
        return enabledActions;
    };

    // Returns only enabled actions for particular GridRow instance of the specified actionType.
    Grid.getEnabledActions = function(koRow, actionType, cellNames) {
        var enabledActions = [];
        var actions = ko.utils.unwrapObservable(this.actionTypes[actionType]);
        if (cellNames !== undefined && !Array.isArray(cellNames)) {
            cellNames = [cellNames];
        }
        for (var i = 0; i < actions.length; i++) {
            var action = actions[i];
            if (koRow.observeEnabledAction(action)()) {
                if (cellNames === undefined || any(cellNames, action.hasCell.bind(action))) {
                    enabledActions.push(action);
                }
            }
        }
        return enabledActions;
    };

    // Update ui lists of action buttons / menus per row.
    Grid.setACL = function(koRow) {
        for (var i = 0; i < this.uiActionTypes.length; i++) {
            this.getEnabledActions(koRow, this.uiActionTypes[i]);
        }
    };

    // Used in ActionTemplateDialog 'ko_action_form' template.
    Grid.getLastPkVal = function() {
        return this.lastClickedKoRow.getPkVal();
    };

    Grid.modelFormAction = function(response) {
        var vm = this.actions.getOurViewmodel(response);
        if (vm === null) {
            /**
             * If response has no our grid viewmodel (this.actions.viewModelName), then it's a form viewmodel errors
             * response which will be processed by AjaxForm.submit().
             */
            return true;
        } else {
            this.actions.respond(
                this.actions.lastActionName,
                response
            );
            // Do not process viewmodel response, because we already processed it here.
            return false;
        }
    };

    Grid.getLastActionLocalName = function() {
        return this.actions.lastKoAction.localName;
    };

    Grid.onActionTemplateDialogCreate = function(dialog, options) {
        /**
         * Update meta (display text) for bound ko template (this.templateId).
         * This may be used to invoke the same dialog with different messages
         * for similar yet different actions.
         */
        if (typeof options.meta !== 'undefined') {
            this.updateMeta(options.meta);
            delete options.meta;
        }
        options.title = this.getLastActionLocalName();
        options.actionLabel = options.title;
    };

    Grid.onActionTemplateDialogShow = function(dialog) {
        /**
         * Render current row object description in multiple actions menu when there are more than one 'click' type
         * actions for the current grid row.
         */
        var self = this;
        if (typeof this.lastClickedKoRow !== 'undefined') {
            dialog.actionHeading = this.lastClickedKoRow.renderHeading(
                this.actions.getNestedListOptions()
            );
            dialog.actionHeading.filter('*').each(function(k, v) {
                ko.applyBindings(self, v);
            });
            dialog.bdialog.getModalBody().prepend(dialog.actionHeading);
        }
    };

    Grid.onActionTemplateDialogHide = function(dialog) {
        if (typeof dialog.actionHeading !== 'undefined') {
            dialog.actionHeading.filter('*').each(function(k, v) {
                ko.cleanNode(v);
            });
        }
    };

    Grid.ownerRowsChange = function() {
        // https://github.com/knockout/knockout/commit/11dc1389cdc764e959531824b526ca106d123791
        return this.gridRows.subscribe(
            this.ownerCtrl.onChildGridRowsChange, this.ownerCtrl, 'arrayChange'
        );
    };

}(Grid.prototype);

export { Grid };
