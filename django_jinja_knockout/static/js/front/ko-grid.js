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
        this.owner = options.owner;
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
        this.owner.deactivateAllSorting(this);
        if (this.$switch.hasClass('sort-inactive')) {
            this.$switch.removeClass('sort-inactive');
            this.$switch.addClass('sort-asc');
        } else {
            this.$switch.toggleClass('sort-asc sort-desc');
        }
        var direction = this.$switch.hasClass('sort-desc') ? 'desc' : 'asc';
        this.owner.setQueryOrderBy(this.field, direction);
        this.owner.loadPage();
    };

})(App.ko.GridColumnOrder.prototype);

/**
 * Grid filter choice control.
 */

App.ko.GridFilterChoice = function(options) {
    this.init(options);
};

(function (GridFilterChoice) {

    GridFilterChoice.init = function(options) {
        this.$link = null;
        this.owner = options.owner;
        this.name = options.name;
        this.value = options.value;
        this.is_active = ko.observable(options.is_active);
    };

    GridFilterChoice.setLinkElement = function($element) {
        var self = this;
        this.$link = $element;
        this.$link.on('click', function(ev) {
            return self.loadFilter(ev);
        });
    };

    GridFilterChoice.loadFilter = function(ev) {
        this.owner.switchKoFilterChoices(this, ev);
        if (this.is_active()) {
            this.owner.activateQueryFilters(this);
        } else {
            this.owner.removeQueryFilters(this);
        }
        this.owner.owner.queryArgs.page = 1;
        this.owner.owner.loadPage();
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
        this.owner =  options.owner;
        this.field = options.field;
        this.name = options.name;
        this.choices = [];
        this.current_name = ko.observable('');
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

    GridFilter.switchKoFilterChoices = function(currentChoice, ev) {
        if (currentChoice.value === null) {
            // Special 'all' value, deactivate all filter choices except current one.
            for (var i = 0; i < this.choices.length; i++) {
                this.choices[i].is_active(false);
            }
            currentChoice.is_active(true);
        } else {
            // Do not close dropdown for toggleable filter choices.
            ev.stopPropagation();
            // Switch current filter choice.
            currentChoice.is_active(!currentChoice.is_active());
            // Check whether all filter choices are active except for 'reset all choice'.
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
                    // All choices of the filter are active. Activate (highlight) 'reset all choice' instead.
                    for (var i = 0; i < this.choices.length; i++) {
                        if (this.choices[i].value !== null) {
                            this.choices[i].is_active(false);
                        }
                    }
                    resetFilter.is_active(true);
                } else if (totalActive === 0) {
                    // No active filter choices means that 'reset all choice' must be highlighted (activated).
                    resetFilter.is_active(true);
                } else {
                    // Only some of the filter choices are active. Deactivate 'reset all choice'.
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
 * Single row of grid ko viewmodel.
 */
App.ko.GridRow = function(options) {
    this.init(options);
};

(function(GridRow) {

    GridRow.init = function(options) {
        this.$row = null;
        this.owner = options.owner;
        // Descendant could make observable values.
        this.values = options.values;
    };

    GridRow.onClick = function() {
        this.owner.onRowClick(this);
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
        this.owner = options.owner;
        this.isActive = options.isActive;
        this.title = options.title,
        this.pageNumber = options.pageNumber;
    };

    GridPage.onPagination = function() {
        this.owner.onPagination(this.pageNumber);
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
        if (typeof fullOptions.applyTo === 'undefined') {
            throw 'App.ko.Grid constructor requires applyTo option.'
        }
        this.owner = fullOptions.owner;
        this.$selector = $(fullOptions.applyTo);
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
        return new App.ko.GridRow({
            owner: this,
            values: row
        });
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

    Grid.iocGridPage = function(options) {
        options.owner = this;
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
            owner: this
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
        // Inject ko_grid_pagination underscore / knockout.js template into BootstrapDialog modal footer.
        var $footer = this.bdialog.getModalFooter();
        var $gridPagination = $(App.compileTemplate('ko_grid_pagination')());
        $footer.prepend($gridPagination);
        // Apply App.ko.Grid or descendant bindings to BootstrapDialog modal.
        this.grid = this.iocKoGrid(this.bdialog.getModal());
        this.grid.searchSubstring();
    };

})(App.GridDialog.prototype);
