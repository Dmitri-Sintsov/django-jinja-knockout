ko.bindingHandlers.grid_filter = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        $(element).on('click', function(ev) {
            viewModel.load();
        });
        /*
        viewModel.$scroller = $(element);
        viewModel.$scroller.scroller('init')
        .on('scroll:top', function(ev) {
            viewModel[valueAccessor()['top']]();
        })
        .on('scroll:bottom', function(ev) {
            viewModel[valueAccessor()['bottom']]();
        });
        */
    }
};

App.ko.GridFilterChoice = function(options) {
    this.init(options);
};

(function (GridFilterChoice) {

    GridFilterChoice.init = function(options) {
        this.owner = options.owner;
        this.field = options.field;
        this.name = options.name;
        this.value = options.value;
    };

    GridFilterChoice.load = function() {
        this.owner.setQueryFilter(this.field, this.value);
        this.owner.loadPage();
    };

})(App.ko.GridFilterChoice.prototype);

App.ko.Grid = function(selector) {
    this.init(selector);
};

(function(Grid) {

    Grid.initAjaxParams = function() {
        this.viewName = 'grid_page';
        this.queryArgs = {
            page: 1,
            get_filters: true
        };
        this.setQueryFilter();
        this.setQueryOrderBy();
    };

    // todo: Support multiple values of filters.
    Grid.setQueryFilter = function(field, value) {
        if (typeof field === 'undefined') {
            this.queryFilters = {};
            return;
        }
        if (typeof this.queryFilters[field] !== 'undefined') {
            delete this.queryFilters[field];
        }
        if (typeof value !== 'undefined') {
            this.queryFilters[field] = value;
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

    Grid.init = function(selector) {
        var self = this;
        this.queryKeys = {
            filter: 'list_filter',
            order:  'list_order_by',
            search: 'list_search'
        };
        this.$selector = $(selector);
        this.initAjaxParams();
        this.localize();
        
        this.gridFilters = ko.observableArray();
        this.gridRows = ko.observableArray();
        this.gridPages = ko.observableArray();
        ko.applyBindings(this, this.$selector.get(0));
        
        this.$gridSearch = this.$selector.find('.grid-search');
        this.$rowLinks = this.$selector.find('[data-order-by]');

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

        // Grid rows sorting event.
        this.$rowLinks.on('click', function(ev) {
            ev.preventDefault();
            self.onHeaderClick(ev);
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

    Grid.createRow = function(row) {
        return row;
    };

    Grid.onHeaderClick = function(ev) {
        var self = this;
        var $rowLink;
        $rowLink = $(ev.target).closest('[data-order-by]');
        var orderBy = $rowLink.data('orderBy');
        $.each(self.$rowLinks, function(k, v) {
            if (!$rowLink.is($(v))) {
                $(v).removeClass('sort-desc sort-asc');
                $(v).addClass('sort-inactive');
            }
        });
        if ($rowLink.hasClass('sort-inactive')) {
            $rowLink.removeClass('sort-inactive');
            $rowLink.addClass('sort-asc');
        } else {
            $rowLink.toggleClass('sort-asc sort-desc');
        }
        var direction = $rowLink.hasClass('sort-desc') ? 'desc' : 'asc';
        self.setQueryOrderBy(orderBy, direction);
        self.loadPage();
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

    Grid.searchSubstring = function(s) {
        var self = this;
        if (typeof s !== 'undefined') {
            self.$gridSearch.val(s);
        }
        self.queryArgs.page = 1;
        self.loadPage();
    };

    /**
     * Setup pagination viewmodel.
     */
    Grid.setPaginationModel = function(totalPages, currPage) {
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

    Grid.setFilterModel = function(filter) {
        var filterModel = {
            'name': filter.name,
            'choices': []
        };
        var choices = filter.choices;
        for (var i = 0; i < choices.length; i++) {
            filterModel.choices.push(new App.ko.GridFilterChoice({
                'owner': this,
                'name': choices[i].name,
                'value': choices[i].value,
                'field': filter.field
            }));
        }
        this.gridFilters.push(filterModel);
    };

    Grid.setGridFilters = function(filters) {
        for (var i = 0; i < filters.length; i++) {
            this.setFilterModel(filters[i]);
        }
    };

    /**
     * Get viewmodels data for grid page and grid pagination via ajax-query.
     */
    Grid.loadPage = function() {
        var self = this;
        var options = {'after': {}};
        options['after'][self.viewName] = function(viewModel) {
            self.setPage(viewModel);
        };
        self.queryArgs[self.queryKeys.search] = self.$gridSearch.val();
        self.queryArgs[self.queryKeys.filter] = JSON.stringify(self.queryFilters);
        self.queryArgs.csrfmiddlewaretoken = App.conf.csrfToken;
        $.post(self.pageUrl,
            self.queryArgs,
            function(response) {
                if (typeof self.queryArgs.get_filters !== 'undefined') {
                    delete self.queryArgs.get_filters;
                }
                App.viewResponse(response, options);
            },
            'json'
        )
        .fail(App.showAjaxError);
    };

    Grid.setPage = function(data) {
        var self = this;
        // console.log(data);
        // Set grid rows viewmodels.
        self.gridRows([]);
        $.each(data.entries, function(k, v) {
            self.gridRows.push(self.createRow(v));
        });
        // Set grid pagination viewmodels.
        self.setPaginationModel(data.totalPages, self.queryArgs.page);
        if (typeof data.filters !== 'undefined') {
            self.setGridFilters(data.filters);
        }
    };

})(App.ko.Grid.prototype);
