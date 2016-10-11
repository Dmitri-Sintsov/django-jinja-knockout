'use strict';

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

// Supports jQuery elements / nested arrays / objects / HTML strings as grid cell value.
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
        // '+' means 'asc', '-' means 'desc', null means unsorted.
        this.order = ko.observable(options.order);
        this.isSortedColumn = ko.observable(options.isSorted);
        this.orderCss = ko.computed(this.getOrderCss, this);
        this.columnCss = ko.computed(this.getColumnCss, this);
    };

    GridColumnOrder.getOrderCss = function() {
        return {
            'sort-inactive': this.order() === null,
            'sort-asc': this.order() === '+',
            'sort-desc': this.order() === '-'
        };
    };

    GridColumnOrder.getColumnCss = function() {
        var css = {};
        if (this.ownerGrid.highlightMode() === 1) {
            // Finds foreach $index() inaccessible directly in computed.
            var index = this.ownerGrid.gridColumns().indexOf(this);
            css = $.extend({
                'success': !(index & 1),
                'info': index & 1
            }, css);
        }
        return css;
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

    GridColumnOrder.blockTags = App.blockTags.list;

    // Supports jQuery elements / nested arrays / objects / HTML strings as grid cell value.
    GridColumnOrder.renderRowValue = function(element, value) {
        if (value instanceof jQuery) {
            $(element).empty().append(value);
        } else if (typeof value === 'object') {
            $(element).empty();
            /**
             * Do not escape nested list because it's escaped by default in App.ko.GridRow.htmlEncode().
             * This allows to have both escaped and unescaped nested lists in row cells
             * via App.ko.Grid.isMarkSafeField()
             */
            App.renderNestedList(element, value, {blockTags: this.blockTags, fn: 'html'});
        } else {
            // Warning: make sure string is escaped!
            // Primarily use is to display server-side formatted strings (Djano local date / currency format).
            $(element).html(value);
        }
    };

})(App.ko.GridColumnOrder.prototype);


/**
 * Grid filter choice control. One dropdown filter has multiple filter choices.
 */

App.ko.GridFilterChoice = function(options) {
    this.init(options);
};

(function (GridFilterChoice) {

    GridFilterChoice.updateQueryFilter = function(newValue) {
        if (this.value === null) {
            return;
        }
        if (newValue) {
            this.ownerFilter.addQueryFilter({
                value: this.value,
                lookup: 'in'
            });
        } else {
            this.ownerFilter.removeQueryFilter({
                value: this.value,
                lookup: 'in'
            });
        }
    };

    GridFilterChoice.init = function(options) {
        this.$link = null;
        this.ownerFilter = options.ownerFilter;
        this.name = options.name;
        this.value = options.value;
        this.is_active = ko.observable();
        this.is_active.subscribe(_.bind(this.updateQueryFilter, this));
        this.is_active(options.is_active);
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
        this.allowMultipleChoices = App.propGet(options, 'allowMultipleChoices', false);
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

    AbstractGridFilter.getQueryFilter = function() {
        return this.ownerGrid.getFieldQueryFilter(this.field);
    };

    AbstractGridFilter.addQueryFilter = function(options) {
        var filterOptions = $.extend({
            field: this.field
        }, options);
        this.ownerGrid.addQueryFilter(filterOptions);
    };

    AbstractGridFilter.removeQueryFilter = function(options) {
        if (typeof options === 'undefined') {
            options = {};
        }
        var filterOptions = $.extend({
            field: this.field
        }, options);
        this.ownerGrid.removeQueryFilter(filterOptions);
    };

    /**
     * Programmatically set specified values list of filter choices for current filter.
     */
    AbstractGridFilter.setChoices = function(values) {
        throw 'Abstract method';
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
        this._super._call('init', options);
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
        } else if (!this.allowMultipleChoices) {
            // Switch current filter choice.
            // Allow to select none choices (reset) only if there is reset choice in menu.
            if (this.resetFilter !== null || !currentChoice.is_active()) {
                currentChoice.is_active(!currentChoice.is_active());
            }
            // Turn off all another filter choices.
            for (var i = 0; i < this.choices.length; i++) {
                if (!currentChoice.is(this.choices[i])) {
                    this.choices[i].is_active(false);
                }
            }
            this.resetFilterLogic();
        } else {
            // Do not close dropdown for multiple filter choices.
            if (typeof ev !== 'undefined') {
                ev.stopPropagation();
            }
            // Switch current filter choice.
            currentChoice.is_active(!currentChoice.is_active());
            this.resetFilterLogic();
        }
        var resetFilterIsActive = (this.resetFilter !== null) ?
            this.resetFilter.is_active() : false;
        this.hasActiveChoices(!resetFilterIsActive);
    };

    GridFilter.getKoFilterChoice = function(value) {
        for (var i = 0; i < this.choices.length; i++) {
            var filterChoice = this.choices[i];
            if (filterChoice.value === value) {
                return filterChoice;
            }
        };
        return null;
    };

    GridFilter.getActiveChoices = function() {
        var activeChocies = [];
        for (var i = 0; i < this.choices.length; i++) {
            var filterChoice = this.choices[i];
            if (filterChoice.is_active()) {
                activeChocies.push(filterChoice);
            }
        }
        return activeChocies;
    };

    /**
     * Programmatically set specified values list of filter choices for current filter.
     */
    GridFilter.setChoices = function(values) {
        this.resetFilterLogic();
        for (var i = 0; i < values.length; i++) {
            var koFilterChoice = this.getKoFilterChoice(values[i]);
            if (koFilterChoice !== null) {
                this.switchKoFilterChoices(koFilterChoice);
            }
        }
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
         * Allows to specifiy BootstrapDialog size in Jinja2 macro / .get_default_grid_options() for example:
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
            filterOptions: options.fkGridOptions
        }, gridDialogOptions);
        this.gridDialog = new App.GridDialog(gridDialogOptions);
        this._super._call('init', options);
        this.choices = null;
    };

    FkGridFilter.onDropdownClick = function(ev) {
        this.gridDialog.show();
    };

    FkGridFilter.onGridDialogSelectRow = function(options) {
        if (!this.allowMultipleChoices) {
            this.removeQueryFilter({
                lookup: 'in'
            });
        }
        this.addQueryFilter({
            value: options.pkVal,
            lookup: 'in'
        });
        this.hasActiveChoices(true);
        this.ownerGrid.queryArgs.page = 1;
        this.ownerGrid.listAction();
    };

    FkGridFilter.onGridDialogUnselectRow = function(options) {
        if (this.allowMultipleChoices) {
            this.removeQueryFilter({
                value: options.pkVal,
                lookup: 'in'
            });
            this.hasActiveChoices(options.childGrid.selectedRowsPks.length > 0);
            this.ownerGrid.queryArgs.page = 1;
            this.ownerGrid.listAction();
        }
    };

    FkGridFilter.onGridDialogUnselectAllRows = function(options) {
        this.removeQueryFilter({
            lookup: 'in'
        });
        this.hasActiveChoices(false);
        this.ownerGrid.queryArgs.page = 1;
        this.ownerGrid.listAction();
    };

    FkGridFilter.setChoices = function(values) {
        this.removeQueryFilter({
            lookup: 'in'
        });
        for (var i = 0; i < values.length; i++) {
            this.addQueryFilter({
                value: values[i],
                lookup: 'in'
            });
        }
        this.hasActiveChoices(values.length > 0);
    };

})(App.ko.FkGridFilter.prototype);

/**
 * Range grid filter control. Contains dialog with two scalar fields to select interval of field value.
 * Currently supports DateTimeField, DateField, DecimalField.
 */

App.ko.RangeFilter = function(options) {
    $.inherit(App.ko.AbstractGridFilter.prototype, this);
    this.init(options);
};

(function(RangeFilter) {

    RangeFilter.init = function(options) {
        this.type = options.type;
        this._super._call('init', options);
        this.choices = null;
        this.meta = {
            from: App.trans('From'),
            to: App.trans('To'),
        };
        this.from = ko.observable('');
        this.to = ko.observable('');
        ko.switchSubscription(this, 'from');
        ko.switchSubscription(this, 'to');
        var method = 'getFieldAttrs_' + this.type;
        if (typeof this[method] !== 'function') {
            throw 'App.ko.RangeFilter.' + method + ' is not the function';
        }
        this.fieldAttrs = this[method]();
        this.filterDialog = new App.FilterDialog({
            ownerComponent: this,
            title: this.name,
            template: 'ko_range_filter'
        });
    };

    RangeFilter.getFieldAttrs_datetime = function() {
        return {
            'class': 'form-control datetime-control',
            'type': 'text'
        };
    };

    RangeFilter.getFieldAttrs_date = function() {
        return {
            'class': 'form-control date-control',
            'type': 'text'
        };
    };

    RangeFilter.getFieldAttrs_number = function() {
        return {
            'class': 'form-control',
            'type': 'number'
        };
    };

    RangeFilter.onDropdownClick = function(ev) {
        this.filterDialog.show();
    };

    RangeFilter.onFilterDialogRemoveSelection = function() {
        this.from('');
        this.to('');
        this.hasActiveChoices(false);
    };

    RangeFilter.doLookup = function(value, lookup) {
        var self = this;
        // console.log('lookup: ' + lookup);
        this.addQueryFilter({
            'value': value,
            'lookup': lookup
        });
        this.hasActiveChoices(true);
        this.ownerGrid.queryArgs.page = 1;
        this.ownerGrid.listAction(function(viewModel) {
            if (typeof self.filterDialog.bdialog !== 'undefined') {
                var applyButton = self.filterDialog.bdialog.getButton('filter_apply');
                if (App.propGet(viewModel, 'has_errors') === true) {
                    applyButton.disable();
                    self.hasActiveChoices(false);
                } else {
                    applyButton.enable();
                    self.hasActiveChoices(self.from() !== '' || self.to() !== '');
                }
            }
        });
    };

    RangeFilter.onFrom = function(value) {
        this.doLookup(value, 'gte');
    };

    RangeFilter.onTo = function(value) {
        this.doLookup(value, 'lte');
    };

    RangeFilter.setChoices = function(values) {
        if (typeof values.gte !== 'undefined') {
            this.from(values.gte);
        }
        if (typeof values.lte !== 'undefined') {
            this.to(values.lte);
        }
    };

})(App.ko.RangeFilter.prototype);

/**
 * Single row of grid (ko viewmodel).
 */
App.ko.GridRow = function(options) {
    this.init(options);
};

(function(GridRow) {

    // Turned off by default for performance reasons (not required for some grids).
    GridRow.useInitClient = false;
    // todo: turn off by default and update saved row at whole.
    GridRow.observeDisplayValue = true;

    GridRow.prepare = function() {
        App.initClient(this.$row);
    };

    GridRow.dispose = function() {
        App.initClient(this.$row, 'dispose');
    };

    GridRow.is = function(gridRow) {
        // .strFields has to be compared because when foreignkey field has modified values of .get_str_fields()
        // such grids should be highlighted as changed.
        return _.isEqual(this.values, gridRow.values) && _.isEqual(this.strFields, gridRow.strFields);
    };

    GridRow.afterRender = function() {
        var self = this;
        if (this.useInitClient) {
            // Add row.
            this.prepare();
            ko.utils.domNodeDisposal.addDisposeCallback(this.$row.get(0), function() {
                // Remove row.
                self.dispose();
            });
        }
    };

    // Descendant could skip html encoding selected fields to preserve html formatting.
    GridRow.htmlEncode = function(displayValue, field, markSafe) {
        if (markSafe) {
            return displayValue;
        } else {
            return App.recursiveMap(displayValue, $.htmlEncode);
        }
    };

    // Descendant could format it's own displayValue, including html content.
    GridRow.toDisplayValue = function(value, field) {
        var displayValue;
        var fieldRelated = field.match(/(.+)_id$/);
        if (fieldRelated !== null) {
            fieldRelated = fieldRelated[1];
        }
        var markSafe = this.ownerGrid.isMarkSafeField(field);
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
        displayValue = this.htmlEncode(displayValue, field, markSafe);
        return displayValue;
    };

    // Support jQuery objects as display values.
    // Wraps display value into ko.observable(), when needed.
    GridRow.wrapDisplayValue  = function(value, field) {
        var displayValue = this.toDisplayValue(value, field);
        return this.observeDisplayValue ? ko.observable(displayValue) : displayValue;
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
        this.displayValues = _.mapObject(this.values, _.bind(this.wrapDisplayValue, this));
    };

    GridRow.getSelectionCss = function() {
        return {
            'glyphicon-check': this.isSelectedRow(),
            'glyphicon-unchecked': !this.isSelectedRow()
        };
    };

    GridRow.getRowCss = function() {
        var css = {
            'grid-new-row': this.isUpdated(),
            'pointer': this.ownerGrid.actionTypes['click']().length > 0
        };
        if (this.ownerGrid.highlightMode() === 2) {
            // Finds foreach $index() inaccessible directly in computed.
            var index = this.ownerGrid.gridRows().indexOf(this);
            css = $.extend({
                'success': !(index & 1),
                'info': index & 1
            }, css);
        }
        return css;
    };

    GridRow.init = function(options) {
        var self = this;
        this.ownerGrid = options.ownerGrid;
        this.index = options.index;
        this.isSelectedRow = ko.observable(options.isSelectedRow);
        this.selectionCss = ko.computed(this.getSelectionCss, this);
        this.isUpdated = ko.observable(
            (typeof options.isUpdated === 'undefined') ? false : options.isUpdated
        );
        this.rowCss = ko.computed(this.getRowCss, this);
        this.isSelectedRow.subscribe(function(newValue) {
            if (newValue) {
                self.ownerGrid.onSelectRow(self);
            } else {
                self.ownerGrid.onUnselectRow(self);
            }
        });
        this.$row = null;
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
            this.str = null;
        }
        this.initDisplayValues();
        this.actionsACL = {};
        this.ownerGrid.setACL(this);
    };

    GridRow.getValue = function(field) {
        return typeof this.values[field] === 'undefined' ? undefined : this.values[field];
    };

    GridRow.inverseSelection = function() {
        this.isSelectedRow(!this.isSelectedRow());
    };

    GridRow.ignoreRowClickTagNames = [
        'A', 'BUTTON', 'INPUT', 'OPTION', 'SELECT', 'TEXTAREA'
    ];

    GridRow.onRowClick = function(data, ev) {
        var tagName = $(ev.target).prop('tagName');
        if (this.ignoreRowClickTagNames.indexOf(tagName) >= 0) {
            return true;
        }
        this.ownerGrid.rowClick(this);
        return false;
    };

    GridRow.onSelect = function(data, ev) {
        this.ownerGrid.rowSelect(this);
        return false;
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
        if (this.useInitClient) {
            // Dispose old row.
            this.dispose();
        }
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
        if (this.useInitClient) {
            // Init updated row.
            this.prepare();
        }
    };

    GridRow.getDescParts = function() {
        if (this.ownerGrid.meta.strDesc && this.str !== null) {
            return [this.str];
        }
        if (_.size(this.strFields) > 0) {
            return this.strFields;
        } else if (this.str !== null) {
            return [this.str];
        }
        // Last resort.
        return [this.getValue(this.meta.pkField)];
    };

    GridRow.renderDesc = function(renderOptions) {
        var descParts = this.getDescParts();
        if (_.size(descParts) === 0) {
            return '';
        }
        var $content = $('<span>');
        return App.renderNestedList($content, descParts, renderOptions);
    };

    /**
     * Override in child class to selectively enable only some of actions for the particular grid row,
     * depending on this.values.
     */
    GridRow.hasEnabledAction = function(action) {
        return true;
    };

    // Observable factory of this.hasEnabledAction(action) result for current row.
    GridRow.observeEnabledAction = function(action) {
        var isEnabled = this.hasEnabledAction(action);
        var actType = action.actDef.type;
        if (typeof this.actionsACL[actType] !== 'object') {
            this.actionsACL[actType] = {};
        }
        if (typeof this.actionsACL[actType][action.name] !== 'function') {
            this.actionsACL[actType][action.name] = ko.observable(false);
        }
        this.actionsACL[actType][action.name](isEnabled);
        return this.actionsACL[actType][action.name];
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
        var self = this;
        _.each(actions, function(actions, actionType) {
            for (var i = 0; i < actions.length; i++) {
                actions[i].type = actionType;
                self.actions[actions[i].name] = actions[i];
            }
        });
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

    GridActions.getOurViewmodel = function(response) {
        var vms = App.filterViewModels(response, {
            view: this.viewModelName
        });
        // Assuming there is only one viewmodel with view: this.viewModelName, which is currently true.
        if (vms.length > 1) {
            throw "Bug check in App.GridActions.getOurViewmodel(), vms.length: " + vms.length;
        }
        return (vms.length === 0) ? null : vms[0];
    };

    GridActions.ajax = function(action, queryArgs, callback) {
        var self = this;
        queryArgs.csrfmiddlewaretoken = App.conf.csrfToken;
        $.post(this.getUrl(action),
            queryArgs,
            function(response) {
                self.respond(action, response);
                if (typeof callback === 'function') {
                    var vm = self.getOurViewmodel(response);
                    if (vm !== null) {
                        callback(vm);
                    }
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
        // Do not remove this property, because it may be overriden separately via AJAX call result in this.respond().
        this.lastActionName = koAction.name;
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

    GridActions.callback_create_inline = function(viewModel) {
        this.callback_create_form(viewModel);
    };

    GridActions.blockTags = App.blockTags.badges;

    GridActions.renderDescription = function(viewModel, dialogType) {
        viewModel.message = $('<div>');
        App.renderNestedList(viewModel.message, viewModel.description, {blockTags: this.blockTags});
        if (typeof dialogType === 'undefined') {
            dialogType = BootstrapDialog.TYPE_DANGER;
        }
        viewModel.type = dialogType;
        delete viewModel.description;
    };

    GridActions.callback_delete = function(viewModel) {
        var self = this;
        if (typeof viewModel.has_errors !== 'undefined') {
            this.renderDescription(viewModel);
            new App.Dialog(viewModel).alert();
            return;
        }
        var pkVals = viewModel.pkVals;
        delete viewModel.pkVals;
        viewModel.callback = function(result) {
            if (result) {
                self.perform('delete_confirmed', {'pk_vals': pkVals});
            }
        };
        this.renderDescription(viewModel);
        var dialog = new App.Dialog(viewModel);
        dialog.confirm();
    };

    GridActions.callback_delete_confirmed = function(viewModel) {
        if (typeof viewModel.has_errors !== 'undefined') {
            this.renderDescription(viewModel);
            new App.Dialog(viewModel).alert();
        } else {
            this.grid.updatePage(viewModel);
        }
    };

    /**
     * The same client-side AJAX form is used both to add new objects and to update existing ones.
     */
    GridActions.callback_edit_form = function(viewModel) {
        this.callback_create_form(viewModel);
    };

    GridActions.callback_edit_inline = function(viewModel) {
        this.callback_create_form(viewModel);
    };

    GridActions.callback_save_form = function(viewModel) {
        this.grid.updatePage(viewModel);
        // Brute-force approach:
        // this.perform('list');
    };

    GridActions.callback_save_inline = function(viewModel) {
        this.grid.updatePage(viewModel);
    };

    /**
     * Load metadata from AJAX response.
     * Can be used separately to update columns descriptions / sort orders / filters on the fly.
     */
    GridActions.callback_meta = function(data) {
        if (typeof data.action_kwarg !== 'undefined') {
            this.setActionKwarg(data.action_kwarg);
        }
        this.grid.loadMetaCallback(data);
    };

    GridActions.queryargs_list = function(options) {
        return this.grid.getListQueryArgs();
    };

    GridActions.queryargs_update = function(options) {
        return this.queryargs_list(options);
    };

    /**
     * Populate viewmodel from AJAX response.
     */
    GridActions.callback_list = function(data) {
        this.grid.listCallback(data);
    };

    GridActions.callback_update = function(data) {
        this.callback_list(data);
    };

    /**
     * Combined 'meta' / 'list' action to reduce HTTP traffic.
     */
    GridActions.queryargs_meta_list = function(options) {
        return this.grid.getListQueryArgs();
    };

    GridActions.callback_meta_list = function(data) {
        this.callback_meta(data);
        this.callback_list(data);
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
                page: 1
            },
            this.options.ajaxParams
        );
        this.queryFilters = {};
    };

    Grid.firstLoad = function(callback) {
        var self = this;
        if (this.options.separateMeta) {
            /**
             * this.options.separateMeta == true is required when 'list' action queryArgs / queryFilters depends
             * on result of 'meta' action. For example that is true for grids with advanced allowed_filter_fields
             * values of dict type: see views.GridActionxMixin.vm_get_filters().
             */
            this.gridActions.perform('meta', {}, function(viewmodel) {
                if (self.options.defaultOrderBy !== null) {
                    // Override 'list' action AJAX queryargs ordering.
                    self.setQueryOrderBy(self.options.defaultOrderBy);
                }
                self.gridActions.perform('list', {}, function(viewmodel) {
                    self.onFirstLoad();
                    if (typeof callback === 'function') {
                        callback();
                    }
                });
            });
        } else {
            // Save a bit of HTTP traffic by default.
            this.gridActions.perform('meta_list', {}, function(viewmodel) {
                self.onFirstLoad();
                if (typeof callback === 'function') {
                    callback();
                }
            });
        }
    };

    Grid.onFirstLoad = function() {
        this.propCall('ownerCtrl.onChildGridFirstLoad');
    };

    Grid.run = function(element) {
        this.applyBindings(element);
        this.firstLoad();
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
        ko.utils.setProps(data, this.meta);
    };

    Grid.uiActionTypes = ['button', 'click', 'glyphicon'];

    Grid.init = function(options) {
        var self = this;
        this.options = $.extend({
            alwaysShowPagination: true,
            ajaxParams: {},
            // Overrides this.meta.orderBy value when not null.
            defaultOrderBy: null,
            fkGridOptions: {},
            // Currently available modes:
            //   0 - do not highlight,
            //   1 - highlight columns,
            //   2 - highlight rows.
            highlightMode: 2,
            searchPlaceholder: null,
            selectMultipleRows: false,
            separateMeta: false,
            showSelection: false,
            ownerCtrl: null,
            pageRoute: null,
            pageRouteKwargs: {},
        }, options);
        if (this.options.defaultOrderBy !== null) {
            // Requires  separate 'meta' action to properly show initial overriden ordering.
            this.options.separateMeta = true;
        }
        if (this.options.selectMultipleRows) {
            this.options.showSelection = true;
        }
        this.ownerCtrl = this.options.ownerCtrl;
        this.meta = {
            pkField: '',
            hasSearch: ko.observable(false),
            // Key: fieldname, value: true: 'asc', false: 'desc'.
            orderBy: {},
            markSafeFields: [],
            strDesc: false,
            verboseName: ko.observable(''),
            verboseNamePlural: ko.observable(''),
        };
        this.actionTypes = {};
        _.each(this.uiActionTypes, function(type) {
            self.actionTypes[type] = ko.observableArray();
        })
        this.gridActions = this.iocGridActions({
            grid: this
        });
        this.sortOrders = {};
        this.selectedRowsPks = [];
        this.gridColumns = ko.observableArray();
        this.totalColumns = ko.computed(function() {
            var totalColumns = this.gridColumns().length + this.actionTypes['glyphicon']().length;
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
        this.gridSearchStr.subscribe(_.bind(this.onGridSearchStr, this));
        this.gridSearchDisplayStr = ko.observable('');
        this.gridSearchDisplayStr.subscribe(_.bind(this.onGridSearchDisplayStr, this));
        this.highlightMode = ko.observable(this.options.highlightMode);
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
            // New single value.
            if (lookup === 'in') {
                this.queryFilters[field] = value;
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
                if (typeof this.queryFilters[field] !== 'object') {
                    // Convert single value into array of values with 'in' lookup.
                    this.queryFilters[field] = {'in': [this.queryFilters[field]]};
                }
                if (_.find(this.queryFilters[field]['in'], function(val) { return val === value; }) === undefined) {
                    // Multiple values: 'field__in' at server-side.
                    this.queryFilters[field]['in'].push(value);
                }
            } else {
                if (typeof this.queryFilters[field] !== 'object') {
                    // Convert single value into array of values with 'in' lookup.
                    this.queryFilters[field] = {'in': [this.queryFilters[field]]};
                }
                this.queryFilters[field][lookup] = value;
            }
        }
    };

    /**
     * Supports multiple values of the field.
     * Supports multiple ORM lookups (gt / lt / etc.) of the field.
     */
    Grid.removeQueryFilter = function(options) {
        var field = options.field;
        var hasValue = typeof options.value !== 'undefined';
        var hasLookup = typeof options.lookup !== 'undefined';
        if (typeof this.queryFilters[field] === 'undefined') {
            return;
        }
        if (!hasLookup) {
            if (hasValue) {
                throw "Set options.lookup to delete specific query filter options.value";
            }
            delete this.queryFilters[field];
            return;
        }
        if (options.lookup === 'in') {
            // Special case of 'in' lookup that may have multiple filter values.
            if (typeof this.queryFilters[field] !== 'object') {
                if (hasValue) {
                    if (this.queryFilters[field] === options.value) {
                        delete this.queryFilters[field];
                    }
                } else {
                    delete this.queryFilters[field];
                }
            } else if (typeof this.queryFilters[field]['in'] !== 'undefined') {
                this.queryFilters[field]['in'] = _.filter(this.queryFilters[field]['in'], function(val) {
                    return val !== options.value;
                });
                var len = this.queryFilters[field]['in'].length;
                if (len === 1) {
                    this.queryFilters[field] = this.queryFilters[field]['in'].pop();
                } else if (len === 0) {
                    delete this.queryFilters[field]['in'];
                    if (_.size(this.queryFilters[field]) === 0) {
                        delete this.queryFilters[field];
                    }
                }
            }
        } else {
            if (typeof this.queryFilters[field] === 'object' &&
                    typeof this.queryFilters[field][options.lookup] !== 'undefined') {
                if (hasValue) {
                    if (this.queryFilters[field][options.lookup] === options.value) {
                        delete this.queryFilters[field][options.lookup];
                    }
                } else {
                    delete this.queryFilters[field][options.lookup];
                }
                if (_.size(this.queryFilters[field]) === 0) {
                    delete this.queryFilters[field];
                }
            }
        }
    };

    // Supported multiple order_by at api level but not in 'ko_grid.htm' templates.
    Grid.setQueryOrderBy = function(orderBy) {
        var prefixedOrders = [];
        _.each(orderBy, function(direction, fieldName) {
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

    Grid.removeAllSelectedPkVals = function() {
        this.selectedRowsPks = [];
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
    Grid.findKoRowByPkVal = function(options) {
        var self = this;
        var pkVal, withKey;
        if (typeof options === 'object') {
            pkVal = options.pkVal;
            withKey = App.propGet(options, 'withKey', false);
        } else {
            pkVal = options;
            withKey = false;
        }
        var intPkVal = App.intVal(pkVal);
        var koRow = null;
        var key = -1;
        _.each(this.gridRows(), function(v, k) {
            var val = v.getValue(self.meta.pkField);
            if (val === pkVal || val === intPkVal) {
                koRow = v;
                key = k;
                return false;
            }
        });
        if (withKey) {
            return {
                'koRow': koRow,
                'key': key
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
        if (!_.isArray(pkVals)) {
            pkVals = [pkVals];
        }
        var intPkVals = [];
        for (var i = 0; i < pkVals.length; i++) {
            intPkVals.push(pkVals[i]);
            var intPkVal = App.intVal(pkVals[i]);
            if (intPkVal !== pkVals[i]) {
                intPkVals.push(intPkVal);
            }
        }
        _.each(this.gridRows(), function(v) {
            var val = v.getValue(self.meta.pkField);
            var isSelected = _.indexOf(intPkVals, val) !== -1;
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
                // Update ui lists of action buttons / menus per row.
                this.setACL(rowToUpdate);
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

    Grid.rowSelect = function(currKoRow) {
        console.log('Grid.rowClick() values: ' + JSON.stringify(currKoRow.values));
        if (this.options.selectMultipleRows) {
            currKoRow.inverseSelection();
        } else {
            var currPkVal = this.selectOnlyKoRow(currKoRow);
        }
    };

    Grid.rowClick = function(currKoRow) {
        this.lastClickedKoRow = currKoRow;
        if (this.getEnabledActions(currKoRow, 'click').length > 1) {
            // Multiple click actions are available. Open row click actions menu.
            this.actionsMenuDialog = this.iocActionsMenuDialog({
                grid: this
            });
            this.actionsMenuDialog.show();
        } else if (this.actionTypes.click().length > 0) {
            this.actionTypes.click()[0].doAction({gridRow: currKoRow});
        } else {
            this.rowSelect(currKoRow);
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
        self.listAction();
    };

    Grid.iocKoGridColumn = function(options) {
        return new App.ko.GridColumnOrder(options);
    };

    // May be used in descendant of App.ko.GridRow() to get metadata of current field.
    Grid.getKoGridColumn = function(fieldName) {
        var result = null;
        _.each(this.gridColumns(), function(gridColumn) {
            if (gridColumn.field === fieldName) {
                result = gridColumn;
                return false;
            }
        });
        return result;
    };

    Grid.setKoGridColumns = function(gridFields) {
        var koGridColumns = [];
        for (var i = 0; i < gridFields.length; i++) {
            var gridColumn = gridFields[i];
            var order = App.propGet(this.meta.orderBy, gridColumn.field, null);
            koGridColumns.push(
                this.iocKoGridColumn({
                    field: gridColumn.field,
                    name: gridColumn.name,
                    isSorted: this.isSortedField(gridColumn.field),
                    order: order,
                    ownerGrid: this
                })
            );
        }
        this.gridColumns(koGridColumns);
    };

    Grid.iocKoFilterChoice = function(options) {
        return new App.ko.GridFilterChoice(options);
    };

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

    Grid.iocKoFilter_fk = function(filter, options) {
        options.fkGridOptions = $.extend(
            this.getFkGridOptions(filter.field),
            {
                selectMultipleRows: filter.multiple_choices,
                showSelection: true
            }
        );
        var filterModel = new App.ko.FkGridFilter(options);
        // Will use App.ko.FkGridFilter to select filter choices.
        return filterModel;
    };

    Grid.iocKoFilter_datetime = function(filter, options) {
        options.type = 'datetime';
        return new App.ko.RangeFilter(options);
    };

    Grid.iocKoFilter_date = function(filter, options) {
        options.type = 'date';
        return new App.ko.RangeFilter(options);
    };

    Grid.iocKoFilter_decimal = function(filter, options) {
        options.type = 'number';
        return new App.ko.RangeFilter(options);
    };

    Grid.iocKoFilter_choices = function(filter, options) {
        var filterModel = new App.ko.GridFilter(options);
        var choices = filter.choices;
        for (var i = 0; i < choices.length; i++) {
            var choice = choices[i];
            var koFilterChoice = this.iocKoFilterChoice({
                ownerFilter: filterModel,
                name: choice.name,
                value: choice.value,
                is_active: (typeof choice.is_active) === 'undefined' ? false : choice.is_active
            })
            if (koFilterChoice.value === null) {
                filterModel.resetFilter = koFilterChoice;
            }
            filterModel.choices.push(koFilterChoice);
        }
        return filterModel;
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
            throw sprintf("Undefined method %s for filter type %s", iocMethod, filter.type);
        }
        return this[iocMethod](filter, options);
    };

    // Get filter model by field name.
    Grid.getKoFilter = function(fieldName) {
        var result = null;
        _.each(this.gridFilters(), function(gridFilter) {
            if (gridFilter.field === fieldName) {
                result = gridFilter;
                return false;
            }
        });
        return result;
    };

    /**
     * Setup filters viewmodels.
     */
    Grid.setKoFilters = function(filters) {
        var gridFilters = [];
        for (var i = 0; i < filters.length; i++) {
            gridFilters.push(
                this.createKoFilter(filters[i])
            );
        }
        this.gridFilters(gridFilters);
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

    Grid.loadMetaCallback = function(data) {
        if (typeof data.actions !== 'undefined') {
            this.gridActions.setActions(data.actions);
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
                // Override grid meta.orderBy via supplied App.ko.Grid() options.
                this.meta.orderBy = this.options.defaultOrderBy;
            }
            this.setKoGridColumns(data.gridFields);
        }
        if (typeof data.filters !== 'undefined') {
            this.setKoFilters(data.filters);
        }
        if (typeof data.markSafe !== 'undefined' && _.isArray(data.markSafe)) {
            this.meta.markSafeFields = data.markSafe;
        }
    };

    Grid.isMarkSafeField = function(fieldName) {
        return _.indexOf(this.meta.markSafeFields, fieldName) !== -1;
    };

    Grid.listCallback = function(data) {
        var self=this;
        if (App.propGet(data, 'has_errors') === true) {
            // There is nothing to list. Additional error viewmodel might be processed instead.
            return;
        }
        // console.log(data);
        // Set grid rows viewmodels.
        var gridRows = [];
        this.totalRowsCount = data.entries.length;
        _.each(data.entries, function(row, k) {
            // Recall previously selected grid rows from this.hasSelectedPkVal().
            if (typeof row[self.meta.pkField] === 'undefined') {
                throw sprintf("Supplied row has no '%s' key", self.meta.pkField);
            }
            var pkVal = row[self.meta.pkField];
            gridRows.push(
                self.iocRow({
                    ownerGrid: self,
                    isSelectedRow: self.hasSelectedPkVal(pkVal),
                    values: row,
                    index: k
                })
            );
        });
        if (App.propGet(data, 'update') === true) {
            for (var i = 0; i < gridRows.length; i++) {
                var newRow = gridRows[i];
                var findResult = this.findKoRowByPkVal({
                    pkVal: newRow.getValue(this.meta.pkField),
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
        // Set grid pagination viewmodels.
        self.setKoPagination(data.totalPages, self.queryArgs.page);
    };

    Grid.iocKoAction = function(options) {
        return new App.ko.Action(options);
    };

    Grid.setKoActionTypes = function(metaActions) {
        var self = this;
        _.each(this.uiActionTypes, function(type) {
            self.actionTypes[type]([]);
        });
        // Do not forget to include all possible types of actions into this list.
        _.each(metaActions, function(actions, actionType) {
            // Built-in actions are invisible to Knockout.js UI and should not be added into self.actionTypes.
            if (actionType !== 'built_in') {
                if (typeof self.actionTypes[actionType] === 'undefined') {
                    throw sprintf('Unknown action type: "%s"', actionType);
                }
                for (var i = 0; i < actions.length; i++) {
                    var actDef = actions[i];
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
     * Can be used to perform specific action programmatically via .doAction() method.
     */
    Grid.getKoAction = function(actionName, actionType) {
        var action = null;
        _.each(this.actionTypes, function(actions, actType) {
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
        this.gridActions.setLastKoAction(koAction);
        this.gridActions.performLastAction(actionOptions);
    };

    // Returns only enabled actions for particular App.ko.GridRow instance of the specified actionType.
    Grid.getEnabledActions = function(koRow, actionType) {
        var enabledActions = [];
        var actions = ko.utils.unwrapObservable(this.actionTypes[actionType]);
        for (var i = 0; i < actions.length; i++) {
            if (koRow.observeEnabledAction(actions[i])()) {
                enabledActions.push(actions[i]);
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
        this.name = this.actDef.name;
        this.localName = this.actDef.localName;
    };

    Action.actionCss = function(type) {
        var koCss = {};
        switch (typeof this.actDef.class) {
        case 'string':
            koCss[this.actDef.class] = true;
            break;
        case 'object':
            if (typeof this.actDef.class[type] !== 'undefined') {
                koCss[this.actDef.class[type]] = true;
            }
        }
        return koCss;
    };

    Action.doAction = function(options, actionOptions) {
        if (typeof actionOptions === 'undefined') {
            actionOptions = {};
        }
        // Check whether this is row action (usually it has 'click' or 'glyphicon' action type),
        // which has gridRow instance passed to options.
        if (typeof options.gridRow !== 'undefined') {
            if (!options.gridRow.observeEnabledAction(this)()) {
                // Current action is disabled for gridRow instance specified.
                return;
            }
            this.grid.lastClickedKoRow = options.gridRow;
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
 * Base class for dialog-based grid filters.
 */
App.FilterDialog = function(options) {
    $.inherit(App.Dialog.prototype, this);
    this.create(options);
};

(function(FilterDialog) {

    FilterDialog.propCall = App.propCall;

    FilterDialog.getButtons = function() {
        var self = this;
        return [{
            id: 'filter_remove_selection',
            label: App.trans('Remove selection'),
            action: function(dialogItself) {
                self.onRemoveSelection();
            }
        },{
            id: 'filter_apply',
            label: App.trans('Apply'),
            action: function(dialogItself) {
                if (self.onApply()) {
                    dialogItself.close();
                }
            }
        }];
    };

    FilterDialog.create = function(options) {
        this.wasOpened = false;
        if (typeof options !== 'object') {
            options = {};
        }
        // Reference to owner component (for example App.ko.FkGridFilter instance).
        this.ownerComponent = options.ownerComponent;
        var dialogOptions = $.extend({
                buttons: this.getButtons()
            }, options
        );
        delete dialogOptions.ownerComponent;
        // Filter options.
        this.filterOptions = $.extend({
                selectMultipleRows: true
            },
            dialogOptions.filterOptions
        );
        delete dialogOptions.filterOptions;
        this._super._call('create', dialogOptions);
    };

    FilterDialog.onApply = function() {
        this.propCall('ownerComponent.onFilterDialogApply', {});
        return true;
    };

    FilterDialog.onRemoveSelection = function() {
        this.propCall('ownerComponent.onFilterDialogRemoveSelection', {});
    };

    FilterDialog.onShow = function() {
        this._super._call('onShow');
        if (this.wasOpened) {
            this.recreateContent();
        }
        ko.applyBindings(this.ownerComponent, this.bdialog.getModal().get(0));
        App.initClient(this.bdialog.getModal());
        this.wasOpened = true;
    };

    FilterDialog.onHide = function() {
        ko.cleanNode(this.bdialog.getModal().get(0));
        App.initClient(this.bdialog.getModal(), 'dispose');
        this._super._call('onHide');
    };

})(App.FilterDialog.prototype);

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
    $.inherit(App.FilterDialog.prototype, this);
    $.inherit(App.Dialog.prototype, this);
    this.create(options);
};

(function(GridDialog) {

    GridDialog.template = 'ko_grid_body';

    GridDialog.onRemoveSelection = function() {
        this.grid.unselectAllRows();
        this.propCall('ownerComponent.onGridDialogUnselectAllRows', {
            'childGrid': this.grid
        });
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
            this.filterOptions,
            options
        );
        if (typeof this.dialogOptions.iocGrid === 'function') {
            return this.dialogOptions.iocGrid(options);
        } else {
            return new App.ko.Grid(options);
        }
    };

    GridDialog.iocGridOwner = function() {
        var grid = this.iocGrid({
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
        var self = this;
        // Inject ko_grid_pagination underscore / knockout.js template into BootstrapDialog modal footer.
        var $footer = this.bdialog.getModalFooter();
        var $gridPagination = App.domTemplate('ko_grid_pagination');
        $footer.prepend($gridPagination);
        if (this.wasOpened) {
            this.recreateContent();
        } else {
            // Apply App.ko.Grid or descendant bindings to BootstrapDialog modal.
            this.grid = this.iocGridOwner();
            this.grid.firstLoad(function() {
                // Select grid rows when there are filter choices set already.
                var filterChoices = self.ownerComponent.getQueryFilter();
                self.grid.selectKoRowsByPkVals(filterChoices);
            });
        }
        this.grid.applyBindings(this.bdialog.getModal());
        this.wasOpened = true;
        this.propCall('ownerComponent.onGridDialogShow', {
            'childGrid': this.grid
        });
    };

    GridDialog.close = function() {
        this._super._call('close');
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

    ModelFormDialog.initClient = true;
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
                            var vm = self.grid.gridActions.getOurViewmodel(response);
                            if (vm === null) {
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
        var dialogOptions = $.extend({
                type: BootstrapDialog.TYPE_PRIMARY,
                buttons: this.getButtons(),
            }, options
        );
        this._super._call('create', dialogOptions);
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
            selectMultipleRows: false,
            showSelection: true
        });
        this.gridDialog = new App.GridDialog({
            ownerComponent: this,
            filterOptions: gridOptions
        });
    };

    FkGridWidget.run = function(element) {
        var self = this;
        this.$element = $(element);
        this.$element.find('.fk-choose').on('click', function(ev) {
            ev.preventDefault();
            self.gridDialog.show();
            return false;
        });
    };

    FkGridWidget.blockTags = App.blockTags.badges;

    FkGridWidget.getQueryFilter = function() {
        var pkVal = this.getInputValue();
        var koRow = this.gridDialog.grid.findKoRowByPkVal(pkVal);
        return (koRow !== null) ? [pkVal] : [];
    };

    FkGridWidget.getInputValue = function() {
        return App.intVal(this.$element.find('.fk-value').val());
    };

    FkGridWidget.setInputValue = function(value) {
        this.$element.find('.fk-value')
            .val(value);
        return this;
    };

    FkGridWidget.setDisplayValue = function(displayValue) {
        var $content = $('<span>');
        App.renderNestedList($content, displayValue, {blockTags: this.blockTags});
        this.$element.find('.fk-display').empty().append($content);
        return this;
    };

    FkGridWidget.onGridDialogSelectRow = function(options) {
        var koRow = options.childGrid.findKoRowByPkVal(options.pkVal);
        this.setInputValue(options.pkVal)
            .setDisplayValue(koRow.getDescParts());
    };

    FkGridWidget.onGridDialogUnselectAllRows = function(options) {
        this.setInputValue('')
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

    ActionsMenuDialog.blockTags = App.blockTags.badges;

    ActionsMenuDialog.renderRow = function() {
        return this.grid.lastClickedKoRow.renderDesc({blockTags: this.blockTags});
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
        this._super._call('create', dialogOptions);
    };

    ActionsMenuDialog.onShow = function() {
        this._super._call('onShow');
        if (this.wasOpened) {
            this.recreateContent();
        }
        this.grid.applyBindings(this.bdialog.getModal());
        this.bdialog.getModalBody().prepend(this.renderRow());
        this.wasOpened = true;
    };

    ActionsMenuDialog.onHide = function() {
        // Clean only grid bindings of this dialog, not invoker bindings.
        this.grid.cleanBindings(this.bdialog.getModal());
        this._super._call('onHide');
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
        this._super._call('create', options);
        ...
    };
 */
App.ActionTemplateDialog = function(options) {
    this.inherit();
    this.create(options);
};

(function(ActionTemplateDialog) {

    ActionTemplateDialog.initClient = true;
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
        this._super._call('create', options);
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

    // Do not remove, otherwise it will cause double binding error in App.ActionsMenuDialog.onShow.
    ActionTemplateDialog.onShow = function() {
        this._super._call('onShow');
    };

})(App.ActionTemplateDialog.prototype);
