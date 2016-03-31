ko.bindingHandlers.grid_filter = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        viewModel.$element = $(element);
        $(element).on('click', function(ev) {
            return viewModel.loadFilter();
        });
    }
};

ko.bindingHandlers.grid_order_by = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        viewModel.$element = $(element);
        $(element).on('click', function(ev) {
            return viewModel.switchOrder();
        });
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
        this.$element = null;
        this.owner = options.owner;
        this.field = options.field;
        this.name = options.name;
    };

    GridColumnOrder.deactivate = function() {
        this.$element.removeClass('sort-desc sort-asc');
        this.$element.addClass('sort-inactive');
    };

    GridColumnOrder.switchOrder = function() {
        this.owner.deactivateAllSorting(this);
        if (this.$element.hasClass('sort-inactive')) {
            this.$element.removeClass('sort-inactive');
            this.$element.addClass('sort-asc');
        } else {
            this.$element.toggleClass('sort-asc sort-desc');
        }
        var direction = this.$element.hasClass('sort-desc') ? 'desc' : 'asc';
        this.owner.setQueryOrderBy(this.field, direction);
        this.owner.loadPage();
    };

})(App.ko.GridColumnOrder.prototype);

/**
 * Grid filtering control.
 */

App.ko.GridFilterChoice = function(options) {
    this.init(options);
};

(function (GridFilterChoice) {

    GridFilterChoice.init = function(options) {
        this.$element = null;
        this.owner = options.owner;
        this.name = options.name;
        this.value = options.value;
        this.is_active = ko.observable(options.is_active);
    };

    GridFilterChoice.loadFilter = function() {
        this.owner.switchKoFilters(this);
        if (this.is_active()) {
            this.owner.activateQueryFilters(this);
        } else {
            this.owner.removeQueryFilters(this);
        }
        this.owner.owner.queryArgs.page = 1;
        this.owner.owner.loadPage();
    };

})(App.ko.GridFilterChoice.prototype);

App.ko.GridFilter = function(options) {
    this.init(options);
};

(function(GridFilter) {

    GridFilter.init = function(options) {
        this.owner =  options.owner;
        this.field = options.field;
        this.name = options.name;
        this.choices = [];
        this.current_name = ko.observable('');
    };

    GridFilter.switchKoFilters = function(currentChoice) {
        if (currentChoice.value === null) {
            // Special 'all' value, deactivate all filters except current one.
            for (var i = 0; i < this.choices.length; i++) {
                this.choices[i].is_active(false);
            }
            currentChoice.is_active(true);
        } else {
            // Switch current filter.
            currentChoice.is_active(!currentChoice.is_active());
            // Check whether all filters are active except for reset all filter.
            var totalActive = 0;
            var resetFilter = null
            for (var i = 0; i < this.choices.length; i++) {
                if (this.choices[i].value === null) {
                    resetFilter = this.choices[i];
                } else if (this.choices[i].is_active()) {
                    totalActive++;
                }
            }
            if (resetFilter !== null) {
                if (totalActive === this.choices.length - 1) {
                    // All filters are active. Activate (highlight) reset all filter instead.
                    for (var i = 0; i < this.choices.length; i++) {
                        if (this.choices[i].value !== null) {
                            this.choices[i].is_active(false);
                        }
                    }
                    resetFilter.is_active(true);
                } else if (totalActive === 0) {
                    // No active filters means that reset filter must be highlighted (activated).
                    resetFilter.is_active(true);
                } else {
                    // Only some of the filters are active. Deactivate reset all filter.
                    resetFilter.is_active(false);
                }
            }
        }
    };

    GridFilter.activateQueryFilters = function(currentChoice) {
        if (currentChoice.value === null) {
            // Special reset all filters filter.
            this.owner.removeQueryFilter(this.field);
        } else {
            // Add current value to query filter.
            this.owner.addQueryFilter(this.field, currentChoice.value);
        }
    };

    GridFilter.removeQueryFilters = function(currentChoice) {
        this.owner.removeQueryFilter(this.field, currentChoice.value);
    };

})(App.ko.GridFilter.prototype);

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

    Grid.initAjaxParams = function() {
        this.queryArgs = {
            page: 1,
            load_meta: true
        };
        this.removeQueryFilter();
        this.setQueryOrderBy();
    };

    Grid.init = function(options) {
        var self = this;
        var fullOptions = $.extend({owner: null}, options);
        this.owner = fullOptions.owner;
        this.$selector = $(fullOptions.selector);
        this.initAjaxParams();
        this.localize();

        this.model = {
            verboseName: ko.observable(''),
            verboseNamePlural: ko.observable('')
        };
        this.gridColumns = ko.observableArray();
        this.gridFilters = ko.observableArray();
        this.gridRows = ko.observableArray();
        this.gridPages = ko.observableArray();
        ko.applyBindings(this, this.$selector.get(0));

        this.$gridSearch = this.$selector.find('.grid-search');

        // Grid text search event.
        this.$gridSearch.on('input', function(ev) {
            self.searchSubstring();
        });

        // Grid clear text search event.
        this.$selector.find('.grid-search-reset').on('click', function(ev) {
            ev.preventDefault();
            self.searchSubstring('');
        });

        // Click grid row event.
        this.$selector.find('table.grid > tbody').on('click', '> tr', function(ev) {
            ev.stopImmediatePropagation();
            var $target = $(ev.target).closest('table.grid > tbody > tr');
            self.onRowClick($target);
        });

        // Grid pagination (change page) event.
        this.$selector.on('click', '.pagination a[data-page-number]', function(ev) {
            ev.stopImmediatePropagation();
            self.onPagination(ev);
        });

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
        if (typeof this.queryFilters[field] === 'undefined') {
            // Single value.
            this.queryFilters[field] = value;
        } else if (this.queryFilters[field] !== value) {
            if (!_.isArray(this.queryFilters[field])) {
                // Convert single value into array of values.
                this.queryFilters[field] = [this.queryFilters[field]];
            }
            if (_.find(this.queryFilters[field], function(val) { return val === value; }) === undefined) {
                // Multiple values: 'field__in' at server-side.
                this.queryFilters[field].push(value);
            }
        }
    };

    // Supports multiple values of filter.
    Grid.removeQueryFilter = function(field, value) {
        if (typeof field === 'undefined') {
            this.queryFilters = {};
            return;
        }
        if (typeof this.queryFilters[field] !== 'undefined') {
            if (_.isArray(this.queryFilters[field]) && typeof value !== 'undefined') {
                this.queryFilters[field] = _.filter(this.queryFilters[field], function(val) {
                    return val !== value;
                });
            } else {
                delete this.queryFilters[field];
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

    Grid.localize = function() {
        this.local = {
            toBegin: App.trans('First page'),
            toEnd: App.trans('Last page'),
        };
    };

    /**
     * You may optionally postprocess returned row before applying it to ko viewmodel.
     */
    Grid.iocRow = function(row) {
        return row;
    };

    Grid.onPagination = function(ev) {
        var self = this;
        self.queryArgs.page = parseInt($(ev.target).attr('data-page-number'));
        if (isNaN(self.queryArgs.page)) {
            self.queryArgs.page = 1;
        }
        $(ev.target)
            .parents(self.$selector.get(0))
            .find('div.table-responsive').scrollTop(0);
        self.loadPage();
    };
    
    Grid.onRowClick = function($row) {
        console.log('row: ' + $row);
    };

    Grid.deactivateAllSorting = function(exceptColumn) {
        $.each(this.gridColumns(), function(k, v) {
            if (! v.$element.is(exceptColumn.$element)) {
                v.deactivate();
            }
        });
    };

    Grid.searchSubstring = function(s) {
        var self = this;
        if (typeof s !== 'undefined') {
            self.$gridSearch.val(s);
        }
        self.queryArgs.page = 1;
        self.loadPage();
    };

    Grid.iocKoGridColumn = function(grid_column) {
        return new App.ko.GridColumnOrder({
            'field': grid_column['field'],
            'name': grid_column['name'],
            'owner': this
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
            'owner': filterModel,
            'name': choice.name,
            'value': choice.value,
            'is_active': (typeof choice.is_active) === 'undefined' ? false : choice.is_active
        });
    };

    Grid.iocKoFilter = function(filter) {
        return new App.ko.GridFilter({
            'owner': this,
            'field': filter.field,
            'name': filter.name,
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
        self.gridPages.push({
            'isActive': false /* (1 === currPage) */,
            'title': self.local.toBegin,
            'pageNumber': 1
        });
        for (var i = startingPage; i <= totalPages; i++) {
            if (!hasFoldingPage &&
                    totalPages - startingPage - maxVisiblePages > 2 &&
                    (i === startingPage + maxVisiblePages + 1)
                ) {
                // folding page
                self.gridPages.push({
                    'isActive': (i === currPage),
                    'title': '...',
                    'pageNumber':  i
                });
                hasFoldingPage = true;
                i = totalPages;
            }
            self.gridPages.push({
                'isActive': (i === currPage),
                'title': i,
                'pageNumber':  i
            });
        }
        self.gridPages.push({
            'isActive': false /* (totalPages === currPage) */,
            'title': this.local.toEnd,
            'pageNumber': totalPages
        });
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
        self.queryArgs[self.queryKeys.search] = self.$gridSearch.val();
        self.queryArgs[self.queryKeys.filter] = JSON.stringify(self.queryFilters);
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
    Grid.ownerSetTitle = function(verboseNamePlural) {
    };

    Grid.setKoPage = function(data) {
        var self = this;
        if (typeof data.model !== 'undefined') {
            $.each(data.model, function(k, v) {
                self.model[k](v);
            });
            this.ownerSetTitle(data.model.verboseNamePlural);
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
    if (typeof options.template === 'undefined') {
        options.template = 'ko_grid';
    }
    this.create(options);
};

(function(GridDialog) {

    GridDialog.iocKoGrid = function(message) {
        var grid = new this.dialogOptions.koGridClass({
            selector: message, owner: this
        });
        grid.ownerSetTitle = _.bind(
            function(verboseNamePlural) {
                this.owner.setTitle(verboseNamePlural);
            },
            grid
        );
        return grid;
    };

    GridDialog.onShown = function() {
        this.grid = this.iocKoGrid(this.dialogOptions.message);
        this.grid.searchSubstring();
    };

})(App.GridDialog.prototype);

