App.ko.Grid = function(selector) {
    this.init(selector);
};

(function(Grid) {

    Grid.initAjaxParams = function() {
        this.viewName = 'grid_page';
        this.queryArgs = {
            page: 1
        };
    };

    Grid.localize = function() {
        this.local = {
            toBegin: App.trans('First page'),
            toEnd: App.trans('Last page'),
        };
    };

    Grid.init = function(selector) {
        var self = this;
        this.$selector = $(selector);
        this.initAjaxParams();
        this.localize();
        
        this.gridRows = ko.observableArray();
        this.gridPages = ko.observableArray();
        this.argsStr = ko.observable();
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

    Grid.onHeaderClick = function(ev) {
        var self = this;
        var $rowLink;
        $rowLink = $(ev.target).closest('[data-order-by]');
        self.queryArgs.orderby = $rowLink.data('orderBy');
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
        self.queryArgs.direction = $rowLink.hasClass('sort-desc') ? 'desc' : 'asc';
        self.loadPage();
    };
    
    Grid.onPagination = function(ev) {
        var self = this;
        self.queryArgs.page = $(ev.target).attr('data-page-number');
        $(ev.target)
            .parents(self.$selector.get(0))
            .find('div.table-responsive').scrollTop(0);
        self.loadPage();
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

    /**
     * Get viewmodels data for grid page and grid pagination via ajax-query.
     */
    Grid.loadPage = function() {
        var self = this;
        var options = {'after': {}};
        options['after'][self.viewName] = function(viewModel) {
            self.setPage(viewModel);
        };
        self.queryArgs.search = self.$gridSearch.val();
        self.argsStr(JSON.stringify(self.queryArgs));
        self.queryArgs.csrfmiddlewaretoken = App.conf.csrfToken;
        $.post(self.pageUrl,
            self.queryArgs,
            function(response) {
                App.viewResponse(response, options);
            },
            'json'
        )
        .fail(App.showAjaxError);
    };

    Grid.createRow = function(row) {
        return row;
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
    };

    Grid.onRowClick = function($row) {
        console.log('row: ' + $row);
    };
    
})(App.ko.Grid.prototype);
