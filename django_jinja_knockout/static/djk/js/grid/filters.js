import { mixProps, inherit } from '../dash.js';
import { propGet } from '../prop.js';
import { Subscriber } from '../ko.js';
import { Trans } from '../translate.js';

import { FilterDialog, GridDialog } from './dialogs.js';

/**
 * Grid filter choice control. One dropdown filter has multiple filter choices.
 */

function GridFilterChoice(options) {

    this.init(options);

} void function (GridFilterChoice) {

    GridFilterChoice.updateQueryFilter = function(newValue) {
        // undefined value is used to reset filter because null can be valid choice value.
        if (this.value === undefined) {
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
        this.is_active.subscribe(this.updateQueryFilter, this);
        this.is_active(options.is_active);
    };

    GridFilterChoice.setLinkElement = function($element) {
        this.$link = $element;
    };

    GridFilterChoice.onLoadFilter = function(data, ev) {
        this.ownerFilter.switchKoFilterChoices(this, ev);
        this.ownerFilter.ownerGrid.queryArgs.page = 1;
        this.ownerFilter.refreshGrid();
    };

    GridFilterChoice.is = function(filterChoice) {
        return this.$link.is(filterChoice.$link);
    };

}(GridFilterChoice.prototype);

/**
 * Common ancestor of GridFilter and FkGridFilter.
 */

function AbstractGridFilter(options) {

    this.init(options);

} void function(AbstractGridFilter) {

    AbstractGridFilter.templateName = '';

    AbstractGridFilter.init = function(options) {
        this.$dropdown = null;
        this.ownerGrid =  options.ownerGrid;
        this.field = options.field;
        this.name = options.name;
        if (typeof options.templateName !== 'undefined') {
            this.templateName = options.templateName;
        }
        this.hasActiveChoices = ko.observable(false);
        // List of instances of current filter choices.
        this.choices = [];
        // One of this.choices, special 'reset all choice'.
        this.resetFilter = null;
        this.allowMultipleChoices = propGet(options, 'allowMultipleChoices', false);
    };

    AbstractGridFilter.getTemplateName = function() {
        return this.templateName;
    };

    // Called in FilterDialog.onShow().
    AbstractGridFilter.applyBindings = function(selector) {
        var self = this;
        this.selector = $(selector);
        ko.applySelector(this, this.selector);
    };

    AbstractGridFilter.cleanBindings = function() {
        ko.cleanSelector(this, this.selector);
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
        throw new Error('Abstract method');
    };

    AbstractGridFilter.refreshGrid = function(callback) {
        this.ownerGrid.listAction(callback);
    };

}(AbstractGridFilter.prototype);

/**
 * Grid filter control. Contains multiple GridFilterChoice instances or their descendants.
 */

function GridFilter(options) {

    inherit(AbstractGridFilter.prototype, this);
    this.init(options);

} void function(GridFilter) {

    GridFilter.templateName = 'ko_grid_filter_choices';

    GridFilter.init = function(options) {
        this._super._call('init', options);
        for (var i = 0; i < options.choices.length; i++) {
            var choice = options.choices[i];
            var koFilterChoice = this.ownerGrid.iocKoFilterChoice({
                ownerFilter: this,
                name: choice.name,
                value: propGet(choice, 'value'),
                is_active: (typeof choice.is_active) === 'undefined' ? false : choice.is_active
            });
            if (koFilterChoice.value === undefined) {
                this.resetFilter = koFilterChoice;
            }
            this.choices.push(koFilterChoice);
        }
    };

    // Return the count of active filter choices except for special 'reset all choice' (choice.value === undefined).
    // Also initialized this.resetFilter.
    GridFilter.getTotalActive = function() {
        var totalActive = 0;
        this.resetFilter = null;
        for (var i = 0; i < this.choices.length; i++) {
            // undefined value is used to reset filter because null can be valid choice value (GridFilterChoice).
            if (this.choices[i].value === undefined) {
                this.resetFilter = this.choices[i];
            } else if (this.choices[i].is_active()) {
                totalActive++;
            }
        }
        return totalActive;
    };

    GridFilter.activateResetFilter = function() {
        var totalActive = this.getTotalActive();
        if (this.resetFilter !== null) {
            // Check whether all filter choices are active except for 'reset all choice'.
            if (totalActive === this.choices.length - 1) {
                // All choices of the filter are active. Activate (highlight) 'reset all choice' instead.
                for (var i = 0; i < this.choices.length; i++) {
                    if (this.choices[i].value !== undefined) {
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
        if (typeof currentChoice === 'undefined') {
            // Reset filter by default.
            currentChoice = this.resetFilter;
        }
        if (currentChoice.value === undefined) {
            // Special 'all' value, deactivate all filter choices except current one.
            for (var i = 0; i < this.choices.length; i++) {
                this.choices[i].is_active(false);
            }
            currentChoice.is_active(true);
        } else if (!this.allowMultipleChoices) {
            // Switch current filter choice.
            // Turn off all another filter choices.
            for (var i = 0; i < this.choices.length; i++) {
                if (!currentChoice.is(this.choices[i])) {
                    this.choices[i].is_active(false);
                }
            }
            // Allow to select none choices (reset) only if there is reset choice in menu.
            if (this.resetFilter !== null || !currentChoice.is_active()) {
                currentChoice.is_active(!currentChoice.is_active());
            }
            this.activateResetFilter();
        } else {
            // Do not close dropdown for multiple filter choices.
            if (typeof ev !== 'undefined') {
                ev.stopPropagation();
            }
            // Switch current filter choice.
            currentChoice.is_active(!currentChoice.is_active());
            this.activateResetFilter();
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
        }
        return undefined;
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
        for (var i = 0; i < this.choices.length; i++) {
            var koFilterChoice = this.choices[i];
            koFilterChoice.is_active(values.indexOf(koFilterChoice.value) !== -1);
        }
        this.activateResetFilter();
    };

}(GridFilter.prototype);

/**
 * Foreign key grid filter control. Contains dialog with another grid that selects filter values.
 */

function FkGridFilter(options) {

    inherit(AbstractGridFilter.prototype, this);
    this.init(options);

} void function(FkGridFilter) {

    FkGridFilter.templateName = 'ko_grid_filter_popup';

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
        gridDialogOptions = $.extend({
            owner: this,
            filterOptions: options.fkGridOptions
        }, gridDialogOptions);
        this.gridDialog = new GridDialog(gridDialogOptions);
        this._super._call('init', options);
        // Reset filter choice.
        this.choices = undefined;
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
        this.refreshGrid();
    };

    FkGridFilter.onGridDialogUnselectRow = function(options) {
        if (this.allowMultipleChoices) {
            this.removeQueryFilter({
                value: options.pkVal,
                lookup: 'in'
            });
            this.hasActiveChoices(options.childGrid.selectedRowsPks.length > 0);
            this.ownerGrid.queryArgs.page = 1;
            this.refreshGrid();
        }
    };

    FkGridFilter.onGridDialogUnselectAllRows = function(options) {
        this.removeQueryFilter({
            lookup: 'in'
        });
        this.hasActiveChoices(false);
        this.ownerGrid.queryArgs.page = 1;
        this.refreshGrid();
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

}(FkGridFilter.prototype);

/**
 * Range grid filter control. Contains dialog with two scalar fields to select interval of field value.
 * Currently supports DateTimeField, DateField, DecimalField, IntegerField.
 */

function GridRangeFilter(options) {

    inherit(AbstractGridFilter.prototype, this);
    this.init(options);

} void function(GridRangeFilter) {

    GridRangeFilter.templateName = 'ko_grid_filter_popup';

    GridRangeFilter.init = function(options) {
        mixProps(Subscriber.prototype, this);
        this.type = options.type;
        this._super._call('init', options);
        // Reset filter choice.
        this.choices = undefined;
        this.meta = {
            from: Trans('From'),
            to: Trans('To'),
        };
        this.from = ko.observable('');
        this.to = ko.observable('');
        this.subscribeToMethod('from');
        this.subscribeToMethod('to');
        var method = 'getFieldAttrs_' + this.type;
        if (typeof this[method] !== 'function') {
            throw new Error('GridRangeFilter.' + method + ' is not the function');
        }
        this.fieldAttrs = this[method]();
        this.filterDialog = new FilterDialog({
            owner: this,
            title: this.name,
            template: 'ko_range_filter'
        });
    };

    GridRangeFilter.getFieldAttrs_datetime = function() {
        return {
            'class': 'form-control datetime-control',
            'type': 'text'
        };
    };

    GridRangeFilter.getFieldAttrs_date = function() {
        return {
            'class': 'form-control date-control',
            'type': 'text'
        };
    };

    GridRangeFilter.getFieldAttrs_number = function() {
        return {
            'class': 'form-control',
            'type': 'number'
        };
    };

    GridRangeFilter.onDropdownClick = function(ev) {
        this.filterDialog.show();
    };

    GridRangeFilter.onFilterDialogRemoveSelection = function() {
        this.from('');
        this.to('');
        this.hasActiveChoices(false);
    };

    GridRangeFilter.doLookup = function(value, lookup) {
        var self = this;
        // console.log('lookup: ' + lookup);
        this.addQueryFilter({
            'value': value,
            'lookup': lookup
        });
        this.hasActiveChoices(true);
        this.ownerGrid.queryArgs.page = 1;
        this.refreshGrid(function(viewModel) {
            if (typeof self.filterDialog.bdialog !== 'undefined') {
                var applyButton = self.filterDialog.bdialog.getButton('filter_apply');
                if (propGet(viewModel, 'has_errors') === true) {
                    applyButton.disable();
                    self.hasActiveChoices(false);
                } else {
                    applyButton.enable();
                    self.hasActiveChoices(self.from() !== '' || self.to() !== '');
                }
            }
        });
    };

    GridRangeFilter.onFrom = function(value) {
        this.doLookup(value, 'gte');
    };

    GridRangeFilter.onTo = function(value) {
        this.doLookup(value, 'lte');
    };

    GridRangeFilter.setChoices = function(values) {
        if (typeof values.gte !== 'undefined') {
            this.from(values.gte);
        }
        if (typeof values.lte !== 'undefined') {
            this.to(values.lte);
        }
    };

}(GridRangeFilter.prototype);

export { GridFilterChoice, AbstractGridFilter, GridFilter, FkGridFilter, GridRangeFilter };
