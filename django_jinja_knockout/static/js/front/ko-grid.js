ko.bindingHandlers.grid_row = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var realElement = ko.from_virtual(element);
        if (realElement !== null) {
            viewModel.setRowElement($(realElement));
        }
    }
};

ko.virtualElements.allowedBindings.grid_row = true;

ko.bindingHandlers.grid_filter = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        viewModel.setDropdownElement($(element));
    }
};

ko.bindingHandlers.grid_filter_choice = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        viewModel.setLinkElement($(element));
    }
};

ko.bindingHandlers.grid_order_by = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        viewModel.setSwitchElement($(element));
    }
};

/**
 * Grid column ordering control.
 */

App.ko.GridColumnOrder = function(options) {
    this.init(options);
};

(function(GridColumnOrder) {

    GridColumnOrder.init = function(options) {
        this.$switch = null;
        this.ownerGrid = options.ownerGrid;
        this.field = options.field;
        this.name = options.name;
        // true means 'asc', false means 'desc'.
        this.order = ko.observable(null);
        this.isSortedColumn = ko.observable(options.isSorted);
    };

    GridColumnOrder.setSwitchElement = function($element) {
        this.$switch = $element;
    };

    GridColumnOrder.is = function(anotherOrder) {
        return this.field === anotherOrder.field;
    };

    GridColumnOrder.onSwitchOrder = function() {
        this.ownerGrid.deactivateAllSorting(this);
        if (this.order() === null) {
            this.order(true);
        } else {
            this.order(!this.order());
        }
        var direction = this.order() ? 'desc' : 'asc';
        this.ownerGrid.setQueryOrderBy(this.field, direction);
        this.ownerGrid.loadPage();
    };

})(App.ko.GridColumnOrder.prototype);


/**
 * Grid filter choice control. One dropdown filter has multiple filter choices.
 */

App.ko.GridFilterChoice = function(options) {
    this.init(options);
};

(function (GridFilterChoice) {

    GridFilterChoice.init = function(options) {
        var self = this;
        this.$link = null;
        this.ownerFilter = options.ownerFilter;
        this.name = options.name;
        this.value = options.value;
        this.is_active = ko.observable(options.is_active);
        this.is_active.subscribe(function(newValue) {
            if (self.value === null) {
                return;
            }
            if (newValue) {
                self.ownerFilter.addQueryFilter(self.value);
            } else {
                self.ownerFilter.removeQueryFilter(self.value);
            }
        });
    };

    GridFilterChoice.setLinkElement = function($element) {
        var self = this;
        this.$link = $element;
    };

    GridFilterChoice.onLoadFilter = function(ev) {
        this.ownerFilter.switchKoFilterChoices(this, ev);
        this.ownerFilter.ownerGrid.queryArgs.page = 1;
        this.ownerFilter.ownerGrid.loadPage();
    };

    GridFilterChoice.is = function(filterChoice) {
        return this.$link.is(filterChoice.$link);
    };

})(App.ko.GridFilterChoice.prototype);

/**
 * Common ancestor of App.ko.GridFilter and App.ko.FkGridFilter.
 */

App.ko.AbstractGridFilter = function(options) {
    this.init(options);
};

(function(AbstractGridFilter) {

    AbstractGridFilter.init = function(options) {
        this.$dropdown = null;
        this.ownerGrid =  options.ownerGrid;
        this.field = options.field;
        this.name = options.name;
        this.hasActiveChoices = ko.observable(false);
        this.choices = [];
        this.current_name = ko.observable('');
        // One of this.choices, special 'reset all choice'.
        this.resetFilter = null;
    };

    AbstractGridFilter.setDropdownElement = function($element) {
        var self = this;
        this.$dropdown = $element;
        /*
        // Example of custom events.
        // http://knockoutjs.com/documentation/custom-bindings-disposal.html
        this.$dropdown.on({
            "hide.bs.dropdown": function(ev) {
                return true;
            }
        });
        */
    };

    AbstractGridFilter.onDropdownClick = function(ev) {
        // console.log('dropdown clicked');
    };

    AbstractGridFilter.addQueryFilter = function(value) {
        this.ownerGrid.addQueryFilter(this.field, value);
    };

    AbstractGridFilter.removeQueryFilter = function(value) {
        this.ownerGrid.removeQueryFilter(this.field, value);
    };

})(App.ko.AbstractGridFilter.prototype);

/**
 * Grid filter control. Contains multiple App.ko.GridFilterChoice instances or their descendants.
 */

App.ko.GridFilter = function(options) {
    $.inherit(App.ko.AbstractGridFilter.prototype, this);
    this.init(options);
};

(function(GridFilter) {

    GridFilter.init = function(options) {
        this.super.init.call(this, options);
    };

    // Return the count of active filter choices except for special 'reset all choice' (choice.value === null).
    // Also initialized this.resetFilter.
    GridFilter.getTotalActive = function() {
        var totalActive = 0;
        this.resetFilter = null;
        for (var i = 0; i < this.choices.length; i++) {
            if (this.choices[i].value === null) {
                this.resetFilter = this.choices[i];
            } else if (this.choices[i].is_active()) {
                totalActive++;
            }
        }
        return totalActive;
    };

    GridFilter.resetFilterLogic = function() {
        var totalActive = this.getTotalActive();
        if (this.resetFilter !== null) {
            // Check whether all filter choices are active except for 'reset all choice'.
            if (totalActive === this.choices.length - 1) {
                // All choices of the filter are active. Activate (highlight) 'reset all choice' instead.
                for (var i = 0; i < this.choices.length; i++) {
                    if (this.choices[i].value !== null) {
                        this.choices[i].is_active(false);
                    }
                }
                this.resetFilter.is_active(true);
            } else if (totalActive === 0) {
                // No active filter choices means that 'reset all choice' must be highlighted (activated).
                this.resetFilter.is_active(true);
            } else {
                // Only some of the filter choices are active. Deactivate 'reset all choice'.
                this.resetFilter.is_active(false);
            }
        }
    };

    GridFilter.switchKoFilterChoices = function(currentChoice, ev) {
        if (currentChoice.value === null) {
            // Special 'all' value, deactivate all filter choices except current one.
            for (var i = 0; i < this.choices.length; i++) {
                this.choices[i].is_active(false);
            }
            currentChoice.is_active(true);
        } else if (this.choices.length <= 3) {
            // Multiple filter choices are meaningless for only two choices and their reset choice.
            // Switch current filter choice.
            currentChoice.is_active(!currentChoice.is_active());
            // Turn off all another filter choices.
            for (var i = 0; i < this.choices.length; i++) {
                if (!currentChoice.is(this.choices[i])) {
                    this.choices[i].is_active(false);
                }
            }
            this.resetFilterLogic();
        } else {
            // Do not close dropdown for multiple filter choices.
            ev.stopPropagation();
            // Switch current filter choice.
            currentChoice.is_active(!currentChoice.is_active());
            this.resetFilterLogic();
        }
        this.hasActiveChoices(!this.resetFilter.is_active());
    };

})(App.ko.GridFilter.prototype);

/**
 * Foreign key grid filter control. Contains dialog with another grid that selects filter values.
 */

App.ko.FkGridFilter = function(options) {
    $.inherit(App.ko.AbstractGridFilter.prototype, this);
    this.init(options);
};

(function(FkGridFilter) {

    FkGridFilter.init = function(options) {
        this.gridDialog = new App.GridDialog({
            ownerComponent: this,
            gridOptions: options.fkGridOptions
        });
        this.super.init.call(this, options);
    };

    FkGridFilter.onDropdownClick = function(ev) {
        this.gridDialog.show();
    };

    FkGridFilter.addQueryFilter = function(value) {
        this.super.addQueryFilter.call(this, value);
        this.ownerGrid.queryArgs.page = 1;
        this.ownerGrid.loadPage();
    };

    FkGridFilter.removeQueryFilter = function(value) {
        this.super.removeQueryFilter.call(this, value);
        this.ownerGrid.queryArgs.page = 1;
        this.ownerGrid.loadPage();
    };

})(App.ko.FkGridFilter.prototype);

/**
 * Single row of grid (ko viewmodel).
 */
App.ko.GridRow = function(options) {
    this.init(options);
};

(function(GridRow) {

    // Descendant could skip html encoding selected fields to preserve html formatting.
    GridRow.htmlEncode = function(displayValue, field) {
        return $.htmlEncode(displayValue);
    };

    // Descendant could make Knockout.js observable values.
    GridRow.toDisplayValue = function(value, field) {
        var displayValue;
        var fieldRelated = field.match(/(.+)_id$/);
        if (fieldRelated !== null) {
            fieldRelated = fieldRelated[1];
        }
        // Automatic server-side formatting.
        if (typeof this.strFields[field] !== 'undefined') {
            displayValue = this.strFields[field];
        } else if (fieldRelated !== null && typeof this.strFields[fieldRelated] !== 'undefined') {
            displayValue = this.strFields[fieldRelated];
        } else if (typeof value === 'boolean') {
            displayValue = {true: App.trans('Yes'), false: App.trans('No')}[value];
        } else if (value === null) {
            displayValue = App.trans('N/A');
        } else {
            displayValue = value;
        }
        return this.htmlEncode(displayValue, field);
    };

    GridRow.initDisplayValues = function() {
        this.displayValues = _.mapObject(this.values, _.bind(this.toDisplayValue, this));
    };

    GridRow.init = function(options) {
        var self = this;
        this.isSelectedRow = ko.observable(options.isSelectedRow);
        this.isSelectedRow.subscribe(function(newValue) {
            if (newValue) {
                self.ownerGrid.onSelectRow(self);
            } else {
                self.ownerGrid.onUnselectRow(self);
            }
        });
        this.$row = null;
        this.ownerGrid = options.ownerGrid;
        // Source data field values. May be used for AJAX DB queries, for example.
        this.values = options.values;
        // See views.KoGridView.postprocess_row() how and when this.values.__str_fields are populated.
        if (typeof this.values['__str_fields'] === 'undefined') {
            this.strFields = {};
        } else {
            this.strFields = this.values.__str_fields;
            delete this.values.__str_fields;
        }
        // 'Rendered' (formatted) field values, as displayed by ko_grid_body template bindings.
        this.displayValues = {};
        this.initDisplayValues();
    };

    GridRow.getValue = function(field) {
        return typeof this.values[field] === 'undefined' ? undefined : this.values[field];
    };

    GridRow.onRowClick = function() {
        this.isSelectedRow(!this.isSelectedRow());
        this.ownerGrid.rowClick(this);
    };

    GridRow.setRowElement = function($element) {
        var self = this;
        this.$row = $element;
    };

})(App.ko.GridRow.prototype);

/**
 * Pagination link ko model.
 */
App.ko.GridPage = function(options) {
    this.init(options);
};

(function(GridPage) {

    GridPage.init = function(options) {
        this.ownerGrid = options.ownerGrid;
        this.isActive = options.isActive;
        this.title = options.title,
        this.pageNumber = options.pageNumber;
    };

    GridPage.onPagination = function() {
        this.ownerGrid.onPagination(this.pageNumber);
    };

})(App.ko.GridPage.prototype);

/**
 * AJAX Grid powered by Knockout.js.
 *
 * Note that for more advanced grids, such as displaying custom-formatted field values, one has to inherit
 * from App.ko.Grid to override App.ko.Grid.iocRow() and
 * from App.ko.GridRow to override App.ko.GridRow.initDisplayValues().
 */

App.ko.Grid = function(options) {
    this.init(options);
};

(function(Grid) {

    Grid.viewName = 'grid_page';

    Grid.queryKeys = {
        filter: 'list_filter',
        order:  'list_order_by',
        search: 'list_search'
    };

    Grid.localize = function() {
        this.local = {
            toBegin: App.trans('First page'),
            toEnd: App.trans('Last page'),
        };
        this.meta.searchPlaceholder = ko.observable(
            (this.options.searchPlaceholder === null) ? App.trans('Search') : this.options.searchPlaceholder
        );
    };

    Grid.initAjaxParams = function() {
        this.queryArgs = {
            page: 1,
            load_meta: true
        };
        this.queryFilters = {};
        if (this.options.defaultOrderBy !== null)
        this.setQueryOrderBy(this.options.defaultOrderBy);
        if (this.options.pageRoute === null) {
            this.pageUrl = this.options.pageUrl;
        } else {
            this.pageUrl = App.routeUrl(this.options.pageRoute);
        }
    };

    Grid.run = function(selector) {
        this.applyBindings(selector);
        this.searchSubstring();
    };

    Grid.applyBindings = function(selector) {
        this.$selector = $(selector);
        ko.applyBindings(this, this.$selector.get(0));
    };

    Grid.cleanBindings = function() {
        ko.cleanNode(this.$selector.get(0));
    };

    Grid.init = function(options) {
        var self = this;
        this.options = $.extend({
            ownerCtrl: null,
            defaultOrderBy: null,
            fkGridOptions: {},
            searchPlaceholder: null,
            selectMultipleRows: false,
            pageRoute: null,
            // Assume current route by default
            // (non-AJAX GET is handled by KoGridView ancestor, AJAX POST is handled by App.ko.Grid).
            pageUrl: '',
        }, options);
        this.ownerCtrl = this.options.ownerCtrl;

        this.meta = {
            pkField: '',
            hasSearch: ko.observable(false),
            verboseName: ko.observable(''),
            verboseNamePlural: ko.observable(''),
        };
        this.sortOrders = {};
        this.selectedRowsPks = [];
        this.gridColumns = ko.observableArray();
        this.gridFilters = ko.observableArray();
        this.gridRows = ko.observableArray();
        this.gridPages = ko.observableArray();
        this.gridSearchStr = ko.observable('');
        this.gridSearchStr.subscribe(function(newValue) {
            self.searchSubstring(newValue);
        });

        this.initAjaxParams();
        this.localize();

        /*
        this.$selector.on('show.bs.modal', function (ev) {
            // http://stackoverflow.com/questions/11570333/how-to-get-twitter-bootstrap-modals-invoker-element
            var $invoker = $(ev.relatedTarget);
            var $endPointHolder = $invoker.parents('[data-end-point-prefix]');
        });
        */

    };

    Grid.isSortedField = function(field) {
        return typeof this.sortOrders[field] !== 'undefined';
    };

    // Supports multiple values of filter.
    Grid.addQueryFilter = function(field, value) {
        if (value === null) {
            delete this.queryFilters[field];
        } else {
            if (typeof this.queryFilters[field] === 'undefined') {
                // Single value.
                this.queryFilters[field] = value;
            } else {
                if (this.queryFilters[field] === value) {
                    // Already added single value.
                    return;
                }
                if (!_.isArray(this.queryFilters[field])) {
                    // Convert single value into array of values.
                    this.queryFilters[field] = [this.queryFilters[field]];
                }
                if (_.find(this.queryFilters[field], function(val) { return val === value; }) === undefined) {
                    // Multiple values: 'field__in' at server-side.
                    this.queryFilters[field].push(value);
                }
            }
        }
    };

    // Supports multiple values of filter.
    Grid.removeQueryFilter = function(field, value) {
        if (typeof this.queryFilters[field] !== 'undefined') {
            if (value === null) {
                delete this.queryFilters[field];
                return;
            }
            if (!_.isArray(this.queryFilters[field])) {
                if (this.queryFilters[field] === value) {
                    delete this.queryFilters[field];
                }
            } else {
                this.queryFilters[field] = _.filter(this.queryFilters[field], function(val) {
                    return val !== value;
                });
                var len = this.queryFilters[field].length;
                if (len === 1) {
                    this.queryFilters[field] = this.queryFilters[field].pop();
                } else if (len === 0) {
                    delete this.queryFilters[field];
                }
            }
        }
    };

    // todo: Support multiple order_by.
    Grid.setQueryOrderBy = function(fieldName, direction) {
        if (typeof fieldName == 'undefined') {
            delete this.queryArgs[this.queryKeys.order];
        } else {
            var orderBy = '';
            // Django specific implementation.
            if (direction === 'desc') {
                orderBy += '-';
            }
            orderBy += fieldName;
            this.queryArgs[this.queryKeys.order] = JSON.stringify(orderBy);
        }
    };

    Grid.hasSelectedRow = function(pkVal) {
        if (pkVal === undefined) {
            throw sprintf("Supplied row has no '%s' key", this.meta.pkField);
        }
        for (var i = 0; i < this.selectedRowsPks.length; i++) {
            if (this.selectedRowsPks[i] === pkVal) {
                return true;
            }
        }
        return false;
    };

    Grid.filterOutRow = function(pkVal) {
        if (pkVal === undefined) {
            throw sprintf("Supplied row has no '%s' key", this.meta.pkField);
        }
        this.selectedRowsPks = _.filter(this.selectedRowsPks, function(val) {
            return val !== pkVal;
        });
    };

    Grid.propCall = App.propCall;

    /**
     * Called from child row when the row is selected.
     */
    Grid.onSelectRow = function(koRow) {
        var pkVal = koRow.getValue(this.meta.pkField);
        if (this.options.selectMultipleRows) {
            if (!this.hasSelectedRow(pkVal)) {
                this.selectedRowsPks.push(pkVal);
            }
        } else {
            this.selectedRowsPks = [pkVal];
        }
        this.propCall('ownerCtrl.onChildGridSelectRow', pkVal);
    };

    /**
     * Called from child row when the row is unselected.
     */
    Grid.onUnselectRow = function(koRow) {
        var pkVal = koRow.getValue(this.meta.pkField);
        this.filterOutRow(pkVal);
        this.propCall('ownerCtrl.onChildGridUnselectRow', pkVal);
    };

    /**
     * Find App.ko.GridRow instance in this.gridRows by row pk value.
     */
    Grid.findKoRowByPkVal = function(pkVal) {
        var self = this;
        var koRow = null;
        $.each(this.gridRows(), function(k, v) {
            if (v.getValue(self.meta.pkField) === pkVal) {
                koRow = v;
                return false;
            }
        });
        return koRow;
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
        // this.filterOutRow(koRow.getValue(this.meta.pkField));
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

    /**
     * You may optionally postprocess returned row before applying it to ko viewmodel.
     */
    Grid.iocRow = function(options) {
        return new App.ko.GridRow(options);
    };

    Grid.onSearchReset = function() {
        this.gridSearchStr('');
    };

    Grid.onPagination = function(page) {
        var self = this;
        self.queryArgs.page = parseInt(page);
        if (isNaN(self.queryArgs.page)) {
            self.queryArgs.page = 1;
        }
        /*
        $(ev.target)
            .parents(self.$selector.get(0))
            .find('div.table-responsive').scrollTop(0);
        */
        self.loadPage();
    };
    
    Grid.rowClick = function(koRow) {
        // console.log('koRow: ' + JSON.stringify(koRow));
        console.log('values: ' + JSON.stringify(koRow.values));
    };

    Grid.deactivateAllSorting = function(exceptOrder) {
        $.each(this.gridColumns(), function(k, gridOrder) {
            if (!gridOrder.is(exceptOrder)) {
                gridOrder.order(null);
            }
        });
    };

    Grid.searchSubstring = function(s) {
        var self = this;
        if (typeof s !== 'undefined') {
            self.gridSearchStr(s);
        }
        self.queryArgs.page = 1;
        self.loadPage();
    };

    Grid.iocKoGridColumn = function(options) {
        return new App.ko.GridColumnOrder(options);
    };

    Grid.setKoGridColumns = function(gridFields) {
        for (var i = 0; i < gridFields.length; i++) {
            var gridColumn = gridFields[i];
            this.gridColumns.push(
                this.iocKoGridColumn({
                    field: gridColumn.field,
                    name: gridColumn.name,
                    isSorted: this.isSortedField(gridColumn.field),
                    ownerGrid: this
                })
            );
        }
    };

    Grid.iocKoFilterChoice = function(options) {
        return new App.ko.GridFilterChoice(options);
    };

    Grid.iocDropdownFilter = function(options) {
        return new App.ko.GridFilter(options);
    }

    Grid.getFkGridOptions = function(field) {
        if (typeof this.options.fkGridOptions[field] === 'undefined') {
            throw sprintf("Missing ['fkGridOptions'] constructor option argument for field '%s'", field);
        }
        var options = this.options.fkGridOptions[field];
        if (typeof options !== 'object') {
            options = {'pageRoute': options};
        }
        return options;
    };

    Grid.iocFkFilter = function(options) {
        return new App.ko.FkGridFilter(options);
    };

    Grid.setKoFilter = function(filter) {
        var filterModel;
        var options = {
            ownerGrid: this,
            field: filter.field,
            name: filter.name,
        };
        if (filter.choices === null) {
            options.fkGridOptions = this.getFkGridOptions(filter.field);
            filterModel = this.iocFkFilter(options);
        } else {
            filterModel = this.iocDropdownFilter(options);
        }
        var choices = filter.choices;
        if (choices === null) {
            // Will use App.ko.FkGridFilter to select filter choices.
            filterModel.choices = null;
        } else {
            filterModel.choices.push(
                this.iocKoFilterChoice({
                    ownerFilter: filterModel,
                    name: App.trans('All'),
                    value: null,
                    is_active: true
                })
            );
            for (var i = 0; i < choices.length; i++) {
                var choice = choices[i];
                filterModel.choices.push(
                    this.iocKoFilterChoice({
                        ownerFilter: filterModel,
                        name: choice.name,
                        value: choice.value,
                        is_active: (typeof choice.is_active) === 'undefined' ? false : choice.is_active
                    })
                );
            }
        }
        this.gridFilters.push(filterModel);
    };

    /**
     * Setup filters viewmodels.
     */
    Grid.setKoFilters = function(filters) {
        for (var i = 0; i < filters.length; i++) {
            this.setKoFilter(filters[i]);
        }
    };

    Grid.iocGridPage = function(options) {
        options.ownerGrid = this;
        return new App.ko.GridPage(options);
    };

    /**
     * Setup pagination viewmodel.
     */
    Grid.setKoPagination = function(totalPages, currPage) {
        var self = this;
        self.gridPages([]);
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

    /**
     * Get viewmodels data for grid page and grid pagination via ajax-query.
     */
    Grid.loadPage = function() {
        var self = this;
        var options = {'after': {}};
        options['after'][self.viewName] = function(viewModel) {
            console.log('viewModel response: ' + JSON.stringify(viewModel));
            self.setKoPage(viewModel);
        };
        self.queryArgs[self.queryKeys.search] = self.gridSearchStr();
        self.queryArgs[self.queryKeys.filter] = JSON.stringify(self.queryFilters);
        // console.log('AJAX query: ' + JSON.stringify(self.queryArgs));
        self.queryArgs.csrfmiddlewaretoken = App.conf.csrfToken;
        $.post(self.pageUrl,
            self.queryArgs,
            function(response) {
                if (typeof self.queryArgs.load_meta !== 'undefined') {
                    delete self.queryArgs.load_meta;
                }
                App.viewResponse(response, options);
            },
            'json'
        )
        .fail(App.showAjaxError);
    };

    /**
     * Used in App.GridDialog to display title outside of message template.
     */
    Grid.ownerCtrlSetTitle = function(verboseNamePlural) {
    };

    /**
     * Populate viewmodel from AJAX response.
     */
    Grid.setKoPage = function(data) {
        var self = this;
        if (typeof data.meta !== 'undefined') {
            ko.set_props(data.meta, self.meta);
            this.ownerCtrlSetTitle(data.meta.verboseNamePlural);
        }
        if (typeof data.sortOrders !== 'undefined') {
            for (var i = 0; i < data.sortOrders.length; i++) {
                self.sortOrders[data.sortOrders[i]] = i;
            }
        }
        if (typeof data.gridFields !== 'undefined') {
            self.setKoGridColumns(data.gridFields);
        }
        // console.log(data);
        // Set grid rows viewmodels.
        self.gridRows([]);
        $.each(data.entries, function(k, row) {
            // Recall previously selected grid rows from this.hasSelectedRow().
            if (typeof row[self.meta.pkField] === 'undefined') {
                throw sprintf("Supplied row has no '%s' key", this.meta.pkField);
            }
            var pkVal = row[self.meta.pkField];
            self.gridRows.push(
                self.iocRow({
                    ownerGrid: self,
                    isSelectedRow: self.hasSelectedRow(pkVal),
                    values: row
                })
            );
        });
        // Set grid pagination viewmodels.
        self.setKoPagination(data.totalPages, self.queryArgs.page);
        if (typeof data.filters !== 'undefined') {
            self.setKoFilters(data.filters);
        }
    };

})(App.ko.Grid.prototype);

/**
 * BootstrapDialog that incorporates App.ko.Grid descendant instance bound to it's content (this.dialog.message).
 *
 * Example of manual invocation:

App.documentReadyHooks.push(function() {
    var dialog = new App.GridDialog({
        iocGrid: function(options) {
            options.pageRoute = 'region_grid';
            // options.selectMultipleRows = false;
            return new App.ko.Grid(options);
        }
    });
    dialog.show();
});

*/

App.GridDialog = function(options) {
    $.inherit(App.Dialog.prototype, this);
    this.create(options);
};

(function(GridDialog) {

    GridDialog.getButtons = function() {
        var self = this;
        return [{
            label: App.trans('Remove selection'),
            action: function(dialogItself) {
                self.onRemoveSelection();
            }
        },{
            label: App.trans('Apply'),
            action: function(dialogItself) {
                if (self.onApply()) {
                    dialogItself.close();
                }
            }
        }];
    };

    GridDialog.create = function(options) {
        this.wasOpened = false;
        if (typeof options !== 'object') {
            options = {};
        }
        var fullOptions = $.extend(
            {
                ownerComponent: null,
                template: 'ko_grid_body',
                buttons: this.getButtons()
            }, options);
        // Child grid constructor options.
        this.gridOptions = fullOptions.gridOptions;
        delete fullOptions.gridOptions;
        // Reference to owner component (for example App.ko.FkGridFilter instance).
        this.ownerComponent = fullOptions.ownerComponent;
        delete fullOptions.ownerComponent;
        this.super.create.call(this, fullOptions);
    };

    GridDialog.propCall = App.propCall;

    GridDialog.onRemoveSelection = function() {
        this.grid.unselectAllRows();
        this.propCall('ownerComponent.removeQueryFilter', null);
        this.propCall('ownerComponent.hasActiveChoices', false);
    };

    GridDialog.onApply = function() {
        return true;
    };

    GridDialog.onChildGridSelectRow = function(pkVal) {
        console.log('pkVal: ' + JSON.stringify(pkVal));
        this.propCall('ownerComponent.addQueryFilter', pkVal);
        this.propCall('ownerComponent.hasActiveChoices', true);
    };

    GridDialog.onChildGridUnselectRow = function(pkVal) {
        console.log('pkVal: ' + JSON.stringify(pkVal));
        this.propCall('ownerComponent.removeQueryFilter', pkVal);
        this.propCall('ownerComponent.hasActiveChoices', this.grid.selectedRowsPks.length > 0);
    };

    GridDialog.iocGrid = function(options) {
        options = $.extend(
            this.gridOptions,
            options,
            {selectMultipleRows: true}
        );
        if (typeof this.dialogOptions.iocGrid === 'function') {
            return this.dialogOptions.iocGrid(options);
        } else {
            return new App.ko.Grid(options);
        }
    };

    GridDialog.iocGridOwner = function(message) {
        var grid = this.iocGrid({
            applyTo: message,
            ownerCtrl: this
        });
        grid.ownerCtrlSetTitle = _.bind(
            function(verboseNamePlural) {
                this.ownerCtrl.setTitle(verboseNamePlural);
            },
            grid
        );
        return grid;
    };

    GridDialog.onHide = function() {
        this.grid.cleanBindings();
    };

    GridDialog.onShow = function() {
        // Inject ko_grid_pagination underscore / knockout.js template into BootstrapDialog modal footer.
        var $footer = this.bdialog.getModalFooter();
        var $gridPagination = $(App.compileTemplate('ko_grid_pagination')());
        $footer.prepend($gridPagination);
        if (this.wasOpened) {
            this.recreateContent();
        } else {
            // Apply App.ko.Grid or descendant bindings to BootstrapDialog modal.
            this.grid = this.iocGridOwner();
        }
        this.grid.applyBindings(this.bdialog.getModal());
        this.grid.searchSubstring();
        this.wasOpened = true;
    };

    GridDialog.remove = function() {
        if (this.wasOpened) {
            this.grid.cleanBindings();
        }
        this.super.remove.call(this);
    };

})(App.GridDialog.prototype);
