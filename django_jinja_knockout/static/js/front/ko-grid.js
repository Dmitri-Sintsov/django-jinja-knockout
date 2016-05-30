"use strict";

ko.bindingHandlers.grid_row = {
    update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        // var realElement = ko.from_virtual(element);
        viewModel.setRowElement($(element));
    }
};

ko.virtualElements.allowedBindings.grid_row = true;

ko.bindingHandlers.grid_filter = {
    update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        viewModel.setDropdownElement($(element));
    }
};

ko.bindingHandlers.grid_filter_choice = {
    update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        viewModel.setLinkElement($(element));
    }
};

ko.bindingHandlers.grid_order_by = {
    update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        viewModel.setSwitchElement($(element));
    }
};

ko.bindingHandlers.grid_row_value = {
    update:  function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        viewModel.renderRowValue(element, ko.utils.unwrapObservable(
                valueAccessor()
            )
        );
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
        this.ownerGrid.listAction();
    };

    GridColumnOrder.blockTags = [
        {
            enclosureTag: '<ul>',
            enclosureClasses: 'list-group',
            itemTag: '<li>',
            itemClasses: 'condensed list-group-item preformatted'
        },
        {
            enclosureTag: '<ul>',
            enclosureClasses: 'list-group',
            itemTag: '<li>',
            itemClasses: 'condensed list-group-item list-group-item-warning preformatted'
        },
    ];

    GridColumnOrder.renderRowValue = function(element, value) {
        App.renderNestedList(element, value, this.blockTags);
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
        this.$link = $element;
    };

    GridFilterChoice.onLoadFilter = function(data, ev) {
        this.ownerFilter.switchKoFilterChoices(this, ev);
        this.ownerFilter.ownerGrid.queryArgs.page = 1;
        this.ownerFilter.ownerGrid.listAction();
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

    AbstractGridFilter.onDropdownClick = function(data, ev) {
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
        this.super._call('init', options);
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
        var gridDialogOptions = {};
        /**
         * Allows to specifiy BootstrapDialog size in Jinja2 macro, for example:
            ko_grid(
                grid_options={
                    'pageRoute': 'management_grid',
                    'fkGridOptions': {
                        'member__project': {
                            'dialogOptions': {'size': 'size-wide'},
                            'pageRoute': 'project_grid',
                            'searchPlaceholder': 'Search object name'
                        }
                    }
                }
            )
         */
        if (typeof options.fkGridOptions.dialogOptions !== 'undefined') {
            gridDialogOptions = options.fkGridOptions.dialogOptions;
            delete options.fkGridOptions.dialogOptions;
        }
        var gridDialogOptions = $.extend({
            ownerComponent: this,
            gridOptions: options.fkGridOptions
        }, gridDialogOptions);
        this.gridDialog = new App.GridDialog(gridDialogOptions);
        this.super._call('init', options);
    };

    FkGridFilter.onDropdownClick = function(ev) {
        this.gridDialog.show();
    };

    FkGridFilter.addQueryFilter = function(value) {
        this.super._call('addQueryFilter', value);
        this.ownerGrid.queryArgs.page = 1;
        this.ownerGrid.listAction();
    };

    FkGridFilter.removeQueryFilter = function(value) {
        this.super._call('removeQueryFilter', value);
        this.ownerGrid.queryArgs.page = 1;
        this.ownerGrid.listAction();
    };

    FkGridFilter.onGridDialogSelectRow = function(options) {
        this.addQueryFilter(options.pkVal);
        this.hasActiveChoices(true);
    };

    FkGridFilter.onGridDialogUnselectRow = function(options) {
        this.removeQueryFilter(options.pkVal);
        this.hasActiveChoices(options.childGrid.selectedRowsPks.length > 0);
    };

    FkGridFilter.onGridDialogUnselectAllRows = function(options) {
        this.removeQueryFilter(null);
        this.hasActiveChoices(false);
    };

})(App.ko.FkGridFilter.prototype);

/**
 * Single row of grid (ko viewmodel).
 */
App.ko.GridRow = function(options) {
    this.init(options);
};

(function(GridRow) {

    // Turned off by default for performance reasons (not required for some grids).
    GridRow.useInitClient = false;

    GridRow.afterRender = function() {
        if (this.useInitClient) {
            App.initClient(this.$row);
            ko.utils.domNodeDisposal.addDisposeCallback(this.$row.get(0), function() {
                App.initClient(this.$row, 'dispose');
            });
        }
    };

    // Descendant could skip html encoding selected fields to preserve html formatting.
    GridRow.htmlEncode = function(displayValue, field) {
        if (typeof displayValue === 'object') {
            return _.mapObject(displayValue, _.bind(this.htmlEncode, this));
        } else {
            return $.htmlEncode(displayValue);
        }
    };

    // Descendant could format it's own displayValue, including html content.
    GridRow.toDisplayValue = function(value, field) {
        var displayValue;
        var fieldRelated = field.match(/(.+)_id$/);
        if (fieldRelated !== null) {
            fieldRelated = fieldRelated[1];
        }
        var markSafe = false;
        // Automatic server-side formatting.
        if (typeof this.strFields[field] !== 'undefined') {
            displayValue = this.strFields[field];
        } else if (fieldRelated !== null && typeof this.strFields[fieldRelated] !== 'undefined') {
            displayValue = this.strFields[fieldRelated];
        } else if (typeof value === 'boolean') {
            displayValue = {true: App.trans('Yes'), false: App.trans('No')}[value];
        } else if (value === null) {
            displayValue = App.trans('N/A');
        } else if (value === '') {
            // Mark safe. Without converting to &nbsp; rows may have smaller height sometimes.
            displayValue = '&nbsp;';
            markSafe = true;
        } else {
            displayValue = value;
        }
        if (!markSafe) {
            displayValue = this.htmlEncode(displayValue);
        }
        return displayValue;
    };

    // Descendant may skip Knockout.js observable wrapping selectively.
    GridRow.observeDisplayValue  = function(value, field) {
        return ko.observable(
            this.toDisplayValue(value, field)
        );
    };

    // 'Rendered' (formatted) field values, as displayed by ko_grid_body template bindings.
    GridRow.initDisplayValues = function() {
        var self = this;
        this.displayValues = {};
        // When there are virtual display values, assume empty values, otherwise _.mapObject() will miss these.
        _.each(this.strFields, function(displayValue, field) {
            if (typeof self.values[field] === 'undefined') {
                self.values[field] = '';
            }
        });
        this.displayValues = _.mapObject(this.values, _.bind(this.observeDisplayValue, this));
    };

    GridRow.init = function(options) {
        var self = this;
        this.isSelectedRow = ko.observable(options.isSelectedRow);
        this.isUpdated = ko.observable(
            (typeof options.isUpdated === 'undefined') ? false : options.isUpdated
        );
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
        if (typeof this.values['__str'] !== 'undefined') {
            this.str = this.values.__str;
            delete this.values.__str;
        } else {
            this.str = '';
        }
        this.initDisplayValues();
    };

    GridRow.getValue = function(field) {
        return typeof this.values[field] === 'undefined' ? undefined : this.values[field];
    };

    GridRow.inverseSelection = function() {
        this.isSelectedRow(!this.isSelectedRow());
    };

    GridRow.onRowClick = function() {
        this.ownerGrid.rowClick(this);
    };

    GridRow.setRowElement = function($element) {
        this.$row = $element;
    };

    /**
     * Update this instance from savedRow instance.
     */
    GridRow.update = function(savedRow) {
        var self = this;
        this.str = savedRow.str;
        this.isUpdated(savedRow.isUpdated);
        _.each(savedRow.values, function(value, field) {
            self.values[field] = value;
        });
        _.each(savedRow.strFields, function(value, field) {
            self.strFields[field] = value;
        });
        _.each(savedRow.displayValues, function(value, field) {
            self.displayValues[field](ko.utils.unwrapObservable(value));
            // self.displayValues[field].valueHasMutated();
        });
    };

    GridRow.getDescParts = function() {
        if (_.size(this.strFields) > 0) {
            return this.strFields;
        } else if (typeof this.str !== 'undefined'){
            return [this.str];
        }
        return [];
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
 * Actions performed for particular grid (row) instance.
 * Mostly are row-click AJAX actions, although not limited to.
 */
App.GridActions = function(options) {
    this.init(options);
};

(function(GridActions) {

    GridActions.init = function(options) {
        this.grid = options.grid;
        this.actions = {
            /**
             * Sample action. Actual actions are configured at server-side and populated via AJAX response
             * in App.ko.Grid.listCallback() when data.meta was received from remote host, during first execution
             * of 'list' command.
             */
            'delete': {
                'localName': App.trans('Remove'),
                'type': 'glyphicon',
                'glyph': 'remove',
                'enabled': false
            }
        };
        this.action_kwarg = 'action';
        this.viewModelName = 'grid_page';
    };

    GridActions.setActions = function(actions) {
        this.actions = actions;
    };

    GridActions.setActionKwarg = function(action_kwarg) {
        this.action_kwarg = action_kwarg;
    };

    GridActions.has = function(action) {
        return typeof this.actions[action] !== 'undefined' && this.actions[action].enabled;
    };

    GridActions.getUrl =  function(action) {
        if (typeof action === 'undefined') {
            action = '';
        } else {
            action = '/' + action;
        }
        var params = $.extend({}, this.grid.options.pageRouteKwargs);
        params[this.action_kwarg] = action;
        return App.routeUrl(this.grid.options.pageRoute, params);
    };

    GridActions.getQueryArgs = function(action, options) {
        if (typeof options === 'undefined') {
            options = {};
        }
        var method = 'queryargs_' + action;
        if (typeof this[method] === 'function') {
            return this[method](options);
        } else {
            return options;
        }
    };

    GridActions.ajax = function(action, queryArgs, callback) {
        var self = this;
        queryArgs.csrfmiddlewaretoken = App.conf.csrfToken;
        $.post(this.getUrl(action),
            queryArgs,
            function(response) {
                self.respond(action, response);
                if (typeof callback === 'function') {
                    callback(response);
                }
            },
            'json'
        )
        .fail(App.showAjaxError);
    };

    GridActions.respond = function(action, response) {
        var self = this;
        var responseOptions = {'after': {}};
        responseOptions['after'][this.viewModelName] = function(viewModel) {
            // console.log('GridActions.perform response: ' + JSON.stringify(viewModel));
            var method = 'callback_' + action;
            // Override last action, when suggested by AJAX view response.
            // Use with care, due to asynchronous execution.
            if (typeof viewModel.last_action !== 'undefined') {
                self.lastActionName = viewModel.last_action;
                if (typeof viewModel.last_action_options !== 'undefined') {
                    self.lastActionOptions = viewModel.last_action_options;
                } else {
                    self.lastActionOptions = {};
                }
            }
            if (typeof self[method] === 'function') {
                return self[method](viewModel);
            }
            throw sprintf('Unimplemented %s()', method);
        };
        App.viewResponse(response, responseOptions);
    };

    GridActions.perform = function(action, actionOptions, ajaxCallback) {
        var queryArgs = this.getQueryArgs(action, actionOptions);
        var method = 'perform_' + action;
        if (typeof this[method] === 'function') {
            // Override default AJAX action. This can be used to create client-side actions.
            this[method](queryArgs, ajaxCallback);
        } else {
            // Call server-side KoGridView handler by default, which should return viewmodel response.
            this.ajax(action, queryArgs, ajaxCallback);
        }
    };

    // Set last action name from the visual action instance supplied.
    // koAction: instance of App.ko.Action - visual representation of action in knockout template.
    GridActions.setLastKoAction = function(koAction) {
        this.lastKoAction = koAction;
        this.lastActionName = koAction.actDef.action;
    };

    // Perform last action.
    GridActions.performLastAction = function(actionOptions) {
        this.lastActionOptions = actionOptions;
        this.perform(this.lastActionName, actionOptions);
    };

    GridActions.getLastActionUrl = function() {
        return this.getUrl(this.lastActionName);
    };

    GridActions.callback_create_form = function(viewModel) {
        viewModel.grid = this.grid;
        var dialog = new App.ModelFormDialog(viewModel);
        dialog.show();
    };

    GridActions.callback_delete = function(viewModel) {
        var self = this;
        var pkVals = viewModel.pkVals;
        delete viewModel.pkVals;
        viewModel.callback = function(result) {
            if (result) {
                self.perform('delete_confirmed', {'pk_vals': pkVals});
            }
        };
        viewModel.type = BootstrapDialog.TYPE_DANGER;
        var dialog = new App.Dialog(viewModel);
        dialog.confirm();
    };

    GridActions.callback_delete_confirmed = function(viewModel) {
        this.grid.updatePage(viewModel);
    };

    /**
     * The same client-side AJAX form is used both to add new objects and to update existing ones.
     */
    GridActions.callback_edit_form = function(viewModel) {
        this.callback_create_form(viewModel);
    };

    GridActions.callback_save_form = function(viewModel) {
        this.grid.updatePage(viewModel);
        // Brute-force approach:
        // this.perform('list');
    };

    GridActions.queryargs_list = function(options) {
        return this.grid.getListQueryArgs();
    };

    /**
     * Populate viewmodel from AJAX response.
     */
    GridActions.callback_list = function(data) {
        if (typeof data.action_kwarg !== 'undefined') {
            this.setActionKwarg(data.action_kwarg);
        }
        this.grid.listCallback(data);
    };

})(App.GridActions.prototype);

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
        this.queryArgs = $.extend({
                page: 1,
                row_model_str: false,
                load_meta: true
            },
            this.options.ajaxParams
        );
        this.queryFilters = {};
        if (this.options.defaultOrderBy !== null)
        this.setQueryOrderBy(this.options.defaultOrderBy);
    };

    Grid.run = function(element) {
        this.applyBindings(element);
        this.searchSubstring();
    };

    Grid.applyBindings = function(selector) {
        var $selector = $(selector);
        ko.applyBindings(this, $selector.get(0));
    };

    Grid.cleanBindings = function(selector) {
        var $selector = $(selector);
        ko.cleanNode($selector.get(0));
    };

    Grid.iocGridActions = function(options) {
        return new App.GridActions(options);
    };

    Grid.onGridSearchStr = function(newValue) {
        this.searchSubstring(newValue);
    };

    Grid.onGridSearchDisplayStr = function(newValue) {
        this.gridSearchStr(newValue);
    };

    // this.meta is the list of visual ko bindings which are formatting flags or messages, not model values.
    Grid.updateMeta = function(data) {
        ko.set_props(data, this.meta);
    };

    Grid.init = function(options) {
        var self = this;
        this.options = $.extend({
            ajaxParams: {},
            ownerCtrl: null,
            defaultOrderBy: null,
            fkGridOptions: {},
            searchPlaceholder: null,
            selectMultipleRows: false,
            showSelection: false,
            pageRoute: null,
            pageRouteKwargs: {}
        }, options);
        if (this.options.selectMultipleRows) {
            this.options.showSelection = true;
        }
        this.ownerCtrl = this.options.ownerCtrl;
        this.meta = {
            pkField: '',
            hasSearch: ko.observable(false),
            verboseName: ko.observable(''),
            verboseNamePlural: ko.observable(''),
        };
        // Do not forget to include all possible types of actions into this list.
        this.actionTypes = {
            'button': ko.observableArray(),
            'click': ko.observableArray(),
            'glyphicon': ko.observableArray()
        };
        this.gridActions = this.iocGridActions({
            grid: this
        });
        this.sortOrders = {};
        this.selectedRowsPks = [];
        this.gridColumns = ko.observableArray();
        this.gridFilters = ko.observableArray();
        this.gridRows = ko.observableArray();
        this.gridPages = ko.observableArray();
        this.gridSearchStr = ko.observable('');
        this.gridSearchStr.subscribe(_.bind(this.onGridSearchStr, this));
        this.gridSearchDisplayStr = ko.observable('');
        this.gridSearchDisplayStr.subscribe(_.bind(this.onGridSearchDisplayStr, this));
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

    Grid.hasSelectedPkVal = function(pkVal) {
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

    Grid.addSelectedPkVal = function(pkVal) {
        if (this.options.selectMultipleRows) {
            if (!this.hasSelectedPkVal(pkVal)) {
                this.selectedRowsPks.push(pkVal);
            }
        } else {
            this.selectedRowsPks = [pkVal];
        }
    };

    Grid.removeSelectedPkVal = function(pkVal) {
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
        this.addSelectedPkVal(pkVal);
        this.propCall('ownerCtrl.onChildGridSelectRow', pkVal);
    };

    /**
     * Called from child row when the row is unselected.
     */
    Grid.onUnselectRow = function(koRow) {
        var pkVal = koRow.getValue(this.meta.pkField);
        this.removeSelectedPkVal(pkVal);
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
        // this.removeSelectedPkVal(koRow.getValue(this.meta.pkField));
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
        _.each(this.gridRows(), function(koRow) {
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
            this.gridRows[opcode](this.iocRow({
                ownerGrid: this,
                isSelectedRow: false,
                isUpdated: true,
                values: newRows[i]
            }));
        }
    };

    /**
     * Updates existing grid rows with raw viewmodel rows supplied.
     */
    Grid.updateKoRows = function(savedRows) {
        var lastClickedKoRowPkVal = this.propCall('lastClickedKoRow.getValue', this.meta.pkField);
        for (var i = 0; i < savedRows.length; i++) {
            var pkVal = savedRows[i][this.meta.pkField];
            var savedGridRow = this.iocRow({
                ownerGrid: this,
                isSelectedRow: this.hasSelectedPkVal(pkVal),
                isUpdated: true,
                values: savedRows[i]
            });
            if (lastClickedKoRowPkVal === pkVal) {
                this.lastClickedKoRow.update(savedGridRow);
            }
            var rowToUpdate = this.findKoRowByPkVal(pkVal);
            // When rowToUpdate is null, that means updated row is not among currently displayed ones.
            if (rowToUpdate !== null) {
                rowToUpdate.update(savedGridRow);
            }
        }
    };

    Grid.deleteKoRows = function(pks) {
        for (var i = 0; i < pks.length; i++) {
            var pkVal = App.intVal(pks[i]);
            this.removeSelectedPkVal(pkVal);
            var koRow = this.unselectRow(pkVal);
            if (koRow !== null) {
                this.gridRows.remove(koRow);
            }
        }
    };

    /**
     * Supports updating, adding and deleting multiple rows at once.
     */
    Grid.updatePage = function(viewModel) {
        this.markUpdated(false);
        if (typeof viewModel.append_rows !== 'undefined') {
            this.addKoRows(viewModel.append_rows);
        }
        if (typeof viewModel.prepend_rows !== 'undefined') {
            this.addKoRows(viewModel.prepend_rows, 'unshift');
        }
        if (typeof viewModel.update_rows !== 'undefined') {
            this.updateKoRows(viewModel.update_rows);
        }
        if (typeof viewModel.deleted_pks !== 'undefined') {
            this.deleteKoRows(viewModel.deleted_pks);
        }
    };

    /**
     * You may optionally postprocess returned row before applying it to ko viewmodel.
     */
    Grid.iocRow = function(options) {
        return new App.ko.GridRow(options);
    };

    Grid.afterRowRender = function(elements, koRow) {
        koRow.afterRender();
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
        var currPkVal = currKoRow.getValue(this.meta.pkField);
        // Unselect all rows except current one.
        _.each(this.gridRows(), function(koRow) {
            if (koRow.getValue(self.meta.pkField) !== currPkVal) {
                koRow.isSelectedRow(false);
            }
        });
        // Current row must be inversed _after_ all unselected ones.
        // Otherwise App.FkGridWidget will fail to set proper input value.
        currKoRow.inverseSelection();
        return currPkVal;
    };

    Grid.iocActionsMenuDialog = function(options) {
        return new App.ActionsMenuDialog(options);
    };

    Grid.rowClick = function(currKoRow) {
        this.lastClickedKoRow = currKoRow;
        console.log('Grid.rowClick() values: ' + JSON.stringify(currKoRow.values));
        if (this.options.selectMultipleRows) {
            currKoRow.inverseSelection();
        } else {
            var currPkVal = this.selectOnlyKoRow(currKoRow);
        }
        if (this.actionTypes.click().length > 1) {
            // Multiple click actions are available. Open row click actions menu.
            this.actionsMenuDialog = this.iocActionsMenuDialog({
                grid: this
            });
            this.actionsMenuDialog.show();
        } else if (this.actionTypes.click().length > 0) {
            this.actionTypes.click()[0].doAction({gridRow: currKoRow});
        }
        /*
            if (this.gridActions.has('edit_formset')) {
                this.gridActions.perform('edit_formset', {'pk_vals': this.selectedRowsPks});
            }
            if (this.gridActions.has('edit_form')) {
                this.gridActions.perform('edit_form', {'pk_val': currPkVal});
            }
        */
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
        self.listAction(function(response) {
            self.propCall('ownerCtrl.onChildGridFirstLoad');
        });
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
     * Used in App.GridDialog to display title outside of message template.
     */
    Grid.ownerCtrlSetTitle = function(verboseNamePlural) {
    };

    Grid.getListQueryArgs = function() {
        this.queryArgs[this.queryKeys.search] = this.gridSearchStr();
        this.queryArgs[this.queryKeys.filter] = JSON.stringify(this.queryFilters);
        return this.queryArgs;
    };

    Grid.listAction = function(callback) {
        if (typeof callback === 'function') {
            this.gridActions.perform('list', {}, callback);
        } else {
            this.gridActions.perform('list', {});
        }
    };

    Grid.listCallback = function(data) {
        var self=this;
        if (typeof data.meta !== 'undefined') {
            this.gridActions.setActions(data.meta.actions);
            delete data.meta.actions;
            this.updateMeta(data.meta);
            this.setKoActionTypes();
            this.ownerCtrlSetTitle(data.meta.verboseNamePlural);
        }
        if (typeof self.queryArgs.load_meta !== 'undefined') {
            delete self.queryArgs.load_meta;
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
            // Recall previously selected grid rows from this.hasSelectedPkVal().
            if (typeof row[self.meta.pkField] === 'undefined') {
                throw sprintf("Supplied row has no '%s' key", this.meta.pkField);
            }
            var pkVal = row[self.meta.pkField];
            self.gridRows.push(
                self.iocRow({
                    ownerGrid: self,
                    isSelectedRow: self.hasSelectedPkVal(pkVal),
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

    Grid.iocKoAction = function(options) {
        return new App.ko.Action(options);
    };

    Grid.setKoActionTypes = function() {
        var self = this;
        _.each(this.gridActions.actions, function(actDef, actionName) {
            // Built-in actions are invisible to Knockout.js UI and should not be added into self.actionTypes.
            if (actDef.enabled && actDef.type !== 'built_in') {
                var actDef = $.extend({
                    action: actionName
                }, actDef);
                if (typeof self.actionTypes[actDef.type] === 'undefined') {
                    throw sprintf('Unknown action type: "%s"', actDef.type);
                }
                self.actionTypes[actDef.type].push(Grid.iocKoAction({
                    grid: self,
                    actDef: actDef
                }));
            }
        });
    };

    // Pass fired visual action from ko ui to actual action implementation.
    Grid.performKoAction = function(koAction, actionOptions) {
        this.gridActions.setLastKoAction(koAction);
        this.gridActions.performLastAction(actionOptions);
    };

    // Used in ActionTemplateDialog 'ko_action_form' template.
    Grid.getCsrfToken = function() {
        return App.conf.csrfToken;
    };

    // Used in ActionTemplateDialog 'ko_action_form' template.
    Grid.getLastPkVal = function() {
        return this.lastClickedKoRow.getValue(this.meta.pkField);
    };


})(App.ko.Grid.prototype);

/**
 * Visual representation of grid action. Should be used to display / trigger button / glyphicon actions.
 */
App.ko.Action = function(options) {
    this.init(options);
};

(function(Action) {

    Action.init = function(options) {
        this.grid = options.grid;
        this.actDef = options.actDef;
        this.localName = this.actDef.localName;
    };

    Action.getKoCss = function() {
        var koCss = {};
        if (typeof this.actDef.class !== 'undefined') {
            koCss[this.actDef.class] = true;
        }
        return koCss;
    };

    Action.doAction = function(options) {
        var actionOptions = {};
        // Check whether that is 'glyphicon' action, which has gridRow instance passed to doAction().
        if (typeof options.gridRow !== 'undefined') {
            this.grid.lastClickedKoRow = options.gridRow;
            // Clicking current row implies that it is also has to be used for current action.
            options.gridRow.isSelectedRow(true);
            // Clicked row pk value.
            actionOptions['pk_val'] = options.gridRow.getValue(this.grid.meta.pkField);
        }
        if (this.grid.selectedRowsPks.length > 1) {
            // Multiple rows selected. Add all selected rows pk values.
            actionOptions['pk_vals'] =  this.grid.selectedRowsPks;
        }
        this.grid.performKoAction(this, actionOptions);
    };

    Action.doLastClickedRowAction = function() {
        if (typeof this.grid.actionsMenuDialog !== 'undefined') {
            this.grid.actionsMenuDialog.close();
            delete this.grid.actionsMenuDialog;
        }
        this.doAction({gridRow: this.grid.lastClickedKoRow});
    };

})(App.ko.Action.prototype);

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
        this.gridOptions = $.extend({
                selectMultipleRows: true
            },
            fullOptions.gridOptions
        );
        delete fullOptions.gridOptions;
        // Reference to owner component (for example App.ko.FkGridFilter instance).
        this.ownerComponent = fullOptions.ownerComponent;
        delete fullOptions.ownerComponent;
        this.super._call('create', fullOptions);
    };

    GridDialog.propCall = App.propCall;

    GridDialog.onRemoveSelection = function() {
        this.grid.unselectAllRows();
        this.propCall('ownerComponent.onGridDialogUnselectAllRows', {
            'childGrid': this.grid
        });
    };

    GridDialog.onApply = function() {
        return true;
    };

    GridDialog.onChildGridFirstLoad = function() {
        this.propCall('ownerComponent.onGridDialogFirstLoad', {
            'childGrid': this.grid
        });
    };

    GridDialog.onChildGridSelectRow = function(pkVal) {
        console.log('pkVal: ' + JSON.stringify(pkVal));
        this.propCall('ownerComponent.onGridDialogSelectRow', {
            'pkVal': pkVal,
            'childGrid': this.grid
        });
    };

    GridDialog.onChildGridUnselectRow = function(pkVal) {
        console.log('pkVal: ' + JSON.stringify(pkVal));
        this.propCall('ownerComponent.onGridDialogUnselectRow', {
            'pkVal': pkVal,
            'childGrid': this.grid
        });
    };

    GridDialog.iocGrid = function(options) {
        options = $.extend(
            this.gridOptions,
            options
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
        this.grid.cleanBindings(this.bdialog.getModal());
        this.propCall('ownerComponent.onGridDialogHide');
    };

    GridDialog.onShow = function() {
        // Inject ko_grid_pagination underscore / knockout.js template into BootstrapDialog modal footer.
        var $footer = this.bdialog.getModalFooter();
        var $gridPagination = App.domTemplate('ko_grid_pagination');
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
        this.propCall('ownerComponent.onGridDialogShow', {
            'childGrid': this.grid
        });
    };

    GridDialog.close = function() {
        this.super._call('close');
        this.propCall('ownerComponent.onGridDialogClose');
    };

})(App.GridDialog.prototype);

/**
 * BootstrapDialog that is used to create / edit row model object instance.
 */
App.ModelFormDialog = function(options) {
    $.inherit(App.Dialog.prototype, this);
    this.create(options);
};

(function(ModelFormDialog) {

    ModelFormDialog.actionCssClass = 'glyphicon-save';

    ModelFormDialog.getActionLabel = function() {
        return App.trans('Save');
    };

    ModelFormDialog.getButtons = function() {
        var self = this;
        return [
            {
                icon: 'glyphicon glyphicon-ban-circle',
                label: App.trans('Cancel'),
                cssClass: 'btn-default',
                action: function(bdialog) {
                    bdialog.close();
                }
            },
            {
                icon: 'glyphicon ' + this.actionCssClass,
                label: this.getActionLabel(),
                cssClass: 'btn-primary submit',
                action: function(bdialog) {
                    var $form = bdialog.getModalBody().find('form');
                    var $button = bdialog.getModalFooter().find('button.submit');
                    App.AjaxForm.prototype.submit($form, $button, {
                        success: function(response) {
                            var gridVms = App.filterViewModels(response, {
                                view: self.grid.gridActions.viewModelName
                            });
                            if (gridVms.length === 0) {
                                // If response has no our grid viewmodel (self.gridActions.viewModelName), then
                                // it's a form viewmodel errors response which is processed then by
                                // App.AjaxForm.prototype.submit().
                                return true;
                            }
                            bdialog.close();
                            self.grid.gridActions.respond(
                                self.grid.gridActions.lastActionName,
                                response
                            );
                            // Do not process viewmodel response, because we already processed it here.
                            return false;
                        }
                    });
                }
            }
        ];
    };

    ModelFormDialog.create = function(options) {
        if (typeof options !== 'object') {
            options = {};
        }
        delete options.view;
        this.grid = options.grid;
        delete options.grid;
        var fullOptions = $.extend({
                type: BootstrapDialog.TYPE_PRIMARY,
                buttons: this.getButtons(),
            }, options
        );
        this.super._call('create', fullOptions);
    };

    ModelFormDialog.onShow = function() {
        this.super._call('onShow');
        App.initClient(this.bdialog.getModalBody());
    };

    ModelFormDialog.onHide = function() {
        App.initClient(this.bdialog.getModalBody(), 'dispose');
        this.super._call('onHide');
    };

})(App.ModelFormDialog.prototype);

/**
 * Client-side part of widgets.ForeignKeyGridWidget to select foreign key via App.GridDialog.
 * Much similar to django.admin ForeignKeyRawIdWidget but is Knockout.js driven.
 */
App.FkGridWidget = function(options) {
    this.init(options);
};

(function(FkGridWidget) {

    FkGridWidget.init = function(options) {
        var gridOptions = $.extend(options, {
            ajaxParams: {
                row_model_str: true
            },
            selectMultipleRows: false,
            showSelection: true
        });
        this.gridDialog = new App.GridDialog({
            ownerComponent: this,
            gridOptions: options
        });
    };

    FkGridWidget.run = function(element) {
        var self = this;
        this.$element = $(element);
        this.$element.find('.fk-choose').on('click', function(ev) {
            self.gridDialog.show();
        });
    };

    FkGridWidget.getValue = function() {
        return App.intVal(this.$element.find('.fk-value').val());
    };

    FkGridWidget.setValue = function(value) {
        this.$element.find('.fk-value')
            .val(value);
        return this;
    };

    FkGridWidget.setDisplayValue = function(displayValue) {
        this.$element.find('.fk-display')
            .text(displayValue);
        return this;
    };

    FkGridWidget.onGridDialogFirstLoad = function(options) {
        var pkVal = this.getValue();
        options.childGrid.addSelectedPkVal(pkVal);
        var koRow = options.childGrid.findKoRowByPkVal(pkVal);
        if (koRow !== null) {
            options.childGrid.selectOnlyKoRow(koRow);
        }
    };

    FkGridWidget.onGridDialogSelectRow = function(options) {
        var koRow = options.childGrid.findKoRowByPkVal(options.pkVal);
        if (typeof koRow.str === 'undefined') {
            throw "Set childGrid.options.ajaxParams.row_model_str = true";
        }
        this.setValue(options.pkVal)
            .setDisplayValue(koRow.str);
    };

    FkGridWidget.onGridDialogUnselectAllRows = function(options) {
        this.setValue('')
            .setDisplayValue('');
    };

    FkGridWidget.onGridDialogUnselectRow = function(options) {
        this.onGridDialogUnselectAllRows();
    };

})(App.FkGridWidget.prototype);

/**
 * BootstrapDialog displayed when grid row is clicked and multiple 'click' actions are defined.
 */
App.ActionsMenuDialog = function(options) {
    $.inherit(App.Dialog.prototype, this);
    this.create(options);
};

(function(ActionsMenuDialog) {

    ActionsMenuDialog.getButtons = function() {
        var self = this;
        return [{
            label: App.trans('Cancel'),
            action: function(dialogItself) {
                dialogItself.close();
            }
        }];
    };

    ActionsMenuDialog.blockTags = [
        {
            enclosureTag: '<div>',
            enclosureClasses: 'well well-sm',
            itemTag: '<span>',
                itemClasses: 'badge'
        }
    ];

    ActionsMenuDialog.renderRow = function() {
        var descParts = this.grid.lastClickedKoRow.getDescParts();
        if (_.size(descParts) === 0) {
            return '';
        }
        var $title = $('<span>');
        return App.renderNestedList($title, descParts, this.blockTags);
    };

    ActionsMenuDialog.templateId = 'ko_grid_row_click_menu';

    ActionsMenuDialog.create = function(options) {
        this.wasOpened = false;
        this.grid = options.grid;
        delete options.grid;
        var dialogOptions = $.extend(
            {
                template: this.templateId,
                title: App.trans('Choose action'),
                buttons: this.getButtons()
            }, options
        );
        this.super._call('create', dialogOptions);
    };

    ActionsMenuDialog.onShow = function() {
        this.super._call('onShow');
        this.grid.applyBindings(this.bdialog.getModal());
        this.bdialog.getModalBody().prepend(this.renderRow());
        this.wasOpened = true;
    };

    ActionsMenuDialog.onHide = function() {
        // Clean only grid bindings of this dialog, not invoker bindings.
        this.grid.cleanBindings(this.bdialog.getModal());
        this.super._call('onHide');
    };

})(App.ActionsMenuDialog.prototype);

/**
 * May be inherited to create BootstrapDialog with client-side template form for implemented action.
 * Usage:

    App.ChildActionDialog = function(options) {
        $.inherit(App.ActionTemplateDialog.prototype, this);
        this.inherit();
        this.create(options);
    };

    ChildActionDialog.create = function(options) {
        this.super._call('create', options);
        ...
    };
 */
App.ActionTemplateDialog = function(options) {
    this.inherit();
    this.create(options);
};

(function(ActionTemplateDialog) {

    ActionTemplateDialog.type = BootstrapDialog.TYPE_PRIMARY;
    ActionTemplateDialog.templateId = 'ko_action_form';

    ActionTemplateDialog.getActionLabel = function() {
        return this.grid.gridActions.lastKoAction.localName;
    };

    ActionTemplateDialog.actionCssClass = 'glyphicon-plus';

    ActionTemplateDialog.inherit = function() {
        // First, import methods of direct ancestor.
        $.inherit(App.ActionsMenuDialog.prototype, this);
        // Second, import methods of base class that are missing in direct ancestor.
        $.inherit(App.Dialog.prototype, this);
        // Third, import just one method from ModelFormDialog (simple mixin).
        this.getButtons = App.ModelFormDialog.prototype.getButtons;
    };

    ActionTemplateDialog.create = function(options) {
        options.title = options.grid.gridActions.lastKoAction.localName;
        this.super._call('create', options);
        /**
         * Update meta (display text) for bound ko template (this.templateId).
         * This may be used to invoke the same dialog with different messages
         * for similar yet different actions.
         */
        if (typeof options.meta !== 'undefined') {
            this.grid.updateMeta(options.meta);
            delete options.meta;
        }
    };

    ActionTemplateDialog.onShow = function() {
        this.super._call('onShow');
        App.initClient(this.bdialog.getModalBody());
    };

})(App.ActionTemplateDialog.prototype);
