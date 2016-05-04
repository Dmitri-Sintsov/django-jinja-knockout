"use strict";

ko.bindingHandlers.grid_row = {
    update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var realElement = ko.from_virtual(element);
        if (realElement !== null) {
            viewModel.setRowElement($(realElement));
        }
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

    GridFilterChoice.onLoadFilter = function(ev) {
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
        this.ownerGrid.listAction();
    };

    FkGridFilter.removeQueryFilter = function(value) {
        this.super.removeQueryFilter.call(this, value);
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

    GridRow.initDisplayValues = function() {
        this.displayValues = _.mapObject(this.values, _.bind(this.observeDisplayValue, this));
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
        if (typeof this.values['__str'] !== 'undefined') {
            this.str = this.values.__str;
            delete this.values.__str;
        }
        // 'Rendered' (formatted) field values, as displayed by ko_grid_body template bindings.
        this.displayValues = {};
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
        this.values = savedRow.values;
        _.each(savedRow.displayValues, function(value, field) {
            self.displayValues[field](ko.utils.unwrapObservable(value));
            // self.displayValues[field].valueHasMutated();
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
 * Actions performed for particular grid instance. Mostly are row-click actions, although not limited to.
 */
App.GridActions = function(options) {
    this.init(options);
};

(function(GridActions) {

    GridActions.init = function(options) {
        this.grid = options.grid;
        this.action_kwarg = 'action';
        this.viewModelName = 'grid_page';
    };

    GridActions.setActionKwarg = function(action_kwarg) {
        this.action_kwarg = action_kwarg;
    };

    GridActions.has = function(action) {
        return typeof this.grid.meta.actions[action] !== 'undefined' && this.grid.meta.actions[action].enabled;
    };

    GridActions.getUrl =  function(action) {
        if (typeof action === 'undefined') {
            action = '';
        } else {
            action = '/' + action;
        }
        var params = {};
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
            if (typeof self[method] === 'function') {
                return self[method](viewModel);
            }
            throw sprintf('Unimplemented %s()', method);
        };
        App.viewResponse(response, responseOptions);
    };

    GridActions.perform = function(action, actionOptions, ajaxCallback) {
        var queryArgs = this.getQueryArgs(action, actionOptions);
        queryArgs.csrfmiddlewaretoken = App.conf.csrfToken;
        this.ajax(action, queryArgs, ajaxCallback);
    };

    GridActions.callback_create_form = function(viewModel) {
        viewModel.gridActions = this;
        var dialog = new App.ModelFormDialog(viewModel);
        dialog.show();
    };

    GridActions.callback_delete = function(viewModel) {
        var self = this;
        var pks = viewModel.pks;
        delete viewModel.pks;
        viewModel.callback = function(result) {
            if (result) {
                self.perform('delete_confirmed', {'pks': pks});
            }
        };
        var dialog = new App.Dialog(viewModel);
        dialog.confirm();
    };

    GridActions.callback_delete_confirmed = function(viewModel) {
        this.grid.deleteAction({'pks': viewModel.deleted_pks});
    };

    /**
     * The same client-side AJAX form is used both to add new objects and to update existing ones.
     */
    GridActions.callback_edit_form = function(viewModel) {
        this.callback_create_form(viewModel);
    };

    /**
     * The same server-side AJAX response is used both to add new objects and to update existing ones.
     */
    GridActions.callback_model_saved = function(viewModel) {
        // this.perform('list');
        switch (viewModel.action) {
        case 'add_row':
            this.grid.addKoRow(viewModel.row);
            break;
        case 'update_row':
            this.grid.updateKoRow(viewModel.row);
            break;
        default:
            throw sprintf('Unknown callback_model_saved action: "%s"', viewModel.action);
        }
    };

    GridActions.queryargs_delete = function(options) {
        return this.grid.getDeleteQueryArgs();
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
        this.$selector = $(selector);
        ko.applyBindings(this, this.$selector.get(0));
    };

    Grid.cleanBindings = function() {
        ko.cleanNode(this.$selector.get(0));
    };

    Grid.iocGridActions = function(options) {
        return new App.GridActions(options);
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
        }, options);
        if (this.options.selectMultipleRows) {
            this.options.showSelection = true;
        }
        this.ownerCtrl = this.options.ownerCtrl;
        this.meta = {
            pkField: '',
            actions: {
                // Sample action. Actual actions are configured at server-side and populated via AJAX response.
                'delete': {
                    'localName': App.trans('Remove'),
                    'type': 'glyphicon',
                    'glyph': 'remove',
                    'enabled': false
                }
            },
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
            'grid': this
        });
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

    /**
     * Adds new grid row from raw viewmodel row supplied.
     */
    Grid.addKoRow = function(newRow) {
        this.gridRows.push(this.iocRow({
            ownerGrid: this,
            isSelectedRow: false,
            values: newRow
        }));
    };

    /**
     * Updates existing grid row with raw viewmodel row supplied.
     */
    Grid.updateKoRow = function(savedRow) {
        var pkVal = savedRow[this.meta.pkField];
        var savedGridRow = this.iocRow({
            ownerGrid: this,
            isSelectedRow: this.hasSelectedPkVal(pkVal),
            values: savedRow
        });
        var rowToUpdate = this.findKoRowByPkVal(pkVal);
        rowToUpdate.update(savedGridRow);
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

    Grid.rowClick = function(currKoRow) {
        console.log('Grid.rowClick() values: ' + JSON.stringify(currKoRow.values));
        if (this.options.selectMultipleRows) {
            currKoRow.inverseSelection();
            if (this.gridActions.has('edit_formset')) {
                this.gridActions.perform('edit_formset', {'pk_vals': this.selectedRowsPks});
            }
        } else {
            var currPkVal = this.selectOnlyKoRow(currKoRow);
            if (this.gridActions.has('edit_form')) {
                this.gridActions.perform('edit_form', {'pk_val': currPkVal});
            }
        }
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

    Grid.getDeleteQueryArgs = function() {
        return {'pks': this.selectedRowsPks};
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
            ko.set_props(data.meta, self.meta);
            this.setKoActions();
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

    Grid.deleteAction = function(options) {
        for (var i = 0; i < options.pks.length; i++) {
            var pkVal = App.intVal(options.pks[i]);
            this.removeSelectedPkVal(pkVal);
            var koRow = this.unselectRow(pkVal);
            if (koRow !== null) {
                this.gridRows.remove(koRow);
            }
        }
    };

    Grid.iocKoAction = function(options) {
        return new App.ko.Action(options);
    };

    Grid.setKoActions = function() {
        var self = this;
        _.each(this.meta.actions, function(actDef, actionName) {
            if (actDef.enabled && typeof actDef.type !== 'undefined') {
                var actDef = $.extend({
                    action: actionName
                }, actDef);
                self.actionTypes[actDef.type].push(Grid.iocKoAction({
                    grid: self,
                    actDef: actDef
                }));
            }
        });
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
        koCss[this.actDef.class] = true;
        return koCss;
    };

    Action.doAction = function(options) {
        // Check whether that is 'glyphicon' action, which has gridRow instance passed to doAction().
        if (typeof options.gridRow !== 'undefined') {
            // Clicking current row implies that it is also has to be used for current action.
            options.gridRow.isSelectedRow(true);
        }
        this.grid.gridActions.perform(this.actDef.action);
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
        this.super.create.call(this, fullOptions);
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
        this.grid.cleanBindings();
        this.propCall('ownerComponent.onGridDialogHide');
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
        this.propCall('ownerComponent.onGridDialogShow', {
            'childGrid': this.grid
        });
    };

    GridDialog.remove = function() {
        if (this.wasOpened) {
            this.grid.cleanBindings();
        }
        this.super.remove.call(this);
        this.propCall('ownerComponent.onGridDialogRemove');
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
                icon: 'glyphicon glyphicon-save',
                label: App.trans('Save'),
                cssClass: 'btn-primary submit',
                action: function(bdialog) {
                    var $form = bdialog.getModalBody().find('form');
                    var $button = bdialog.getModalFooter().find('button.submit');
                    App.ajaxForm.prototype.submit($form, $button, {
                        success: function(response) {
                            var hasGridAction = App.filterViewModels(response, {
                                view: self.gridActions.viewModelName
                            });
                            if (hasGridAction.length === 0) {
                                // If response has no our grid viewmodel (self.gridActions.viewModelName), then
                                // it's a form viewmodel errors response which is processed then by
                                // App.ajaxForm.prototype.submit().
                                return true;
                            }
                            bdialog.close();
                            self.gridActions.respond('model_saved', response);
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
        this.gridActions = options.gridActions;
        delete options.gridActions;
        var fullOptions = $.extend({
                type: BootstrapDialog.TYPE_PRIMARY,
                buttons: this.getButtons(),
            }, options
        );
        this.super.create.call(this, fullOptions);
    };

    ModelFormDialog.onShow = function() {
        App.initClient(this.bdialog.getModalBody());
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
