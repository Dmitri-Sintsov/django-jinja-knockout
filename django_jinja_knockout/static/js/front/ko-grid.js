// todo: http://knockoutjs.com/documentation/custom-bindings-disposal.html

ko.bindingHandlers.grid_row = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        viewModel.setRowElement($(element));
    }
};

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
    };

    GridColumnOrder.setSwitchElement = function($element) {
        var self = this;
        this.$switch = $element;
        this.$switch.on('click', function(ev) {
            return self.switchOrder();
        });
    };

    GridColumnOrder.is = function(anotherOrder) {
        return this.$switch.is(anotherOrder.$switch);
    };

    GridColumnOrder.deactivate = function() {
        this.$switch.removeClass('sort-desc sort-asc');
        this.$switch.addClass('sort-inactive');
    };

    GridColumnOrder.switchOrder = function() {
        this.ownerGrid.deactivateAllSorting(this);
        if (this.$switch.hasClass('sort-inactive')) {
            this.$switch.removeClass('sort-inactive');
            this.$switch.addClass('sort-asc');
        } else {
            this.$switch.toggleClass('sort-asc sort-desc');
        }
        var direction = this.$switch.hasClass('sort-desc') ? 'desc' : 'asc';
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
            self.is_active(newValue);
            if (self.value === null) {
                return;
            }
            if (newValue) {
                self.ownerFilter.addQueryFilter(self);
            } else {
                self.ownerFilter.removeQueryFilter(self);
            }
        });
    };

    GridFilterChoice.setLinkElement = function($element) {
        var self = this;
        this.$link = $element;
        this.$link.on('click', function(ev) {
            return self.loadFilter(ev);
        });
    };

    GridFilterChoice.loadFilter = function(ev) {
        this.ownerFilter.switchKoFilterChoices(this, ev);
        this.ownerFilter.ownerGrid.queryArgs.page = 1;
        this.ownerFilter.ownerGrid.loadPage();
    };

    GridFilterChoice.is = function(filterChoice) {
        return this.$link.is(filterChoice.$link);
    };

})(App.ko.GridFilterChoice.prototype);

/**
 * Grid filter control. Contains multiple App.ko.GridFilterChoice instances or their descendants.
 */

App.ko.GridFilter = function(options) {
    this.init(options);
};

(function(GridFilter) {

    GridFilter.init = function(options) {
        this.$dropdown = null;
        this.ownerGrid =  options.ownerGrid;
        this.field = options.field;
        this.name = options.name;
        this.choices = [];
        this.current_name = ko.observable('');
        // One of this.choices, special 'reset all choice'.
        this.resetFilter = null;
    };

    GridFilter.setDropdownElement = function($element) {
        var self = this;
        this.$dropdown = $element;
        /*
        // Example of custom events.
        this.$dropdown.on({
            "hide.bs.dropdown": function(ev) {
                return true;
            }
        });
        */
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
        var totalActive;
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
            totalActive = this.getTotalActive();
            this.resetFilterLogic();
        }
    };

    GridFilter.addQueryFilter = function(currentChoice) {
        this.ownerGrid.addQueryFilter(this.field, currentChoice.value);
    };

    GridFilter.removeQueryFilter = function(currentChoice) {
        this.ownerGrid.removeQueryFilter(this.field, currentChoice.value);
    };

})(App.ko.GridFilter.prototype);

/**
 * Single row of grid (ko viewmodel).
 */
App.ko.GridRow = function(options) {
    this.init(options);
};

(function(GridRow) {

    GridRow.initDisplayValues = function() {
        var self = this;
        // Descendant could make observable values or to do not escape values selectively,
        // for html formatting, copying 'field' values from optional 'field_display' extra columns.
        $.each(this.values, function(k ,v) {
            self.displayValues[k] = $.htmlEncode(v);
        });
    };

    GridRow.init = function(options) {
        this.$row = null;
        this.ownerGrid = options.ownerGrid;
        // Source data field values. May be used for AJAX DB queries, for example.
        this.values = options.values;
        // 'Rendered' (formatted) field values, as displayed by ko_grid_body template bindings.
        this.displayValues = {};
        this.initDisplayValues();
    };

    GridRow.onClick = function() {
        this.ownerGrid.onRowClick(this);
    };

    GridRow.setRowElement = function($element) {
        var self = this;
        this.$row = $element;
        this.$row.on('click', function(ev) {
            self.onClick();
        });
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
        this.gridSearchPlaceholder = ko.observable(App.trans('Search'));
    };

    Grid.initAjaxParams = function() {
        this.queryArgs = {
            page: 1,
            load_meta: true
        };
        this.queryFilters = {};
        this.setQueryOrderBy();
    };

    Grid.init = function(options) {
        var self = this;
        var fullOptions = $.extend({ownerCtrl: null}, options);
        if (typeof fullOptions.applyTo === 'undefined') {
            throw 'App.ko.Grid constructor requires applyTo option.'
        }
        this.ownerCtrl = fullOptions.ownerCtrl;
        this.$selector = $(fullOptions.applyTo);

        this.modelMeta = {
            verboseName: ko.observable(''),
            verboseNamePlural: ko.observable('')
        };
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

        ko.applyBindings(this, this.$selector.get(0));

        /*
        this.$selector.on('show.bs.modal', function (ev) {
            // http://stackoverflow.com/questions/11570333/how-to-get-twitter-bootstrap-modals-invoker-element
            var $invoker = $(ev.relatedTarget);
            var $endPointHolder = $invoker.parents('[data-end-point-prefix]');
        });
        */

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

    /**
     * You may optionally postprocess returned row before applying it to ko viewmodel.
     */
    Grid.iocRow = function(row) {
        return new App.ko.GridRow({
            ownerGrid: this,
            values: row
        });
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
    
    Grid.onRowClick = function(koRow) {
        // console.log('koRow: ' + JSON.stringify(koRow));
        console.log('values: ' + JSON.stringify(koRow.values));
    };

    Grid.deactivateAllSorting = function(exceptOrder) {
        $.each(this.gridColumns(), function(k, order) {
            if (!order.is(exceptOrder)) {
                order.deactivate();
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

    Grid.iocKoGridColumn = function(grid_column) {
        return new App.ko.GridColumnOrder({
            field: grid_column['field'],
            name: grid_column['name'],
            ownerGrid: this
        });
    };

    Grid.setKoGridColumns = function(grid_fields) {
        for (var i = grid_fields.length - 1; i >= 0; i--) {
            this.gridColumns.push(
                this.iocKoGridColumn(grid_fields[i])
            );
        }
    };

    Grid.iocKoFilterChoice = function(filterModel, choice) {
        return new App.ko.GridFilterChoice({
            ownerFilter: filterModel,
            name: choice.name,
            value: choice.value,
            is_active: (typeof choice.is_active) === 'undefined' ? false : choice.is_active
        });
    };

    Grid.iocKoFilter = function(filter) {
        return new App.ko.GridFilter({
            ownerGrid: this,
            field: filter.field,
            name: filter.name,
        });
    };

    Grid.setKoFilter = function(filter) {
        var filterModel = this.iocKoFilter(filter);
        filterModel.choices.push(
            this.iocKoFilterChoice(filterModel, {'name': App.trans('All'), 'value': null, 'is_active': true})
        );
        var choices = filter.choices;
        for (var i = 0; i < choices.length; i++) {
            filterModel.choices.push(
                this.iocKoFilterChoice(filterModel, choices[i])
            );
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

    Grid.setKoPage = function(data) {
        var self = this;
        if (typeof data.model !== 'undefined') {
            $.each(data.model, function(k, v) {
                self.modelMeta[k](v);
            });
            this.ownerCtrlSetTitle(data.model.verboseNamePlural);
        }
        if (typeof data.grid_fields !== 'undefined') {
            self.setKoGridColumns(data.grid_fields);
        }
        // console.log(data);
        // Set grid rows viewmodels.
        self.gridRows([]);
        $.each(data.entries, function(k, v) {
            self.gridRows.push(self.iocRow(v));
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
 */
App.GridDialog = function(options) {
    $.inherit(App.Dialog.prototype, this);
    if (typeof options !== 'object') {
        options = {};
    }
    if (typeof options.koGridClass === 'undefined') {
        throw "App.GridDialog requires initial koGridClass option."
    }
    var fullOptions = $.extend(
        {
            template: 'ko_grid_body',
            buttons: [{
                label: App.trans('All'),
                action: function(dialogItself){
                    dialogItself.close();
                }
            }]
        }, options);
    this.create(fullOptions);
};

(function(GridDialog) {

    GridDialog.iocKoGrid = function(message) {
        var grid = new this.dialogOptions.koGridClass({
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

    GridDialog.onShown = function() {
        // Inject ko_grid_pagination underscore / knockout.js template into BootstrapDialog modal footer.
        var $footer = this.bdialog.getModalFooter();
        var $gridPagination = $(App.compileTemplate('ko_grid_pagination')());
        $footer.prepend($gridPagination);
        // Apply App.ko.Grid or descendant bindings to BootstrapDialog modal.
        this.grid = this.iocKoGrid(this.bdialog.getModal());
        this.grid.searchSubstring();
    };

})(App.GridDialog.prototype);
