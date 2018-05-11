'use strict';

Vue.directive('grid-row', {
    inserted: function (element, binding, vnode) {
        var koGridRow = binding.value;
        koGridRow.setRowElement($(element));
    },
    update: function(element, binding, vnode, oldVnode) {
        if (vnode !== oldVnode) {
            var koGridRow = binding.value;
            koGridRow.setRowElement($(element));
        }
    },
});

Vue.directive('grid-filter', {
    inserted: function (element, koGridFilter, vnode) {
        koGridFilter.setDropdownElement($(element));
    },
    update: function(element, koGridFilter, vnode, oldVnode) {
        if (vnode !== oldVnode) {
            koGridFilter.setDropdownElement($(element));
        }
    },
});

Vue.directive('grid-filter-choice', {
    inserted: function (element, koGridFilterChoice, vnode) {
        koGridFilterChoice.setLinkElement($(element));
    },
    update: function(element, koGridFilterChoice, vnode, oldVnode) {
        if (vnode !== oldVnode) {
            koGridFilterChoice.setLinkElement($(element));
        }
    },
});

// Supports jQuery elements / nested arrays / objects / HTML strings as grid cell value.
Vue.directive('grid-row-values', {
    inserted: function (element, binding, vnode) {
        var ctrlGridColumn = binding.value.column.ctrl;
        ctrlGridColumn.render({
            $element: $(element),
            row: binding.value.row,
        });
    },
    update: function(element, binding, vnode, oldVnode) {
        if (vnode !== oldVnode) {
            var ctrlGridColumn = binding.value.column.ctrl;
            ctrlGridColumn.render({
                $element: $(element),
                row: binding.value.row,
            });
        }
    },
});

Vue.component('grid-column-header', {
    template: '#grid-column-header',
    props: ['column'],
    data: function() {
        return {
            ctrl: null,
        }
    },
    created: function() {
        // https://github.com/vuejs/vue/issues/6052
        this.$parent.ctrl.iocKoGridColumn(this);
    },
    computed: {
        columnCss: function() {
            return this.ctrl.getColumnCss();
        },
        names: function() {
            return this.ctrl.getNames();
        },
    }
});


Vue.component('grid-column-order', {
    template: '#grid-column-order',
    props: ['columnOrder'],
    data: function() {
        return {
            ctrl: null,
        }
    },
    directives: {
        'grid-order-by': {
            inserted: function (element, binding, vnode) {
                var ctrlGridColumnOrder = binding.value.ctrl;
                ctrlGridColumnOrder.setSwitchElement($(element));
            },
            update: function(element, binding, vnode, oldVnode) {
                if (vnode !== oldVnode) {
                    var ctrlGridColumnOrder = binding.value.ctrl;
                    ctrlGridColumnOrder.setSwitchElement($(element));
                }
            },
        },
    },
    created: function() {
        // https://github.com/vuejs/vue/issues/6052
        this.$parent.$parent.ctrl.iocKoGridColumnOrder(this);
    },
    computed: {
        orderCss: function() {
            return this.columnOrder.ctrl.getOrderCss();
        },
    },
    methods: {
        onSwitchOrder: function(vm) {
            return this.columnOrder.ctrl.onSwitchOrder();
        },
    }
});


/**
 * Grid column ordering control.
 */

App.ko.GridColumnOrder = function(vueComponent) {
    this.init(vueComponent);
};

void function(GridColumnOrder) {

    GridColumnOrder.init = function(vueComponent) {
        this.ownerGrid = vueComponent.$parent.$parent.ctrl;
        // todo: check whether dynamic update of .columnOrder is possible.
        this.vm = vueComponent.columnOrder;
        this.vm.ctrl = this;
        this.$switch = null;
        // this.field = options.field;
        // this.name = options.name;
        // this.order = options.order;
        // this.isSortedColumn = options.isSorted;
    };

    GridColumnOrder.getOrderCss = function() {
        return {
            'display-block': true,
            'sort-inactive': this.vm.order === null,
            'sort-asc': this.vm.order === '+',
            'sort-desc': this.vm.order === '-'
        };
    };

    GridColumnOrder.setSwitchElement = function($element) {
        this.$switch = $element;
    };

    GridColumnOrder.is = function(anotherOrder) {
        return this.vm.field === anotherOrder.vm.field;
    };

    GridColumnOrder.onSwitchOrder = function() {
        this.ownerGrid.deactivateAllSorting(this);
        if (this.vm.order === '+') {
            this.vm.order = '-';
        } else {
            // this.vm.order === null || this.vm.order === '-'
            this.vm.order = '+';
        }
        var orderBy = {};
        orderBy[this.vm.field] = this.vm.order;
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
            var nestedListOptions = $.extend(
                {
                    blockTags: this.blockTags,
                    fn: 'html',
                    /**
                     * Will try to use field name as a key prefix first,
                     * falling back to non-prefixed field names when missing.
                     *
                     * This avoids related fields name clashes when two different related models has the same field name
                     * (eg. 'category') but a different 'verbose_name'.
                     */
                    keyPrefix: this.field,
                },
                this.ownerGrid.vm.meta.fkNestedListOptions
            );
            App.renderNestedList(element, value, nestedListOptions);
        } else {
            // Warning: make sure string is escaped!
            // Primarily use is to display server-side formatted strings (Djano local date / currency format).
            $(element).html(value);
        }
    };

}(App.ko.GridColumnOrder.prototype);


/**
 * Compound column which contains one or more of App.ko.GridColumnOrder instances.
 */

App.ko.GridColumn = function(vueComponent) {
    this.init(vueComponent);
};


void function(GridColumn) {

    GridColumn.init = function(vueComponent) {
        this.ownerGrid = vueComponent.$parent.ctrl;
        this.vm = vueComponent.column;
        this.vm.ctrl = this;
        this.lastColumnCss = {};
        // this.columnCss = ko.computed(this.getColumnCss, this);
        // this.names = ko.computed(this.getNames, this);
    };

    GridColumn.blockTags = App.blockTags.list;

    GridColumn.getColumnCss = function() {
        this.lastColumnCss = _.mapObject(this.lastColumnCss, function() {
            return false;
        });
        var highlightModeRule = this.ownerGrid.getHighlightModeRule();
        if (highlightModeRule.direction === 0) {
            // Finds foreach $index() inaccessible directly in computed.
            var index = this.ownerGrid.vm.gridColumns.indexOf(this.vm);
            this.lastColumnCss = $.extend(this.lastColumnCss, this.ownerGrid.getCycleCss(index));
        }
        return this.lastColumnCss;
    };

    GridColumn.getNames = function() {
        var names = [];
        _.find(this.vm.columnOrders, function(columnOrder) {
            names.push(columnOrder.name);
        });
        return names.join(' / ');
    };

    GridColumn.getOrders_i18n = function() {
        var i18n = {};
        _.find(this.vm.columnOrders, function(columnOrder) {
            i18n[columnOrder.field] = columnOrder.name;
        });
        return i18n;
    };

    GridColumn.getColumnOrder = function(fieldName) {
        var result = null;
        _.find(this.vm.columnOrders, function(columnOrder) {
            if (columnOrder.field === fieldName) {
                result = columnOrder.ctrl;
                return true;
            }
        });
        return result;
    };

    GridColumn.deactivateAllSorting = function(exceptOrderCtrl) {
        _.each(this.vm.columnOrders, function(columnOrder) {
            if (!columnOrder.ctrl.is(exceptOrderCtrl)) {
                columnOrder.order = null;
            }
        });
    };

    GridColumn.getCompoundCells = function(gridRow) {
        var cells = [];
        _.map(this.vm.columnOrders, function(columnOrder) {
            var $container = $('<div>', {
                'class': 'grid-cell',
                'data-caption': columnOrder.name,
            });
            columnOrder.ctrl.renderRowValue(
                $container[0], gridRow.displayValues[columnOrder.field]
            );
            cells.push(
                _.odict(columnOrder.field, $container)
            );
        });
        return cells;
    };

    GridColumn.renderCompound = function($element, cells) {
        App.renderNestedList($element, cells, {
            blockTags: this.blockTags,
            fn: 'html',
            showKeys: true,
            i18n: this.getOrders_i18n(),
        });
    };

    GridColumn.render = function(options) {
        options.$element.empty();
        var cells = this.getCompoundCells(options.row);
        if (cells.length === 1) {
            options.$element.append(cells[0].v);
        } else if (cells.length > 1) {
            this.renderCompound(options.$element, cells);
        }
    };

}(App.ko.GridColumn.prototype);


/**
 * Grid filter choice control. One dropdown filter has multiple filter choices.
 */

App.ko.GridFilterChoice = function(options) {
    this.init(options);
};

void function (GridFilterChoice) {

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
        this.is_active.subscribe(_.bind(this.updateQueryFilter, this));
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

}(App.ko.GridFilterChoice.prototype);

/**
 * Common ancestor of App.ko.GridFilter and App.ko.FkGridFilter.
 */

App.ko.AbstractGridFilter = function(options) {
    this.init(options);
};

void function(AbstractGridFilter) {

    AbstractGridFilter.init = function(options) {
        this.$dropdown = null;
        this.ownerGrid =  options.ownerGrid;
        this.field = options.field;
        this.name = options.name;
        this.hasActiveChoices = ko.observable(false);
        // List of instances of current filter choices.
        this.choices = [];
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

    AbstractGridFilter.refreshGrid = function(callback) {
        this.ownerGrid.listAction(callback);
    };

}(App.ko.AbstractGridFilter.prototype);

/**
 * Grid filter control. Contains multiple App.ko.GridFilterChoice instances or their descendants.
 */

App.ko.GridFilter = function(options) {
    $.inherit(App.ko.AbstractGridFilter.prototype, this);
    this.init(options);
};

void function(GridFilter) {

    GridFilter.init = function(options) {
        this._super._call('init', options);
        for (var i = 0; i < options.choices.length; i++) {
            var choice = options.choices[i];
            var koFilterChoice = this.ownerGrid.iocKoFilterChoice({
                ownerFilter: this,
                name: choice.name,
                value: App.propGet(choice, 'value'),
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
            // undefined value is used to reset filter because null can be valid choice value (App.ko.GridFilterChoice).
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
        };
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
        this.activateResetFilter();
        for (var i = 0; i < values.length; i++) {
            var koFilterChoice = this.getKoFilterChoice(values[i]);
            if (koFilterChoice !== undefined) {
                this.switchKoFilterChoices(koFilterChoice);
            }
        }
    };

}(App.ko.GridFilter.prototype);

/**
 * Foreign key grid filter control. Contains dialog with another grid that selects filter values.
 */

App.ko.FkGridFilter = function(options) {
    $.inherit(App.ko.AbstractGridFilter.prototype, this);
    this.init(options);
};

void function(FkGridFilter) {

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
            owner: this,
            filterOptions: options.fkGridOptions
        }, gridDialogOptions);
        this.gridDialog = new App.GridDialog(gridDialogOptions);
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

}(App.ko.FkGridFilter.prototype);

/**
 * Range grid filter control. Contains dialog with two scalar fields to select interval of field value.
 * Currently supports DateTimeField, DateField, DecimalField, IntegerField.
 */

App.ko.RangeFilter = function(options) {
    $.inherit(App.ko.AbstractGridFilter.prototype, this);
    this.init(options);
};

void function(RangeFilter) {

    RangeFilter.init = function(options) {
        $.inherit(App.vue.Subscriber.prototype, this);
        this.type = options.type;
        this._super._call('init', options);
        // Reset filter choice.
        this.choices = undefined;
        this.meta = {
            from: App.trans('From'),
            to: App.trans('To'),
        };
        this.from = ko.observable('');
        this.to = ko.observable('');
        this.subscribeToMethod('from');
        this.subscribeToMethod('to');
        var method = 'getFieldAttrs_' + this.type;
        if (typeof this[method] !== 'function') {
            throw 'App.ko.RangeFilter.' + method + ' is not the function';
        }
        this.fieldAttrs = this[method]();
        this.filterDialog = new App.FilterDialog({
            owner: this,
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
        this.refreshGrid(function(viewModel) {
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

}(App.ko.RangeFilter.prototype);

/**
 * Single row of grid (ko viewmodel).
 */
App.ko.GridRow = function(options) {
    this.init(options);
};

void function(GridRow) {

    // By default do not use App.initClient() for performance reasons.
    GridRow.useInitClient = false;

    // todo: turn off by default and update saved row at whole.
    GridRow.observeDisplayValue = true;

    GridRow.prepare = function() {
        App.initClient(this.$row);
    };

    GridRow.dispose = function() {
        App.initClient(this.$row, 'dispose');
    };

    GridRow.getPkVal = function() {
        return this.getValue(this.ownerGrid.vm.meta.pkField);
    };

    GridRow.is = function(gridRow) {
        // .strFields has to be compared because when foreignkey field has modified values of .get_str_fields()
        // such grids should be highlighted as changed.
        return _.isEqual(this.values, gridRow.values) && _.isEqual(this.strFields, gridRow.strFields);
    };

    /**
     * Used by App.ko.Grid.updateKoRows() to find matching rows to update after row saving,
     * for example in 'save_form' or 'save_inline' actions callbacks.
     * Some complex grids with LEFT JOIN's may have the same pk value (usually null) which require custom rules
     * to match which row was modified. In such case override this method in a child class.
     */
    GridRow.matchesPk = function(gridRow) {
        return this.getPkVal() === gridRow.getPkVal();
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
            return _.recursiveMap(displayValue, $.htmlEncode);
        }
    };

    GridRow.getDisplayValue = function(field) {
        if (typeof this.strFields[field] !== 'undefined') {
            return this.strFields[field];
        }
        var related = field.split(/__/).filter(Boolean);
        if (related.length > 1) {
            return App.propGet(this.strFields, related);
        }
        return undefined;
    };

    // Descendant could format it's own displayValue, including html content.
    GridRow.toDisplayValue = function(value, field) {
        var displayValue;
        var markSafe = this.ownerGrid.isMarkSafeField(field);
        // Automatic server-side formatting.
        displayValue = this.getDisplayValue(field);
        if (displayValue === undefined || displayValue === null) {
            var fieldRelated = field.match(/(.+)_id$/);
            if (fieldRelated !== null) {
                markSafe = this.ownerGrid.isMarkSafeField(fieldRelated[1]);
                displayValue = this.getDisplayValue(fieldRelated[1]);
            }
            if (displayValue === undefined || displayValue === null) {
                if (typeof value === 'boolean') {
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
            }
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
            'glyphicon-unchecked': !this.isSelectedRow(),
            'pointer': true,
        };
    };

    GridRow.getRowCss = function() {
        this.lastRowCss = _.mapObject(this.lastRowCss, function() {
            return false;
        });
        this.lastRowCss = $.extend(this.lastRowCss, {
            'grid-new-row': this.isUpdated(),
            'pointer': this.ownerGrid.vm.actionTypes['click'].length > 0,
        });
        var highlightModeRule = this.ownerGrid.getHighlightModeRule();
        if (highlightModeRule.direction === 1) {
            // Finds foreach $index() inaccessible directly in computed.
            var index = this.ownerGrid.vm.gridRows.indexOf(this);
            this.lastRowCss = $.extend(this.lastRowCss, this.ownerGrid.getCycleCss(index));
        }
        return this.lastRowCss;
    };

    GridRow.init = function(options) {
        var self = this;
        this.ownerGrid = options.ownerGrid;
        if (this.ownerGrid.options.useInitClient !== null) {
            this.useInitClient = this.ownerGrid.options.useInitClient;
        }
        this.index = options.index;
        this.isSelectedRow = ko.observable(options.isSelectedRow);
        this.selectionCss = ko.computed(this.getSelectionCss, this);
        this.isUpdated = ko.observable(
            (typeof options.isUpdated === 'undefined') ? false : options.isUpdated
        );
        this.lastRowCss = {};
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
        if (this.isSelectedRow()) {
            this.ownerGrid.addSelectedPkVal(this.getPkVal());
        }
        this.actionsACL = {};
        this.ownerGrid.setACL(this);
    };

    GridRow.getValue = function(field) {
        return typeof this.values[field] === 'undefined' ? undefined : this.values[field];
    };

    GridRow.getActionOptions = function() {
        return {'pk_val': this.getPkVal()};
    };

    GridRow.inverseSelection = function() {
        this.isSelectedRow(!this.isSelectedRow());
    };

    GridRow.ignoreRowClickClosest = 'A, BUTTON, INPUT, OPTION, SELECT, TEXTAREA';

    GridRow.onRowClick = function(data, ev) {
        if ($(ev.target).closest(this.ignoreRowClickClosest).length > 0) {
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
            var val = ko.utils.unwrapObservable(value);
            if (ko.isObservable(self.displayValues[field])) {
                self.displayValues[field](val);
            } else {
                self.displayValues[field] = val;
            }
            // self.displayValues[field].valueHasMutated();
        });
        if (this.useInitClient) {
            // Init updated row.
            this.prepare();
        }
    };

    GridRow.getDescParts = function() {
        if (this.ownerGrid.vm.meta.strDesc && this.str !== null) {
            return [this.str];
        }
        if (_.size(this.strFields) > 0) {
            return this.strFields;
        } else if (this.str !== null) {
            return [this.str];
        }
        // Last resort.
        return [this.getPkVal()];
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

    GridRow.executeAction = function(actionName, options) {
        var action = this.ownerGrid.getKoAction(actionName);
        if (action === null) {
            return;
        }
        action.doForRow(this, options);
    };

}(App.ko.GridRow.prototype);

/**
 * Pagination link ko model.
 */
App.ko.GridPage = function(options) {
    this.init(options);
};

void function(GridPage) {

    GridPage.init = function(options) {
        this.ownerGrid = options.ownerGrid;
        this.isActive = options.isActive;
        this.title = options.title,
        this.pageNumber = options.pageNumber;
    };

    GridPage.onPagination = function() {
        this.ownerGrid.onPagination(this.pageNumber);
    };

}(App.ko.GridPage.prototype);

/**
 * Actions performed for particular grid (row) instance.
 * Mostly are row-click AJAX actions, although not limited to.
 * .owner is the instance of App.ko.Grid.
 */
App.GridActions = function(options) {
    $.inherit(App.Actions.prototype, this);
    this.init(options);
};

void function(GridActions) {

    GridActions.actionKwarg = 'action';
    GridActions.viewModelName = 'grid_page';

    GridActions.init = function(options) {
        this._super._call('init', options);
        // Compatibility alias. Also it has more precise meaning.
        this.grid = this.owner;
    };

    /**
     * Sample action. Actual actions are configured at server-side and populated via AJAX response
     * in App.ko.Grid.listCallback() when data.meta was received from remote host, during first execution
     * of 'list' command.
     */
    GridActions.getActions = function() {
        return {
            'delete': {
                'localName': App.trans('Remove'),
                'type': 'glyphicon',
                'glyph': 'remove',
                'enabled': false
            }
        };
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

    GridActions.perform_rows_per_page = function(queryArgs, ajaxCallback) {
        this.grid.lastClickedKoRow = undefined;
        var dialog = new App.ActionTemplateDialog({
            // initClient: true,
            template: 'ko_grid_rows_per_page_dialog',
            owner: this.grid,
            buttons: [
                {
                    icon: 'glyphicon glyphicon-ok',
                    label: App.trans('Ok'),
                    hotkey: 27,
                    cssClass: 'btn-success',
                    action: function(bdialog) {
                        bdialog._owner.close();
                    }
                },
            ]
        });
        dialog.show();
    };

    GridActions.perform_switch_highlight = function(queryArgs, ajaxCallback) {
        this.grid.onSwitchHighlight();
    };

    GridActions.callback_create_form = function(viewModel) {
        viewModel.owner = this.grid;
        var dialog = new App.ModelFormDialog(viewModel);
        dialog.show();
    };

    GridActions.callback_create_inline = function(viewModel) {
        this.callback_create_form(viewModel);
    };

    GridActions.blockTags = App.blockTags.badges;

    /**
     * Get rendering options with localized / verbose model field names, including nested relationships
     * to use these with current grid row data in actions dialog.
     */
    GridActions.getNestedListOptions = function() {
        // todo: Check related fields name clash (disambiguation).
        var options = $.extend(
            true,
            {blockTags: this.blockTags},
            this.grid.vm.meta.fkNestedListOptions,
            this.grid.vm.meta.listOptions
        );
        return options;
    };

    /**
     * Issued as the confirmation dialog for two-stages actions, such as select one or many grid rows
     * then perform something with these, for example deletion.
     */
    GridActions.renderDescription = function(viewModel, dialogType) {
        viewModel.message = $('<div>');
        App.renderNestedList(
            viewModel.message, viewModel.description, this.getNestedListOptions()
        );
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
        var result = $.extend(options, this.grid.getListQueryArgs());
        return result;
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

}(App.GridActions.prototype);

/**
 * AJAX Grid powered by Knockout.js.
 *
 * To display custom-formatted field values, one has to inherit
 * from App.ko.Grid to override App.ko.Grid.iocRow() and
 * from App.ko.GridRow to override App.ko.GridRow.initDisplayValues().
 *
 * To implement custom client-side actions (such as multiple grids interaction) one has to inherit
 * from App.ko.Grid to override App.ko.Grid.iocGridActions() and
 * from App.GridActions / App.Actions to setup custom .perform_* / .callback_* / .queryargs_* methods.
 *
 */

App.ko.Grid = function(options) {
    this.init(options);
};

void function(Grid) {

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
        this.vm.$set(
            this.vm.meta,
            'searchPlaceholder',
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
        var queryArgs = {firstLoad: 1};
        if (this.options.separateMeta) {
            /**
             * this.options.separateMeta == true is required when 'list' action queryArgs / queryFilters depends
             * on result of 'meta' action. For example that is true for grids with advanced allowed_filter_fields
             * values of dict type: see views.GridActionxMixin.vm_get_filters().
             */
            this.actions.perform('meta', queryArgs, function(viewmodel) {
                if (self.options.defaultOrderBy !== null) {
                    // Override 'list' action AJAX queryargs ordering.
                    self.setQueryOrderBy(self.options.defaultOrderBy);
                }
                self.actions.perform('list', queryArgs, function(viewmodel) {
                    self.onFirstLoad();
                    if (typeof callback === 'function') {
                        callback(queryArgs);
                    }
                });
            });
        } else {
            // Save a bit of HTTP traffic by default.
            this.actions.perform('meta_list', queryArgs, function(viewmodel) {
                self.onFirstLoad();
                if (typeof callback === 'function') {
                    callback(queryArgs);
                }
            });
        }
    };

    Grid.onFirstLoad = function() {
        this.propCall('ownerCtrl.onChildGridFirstLoad');
    };

    Grid.runComponent = function(element) {
        this.applyBindings(element);
        this.firstLoad();
    };

    Grid.removeComponent = function(element) {
        // todo: implement
    };

    Grid.applyBindings = function(selector) {
        var $selector = $(selector);
        this.vm.$mount($selector.get(0));
    };

    Grid.cleanBindings = function(selector) {
        var $selector = $(selector);
        this.vm.$destroy();
    };

    Grid.iocGridActions = function(options) {
        return new App.GridActions(options);
    };

    Grid.onGridSearchStr = function(newValue) {
        this.searchSubstring(newValue);
    };

    Grid.onGridSearchDisplayStr = function(newValue) {
        this.vm.gridSearchStr = newValue;
    };

    Grid.on_meta_rowsPerPage = function(newValue) {
        this.actions.perform('list');
    };

    Grid.onSwitchHighlight = function(data, ev) {
        var self = this;
        var nextRuleIdx = this.getHighlightRuleIdx() + 1;
        if (nextRuleIdx >= this.options.highlightModeRules.length) {
            nextRuleIdx = 0;
        }
        var nextRule = this.options.highlightModeRules[nextRuleIdx];
        for (var k in nextRule) {
            if (nextRule.hasOwnProperty(k)) {
                this.vm.highlightMode = k;
                break;
            }
        }
    };

    Grid.onSelectAllRows = function(data, ev) {
        var selectAllRows = !this.hasSelectAllRows;
        for (var i = 0; i < this.vm.gridRows.length; i++) {
            var koRow = this.vm.gridRows[i];
            koRow.isSelectedRow(selectAllRows);
        }
        return false;
    };

    // this.meta is the list of visual ko bindings which are formatting flags or messages, not model values.
    Grid.updateMeta = function(data) {
        this.vm.meta = Object.assign({}, this.vm.meta, data);
    };

    Grid.getVmData = function() {
        var vmData = {
            // Observable meta.
            meta: {
                hasSearch: false,
                // ko.: this.vm.meta.rowsPerPage.extend({ rateLimit: 500 });
                rowsPerPage: this.options.rowsPerPage,
                rowsPerPageRange: {},
                rowsPerPageValues: [],
                verboseName: '',
                verboseNamePlural: '',
            },
            hasSelectAllRows: false,
            gridColumns: [],
            actionTypes: {},
            gridFilters: [],
            gridRows: [],
            gridPages: [],
            gridTotalPages: 0,
            gridSearchStr: '',
            gridSearchDisplayStr: '',
            highlightMode: this.options.highlightMode,
        };
        this.uiActionTypes.forEach(function(type) {
            vmData.actionTypes[type] = [];
        }, this);
        return vmData;
    };

    Grid.uiActionTypes = ['button', 'button_footer', 'pagination', 'click', 'glyphicon'];

    Grid.init = function(options) {
        $.inherit(App.vue.Subscriber.prototype, this);
        var self = this;
        this.options = $.extend({
            alwaysShowPagination: true,
            ajaxParams: {},
            // Overrides this.vm.meta.orderBy value when not null.
            defaultOrderBy: null,
            fkGridOptions: {},
            highlightMode: 'cycleRows',
            // Currently available highlight directions:
            //   0 - do not highlight,
            //   1 - highlight columns,
            //   2 - highlight rows,
            highlightModeRules: [
                {
                    'none': {
                        direction: null,
                        header: '',
                        cycler: [],
                    }
                },
                {
                    'cycleColumns': {
                        direction: 0,
                        header: 'info',
                        cycler: ['warning', ''],
                    },
                },
                {
                    'cycleRows': {
                        direction: 1,
                        header: 'info',
                        cycler: ['warning', ''],
                    },
                },
                {
                    'linearRows': {
                        direction: 1,
                        header: '',
                        cycler: ['linear-white'],
                    }
                },
            ],
            rowsPerPage: 10,
            searchPlaceholder: null,
            selectMultipleRows: false,
            separateMeta: false,
            showSelection: false,
            switchHighlight: true,
            ownerCtrl: null,
            pageRoute: null,
            pageRouteKwargs: {},
            // By default will use App.ko.GridRow.useInitClient = false value:
            useInitClient : null,
        }, options);
        if (this.options.defaultOrderBy !== null) {
            // Requires  separate 'meta' action to properly show initial overriden ordering.
            this.options.separateMeta = true;
        }
        if (this.options.selectMultipleRows) {
            this.options.showSelection = true;
        }
        this.ownerCtrl = this.options.ownerCtrl;
        this.vm = new Vue({
            data: this.getVmData(),
            created: function() {
                this.ctrl = self;
                // Non-observable meta.
                this.meta = Object.assign(this.meta, {
                    fkNestedListOptions: {},
                    listOptions: {},
                    pkField: '',
                    // Key: fieldname, value: true: 'asc', false: 'desc'.
                    orderBy: {},
                    markSafeFields: [],
                    prevRowsPerPage: this.ctrl.options.rowsPerPage,
                    strDesc: false,
                });
            },
            computed: {
                glyphiconColumns: function() {
                    return (this.actionTypes['glyphicon'].length === 0) ? 0 : 1
                },
                totalColumns: function() {
                    var totalColumns = this.gridColumns.length + this.glyphiconColumns;
                    if (this.ctrl.options.showSelection) {
                        totalColumns++;
                    }
                    return totalColumns;
                },
                headerCss: function() { return this.ctrl.getHeaderCss() },
                selectAllRowsCss: function() { return this.ctrl.getSelectAllRowsCss() },
            },
            watch: {
                gridSearchStr: function(newVal, oldVal) { return this.ctrl.onGridSearchStr(newVal) },
                gridSearchDisplayStr: function(newVal, oldVal) { return this.ctrl.onGridSearchDisplayStr(newVal) },
            },
        });
        this.actions = this.iocGridActions({
            owner: this,
            route: this.options.pageRoute,
            routeKwargs: this.options.pageRouteKwargs,
        });
        this.sortOrders = {};
        this.selectedRowsPks = [];
        this.lastHeaderCss = {};
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

    Grid.getHighlightRuleIdx = function() {
        var currMode = this.vm.highlightMode;
        for (var i = 0; i < this.options.highlightModeRules.length; i++) {
            var ruleDef = this.options.highlightModeRules[i];
            if (typeof ruleDef[currMode] !== 'undefined') {
                return i;
            }
        }
        return 0;
    };

    Grid.getHighlightModeRule = function() {
        var ruleIdx = this.getHighlightRuleIdx();
        var ruleDef = this.options.highlightModeRules[ruleIdx];
        for (var k in ruleDef) {
            if (ruleDef.hasOwnProperty(k)) {
                return ruleDef[k];
            }
        }
    };

    Grid.isSortedField = function(field) {
        return typeof this.sortOrders[field] !== 'undefined';
    };

    Grid.getCycleCss = function(seqIdx) {
        var css = {};
        var cycler = this.getHighlightModeRule().cycler;
        if (seqIdx >= 0) {
            for (var i = 0; i < cycler.length; i++) {
                css[cycler[i]] = ((seqIdx % cycler.length) === i);
            }
        }
        return css;
    }

    Grid.getHeaderCss = function() {
        this.lastHeaderCss = _.mapObject(this.lastHeaderCss, function() {
            return false;
        });
        var highlightModeRule = this.getHighlightModeRule();
        this.lastHeaderCss[highlightModeRule.header] = true;
        return this.lastHeaderCss;
    };

    Grid.getSelectAllRowsCss = function() {
        return {
            'glyphicon-check': this.hasSelectAllRows,
            'glyphicon-unchecked': !this.hasSelectAllRows,
            'pointer': true,
        };
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
            // New single scalar / single array value.
            if (_.isArray(value)) {
                if (lookup !== 'in') {
                    throw sprintf(
                        "Array value '%s' requires lookup type 'in', given lookup type='%s'",
                        JSON.stringify(value),
                        lookup
                    );
                }
            }
            if (lookup === 'in') {
                if (_.isArray(value)) {
                    this.queryFilters[field] = {'in': value};
                } else {
                    this.queryFilters[field] = value;
                }
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
                if ($.isScalar(this.queryFilters[field])) {
                    // Convert single value into array of values with 'in' lookup.
                    this.queryFilters[field] = {'in': [this.queryFilters[field]]};
                }
                if (_.find(this.queryFilters[field]['in'], function(val) { return val === value; }) === undefined) {
                    // Multiple values: 'field__in' at server-side.
                    this.queryFilters[field]['in'].push(value);
                }
            } else {
                if ($.isScalar(this.queryFilters[field])) {
                    // Convert single value into array of values with 'in' lookup.
                    this.queryFilters[field] = {'in': [this.queryFilters[field]]};
                }
                this.queryFilters[field][lookup] = value;
            }
        }
    };

    /**
     * Supports multiple values of the field.
     * Supports multiple ORM lookups (gt / lt / etc.) for each field.
     */
    Grid.removeQueryFilter = function(options) {
        var self = this;
        var field = options.field;
        var hasValue = typeof options.value !== 'undefined';
        var hasLookup = typeof options.lookup !== 'undefined';
        if (hasValue && _.isArray(options.value)) {
            var opt = $.extend({}, options);
            _.each(options.value, function(val) {
                opt.value = val;
                self.removeQueryFilter(opt);
            });
            return;
        }
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
            if ($.isScalar(this.queryFilters[field])) {
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
            if (!$.isScalar(this.queryFilters[field]) &&
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
            throw sprintf("Supplied row has no '%s' key", this.vm.meta.pkField);
        }
        for (var i = 0; i < this.selectedRowsPks.length; i++) {
            if (this.selectedRowsPks[i] === pkVal) {
                return true;
            }
        }
        return false;
    };

    Grid.checkAllRowsSelected = function() {
        var result = true;
        $.each(this.vm.gridRows, function(k, koRow) {
            if (!koRow.isSelectedRow()) {
                result = false;
                return false;
            }
        });
        return result;
    };

    Grid.addSelectedPkVal = function(pkVal) {
        if (this.options.selectMultipleRows) {
            if (!this.hasSelectedPkVal(pkVal)) {
                this.selectedRowsPks.push(pkVal);
            }
        } else {
            this.selectedRowsPks = [pkVal];
        }
        this.hasSelectAllRows = this.checkAllRowsSelected();
    };

    Grid.removeSelectedPkVal = function(pkVal) {
        if (pkVal === undefined) {
            throw sprintf("Supplied row has no '%s' key", this.vm.meta.pkField);
        }
        this.selectedRowsPks = _.filter(this.selectedRowsPks, function(val) {
            return val !== pkVal;
        });
        this.hasSelectAllRows = this.checkAllRowsSelected();
    };

    Grid.removeAllSelectedPkVals = function() {
        this.selectedRowsPks = [];
        this.hasSelectAllRows = false;
    };

    Grid.propCall = App.propCall;

    /**
     * Called from child row when the row is selected.
     */
    Grid.onSelectRow = function(koRow) {
        var pkVal = koRow.getPkVal();
        this.addSelectedPkVal(pkVal);
        this.propCall('ownerCtrl.onChildGridSelectRow', pkVal);
    };

    /**
     * Called from child row when the row is unselected.
     */
    Grid.onUnselectRow = function(koRow) {
        var pkVal = koRow.getPkVal();
        this.removeSelectedPkVal(pkVal);
        this.propCall('ownerCtrl.onChildGridUnselectRow', pkVal);
    };

    Grid.findMatchingPkRow = function(savedRow) {
        var koRow = null;
        _.find(this.vm.gridRows, function(v) {
            if (v.matchesPk(savedRow)) {
                koRow = v;
                return true;
            }
        });
        return koRow;
    };

    /**
     * Find App.ko.GridRow instance in this.vm.gridRows by row pk value.
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
        var intPkVal = $.intVal(pkVal);
        var koRow = null;
        var key = -1;
        $.each(this.vm.gridRows, function(k, v) {
            var val = v.getPkVal();
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
            var intPkVal = $.intVal(pkVals[i]);
            if (intPkVal !== pkVals[i]) {
                intPkVals.push(intPkVal);
            }
        }
        _.each(this.vm.gridRows, function(v) {
            var val = v.getPkVal();
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
        // this.removeSelectedPkVal(koRow.getPkVal());
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
        _.each(this.vm.gridRows, function(koRow) {
            koRow.isUpdated(isUpdated);
        });
    };

    /**
     * Adds new grid rows from raw viewmodel rows supplied.
     *  newRows - list of raw rows supplied from server-side.
     *  opcode - operation to perform on this.vm.gridRows, usually 'push' or 'unshift'.
     */
    Grid.addKoRows = function(newRows, opcode) {
        if (typeof opcode === 'undefined') {
            opcode = 'push';
        }
        for (var i = 0; i < newRows.length; i++) {
            this.vm.gridRows[opcode](this.iocRow({
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
        for (var i = 0; i < savedRows.length; i++) {
            var pkVal = savedRows[i][this.vm.meta.pkField];
            var savedGridRow = this.iocRow({
                ownerGrid: this,
                isSelectedRow: this.hasSelectedPkVal(pkVal),
                isUpdated: true,
                values: savedRows[i]
            });
            if (typeof this.lastClickedKoRow !== 'undefined' &&
                    this.lastClickedKoRow.matchesPk(savedGridRow)) {
                this.lastClickedKoRow.update(savedGridRow);
            }
            var rowToUpdate = this.findMatchingPkRow(savedGridRow);
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
            var pkVal = $.intVal(pks[i]);
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
        // Delete first, because append / prepend may add rows with the same keys (refresh the same rows).
        if (typeof viewModel.deleted_pks !== 'undefined') {
            this.deleteKoRows(viewModel.deleted_pks);
        }
        if (typeof viewModel.append_rows !== 'undefined') {
            this.addKoRows(viewModel.append_rows);
        }
        if (typeof viewModel.prepend_rows !== 'undefined') {
            this.addKoRows(viewModel.prepend_rows, 'unshift');
        }
        if (typeof viewModel.update_rows !== 'undefined') {
            this.updateKoRows(viewModel.update_rows);
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
        var currPkVal = currKoRow.getPkVal();
        // Unselect all rows except current one.
        _.each(this.gridRows(), function(koRow) {
            if (koRow.getPkVal() !== currPkVal) {
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
                owner: this
            });
            this.actionsMenuDialog.show();
        } else if (this.actionTypes.click.length > 0) {
            this.actionTypes.click[0].doForRow(currKoRow);
        } else {
            this.rowSelect(currKoRow);
        }
        /*
            if (this.actions.has('edit_formset')) {
                this.actions.perform('edit_formset', {'pk_vals': this.selectedRowsPks});
            }
            if (this.actions.has('edit_form')) {
                this.actions.perform('edit_form', {'pk_val': currPkVal});
            }
        */
    };

    Grid.deactivateAllSorting = function(exceptOrder) {
        this.vm.gridColumns.forEach(function(gridColumn) {
            gridColumn.ctrl.deactivateAllSorting(exceptOrder);
        }, this);
    };

    Grid.searchSubstring = function(s) {
        if (typeof s !== 'undefined') {
            this.vm.gridSearchStr = s;
        }
        this.queryArgs.page = 1;
        this.listAction();
    };

    Grid.iocKoGridColumn = function(vueComponent) {
        return new App.ko.GridColumn(vueComponent);
    };

    Grid.iocKoGridColumnOrder = function(vueComponent) {
        return new App.ko.GridColumnOrder(vueComponent);
    };

    // May be used in descendant of App.ko.GridRow() to get metadata of current field.
    Grid.getKoGridColumn = function(fieldName) {
        var result = null;
        _.find(this.vm.gridColumns, function(gridColumn) {
            var columnOrder = gridColumn.getColumnOrder(fieldName);
            if (columnOrder !== null) {
                result = {
                    column: gridColumn,
                    order: columnOrder,
                };
                return true;
            }
        });
        return result;
    };

    Grid.setKoGridColumns = function(gridFields) {
        var vueGridColumns = [];
        for (var i = 0; i < gridFields.length; i++) {
            if (!_.isArray(gridFields[i])) {
                gridFields[i] = [gridFields[i]];
            }
            var gridColumnOrders = gridFields[i];
            var vueGridColumnOrders = [];
            for (var j = 0; j < gridColumnOrders.length; j++) {
                var gridColumn = gridColumnOrders[j];
                var order = App.propGet(this.vm.meta.orderBy, gridColumn.field, null);
                vueGridColumnOrders.push({
                    field: gridColumn.field,
                    name: gridColumn.name,
                    isSorted: this.isSortedField(gridColumn.field),
                    // '+' means 'asc', '-' means 'desc', null means unsorted.
                    order: order,
                });
            }
            vueGridColumns.push({
                columnOrders: vueGridColumnOrders
            });
        }
        this.vm.gridColumns = vueGridColumns;
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
        // Will use App.ko.FkGridFilter to select filter choices.
        return {cls: App.ko.FkGridFilter, options: options};
    };

    Grid.iocKoFilter_datetime = function(filter, options) {
        options.type = 'datetime';
        return {cls: App.ko.RangeFilter, options: options};
    };

    Grid.iocKoFilter_date = function(filter, options) {
        options.type = 'date';
        return {cls: App.ko.RangeFilter, options:options};
    };

    Grid.iocKoFilter_number = function(filter, options) {
        options.type = 'number';
        return {cls: App.ko.RangeFilter, options: options};
    };

    Grid.iocKoFilter_choices = function(filter, options) {
        options.choices = filter.choices;
        return {cls: App.ko.GridFilter, options: options};
        var filterModel = new App.ko.GridFilter(options);
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
        var iocResult = this[iocMethod](filter, options);
        return new iocResult.cls(iocResult.options);
    };

    // Get filter model by field name.
    Grid.getKoFilter = function(fieldName) {
        var result = null;
        _.find(this.vm.gridFilters, function(gridFilter) {
            if (gridFilter.field === fieldName) {
                result = gridFilter;
                return true;
            }
        });
        return result;
    };

    /**
     * Setup filters viewmodels (grid initial loading stage).
     */
    Grid.setupKoFilters = function(filters) {
        var gridFilters = [];
        for (var i = 0; i < filters.length; i++) {
            gridFilters.push(
                this.createKoFilter(filters[i])
            );
        }
        this.gridFilters = gridFilters;
    };

    /**
     * Setup multiple choices for multiple filters for already loaded grid then list data.
     * Can be used in overloaded .onFirstLoad() method to setup initial filters.
     */
    Grid.setFiltersChoices = function(filterChoices, listActionCallback ) {
        var self = this;
        var foundFilters = 0;
        _.each(filterChoices, function(choices, filterName) {
            var filter = self.getKoFilter(filterName);
            if (filter !== null) {
                foundFilters++;
                filter.setChoices(choices);
            }
        });
        if (foundFilters > 0) {
            var listActionArgs = [];
            if (typeof listActionCallback === 'function') {
                listActionArgs.push(listActionCallback);
            }
            this.listAction.apply(this, listActionArgs);
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
        /**
         * Update queryArgs.page value because current page number may be recalculated
         * when vm.meta.rowsPerPage value was changed.
         */
        this.queryArgs.page = currPage;
        this.vm.gridPages = [];
        this.vm.gridTotalPages = totalPages;
        var maxVisiblePages = 5;
        var hasFoldingPage = false;
        var startingPage = currPage - maxVisiblePages;
        if (startingPage < 1) {
            startingPage = 1;
        }
        self.vm.gridPages.push(
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
                self.vm.gridPages.push(
                    this.iocGridPage({
                        'isActive': (i === currPage),
                        'title': '...',
                        'pageNumber':  i
                    })
                );
                hasFoldingPage = true;
                i = totalPages;
            }
            self.vm.gridPages.push(
                this.iocGridPage({
                    'isActive': (i === currPage),
                    'title': i,
                    'pageNumber':  i
                })
            );
        }
        self.vm.gridPages.push(
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
        this.queryArgs[this.queryKeys.search] = this.vm.gridSearchStr;
        this.queryArgs[this.queryKeys.filter] = JSON.stringify(this.queryFilters);
        this.queryArgs['rows_per_page'] = this.vm.meta.rowsPerPage;
        if (this.queryArgs['rows_per_page'] !== this.vm.meta.prevRowsPerPage) {
            this.queryArgs['prev_rows_per_page'] = this.vm.meta.prevRowsPerPage;
        }
        return this.queryArgs;
    };

    Grid.listAction = function(callback) {
        this.actions.perform('list', {}, callback);
    };

    Grid.loadMetaCallback = function(data) {
        if (typeof data.actions !== 'undefined') {
            this.actions.setActions(data.actions);
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
                this.vm.meta.orderBy = this.options.defaultOrderBy;
            }
            this.setKoGridColumns(data.gridFields);
        }
        if (typeof data.filters !== 'undefined') {
            this.setupKoFilters(data.filters);
        }
        if (typeof data.markSafe !== 'undefined' && _.isArray(data.markSafe)) {
            this.vm.meta.markSafeFields = data.markSafe;
        }
    };

    Grid.isMarkSafeField = function(fieldName) {
        return _.indexOf(this.vm.meta.markSafeFields, fieldName) !== -1;
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
            if (typeof row[self.vm.meta.pkField] === 'undefined') {
                throw sprintf("Supplied row has no '%s' key", self.vm.meta.pkField);
            }
            var pkVal = row[self.vm.meta.pkField];
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
                    pkVal: newRow.getPkVal(),
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
            self.vm.gridRows = gridRows;
        }
        this.hasSelectAllRows = this.checkAllRowsSelected();
        // Temporarily disable vm.meta.rowsPerPage subscription.
        this.disposeMethod(['meta', 'rowsPerPage']);
        this.vm.meta.prevRowsPerPage = this.vm.meta.rowsPerPage;
        this.vm.meta.rowsPerPage = data.rowsPerPage;
        // Re-enable vm.meta.rowsPerPage subscription.
        this.subscribeToMethod(['meta', 'rowsPerPage']);
        // Set grid pagination viewmodels.
        this.setKoPagination(data.totalPages, data.page);
    };

    Grid.iocKoAction = function(options) {
        var classPath = App.propGet(options.actDef, 'classPath', 'App.ko.Action');
        return new App.newClassFromPath(classPath, [options]);
    };

    Grid.setKoActionTypes = function(metaActions) {
        var self = this;
        this.uiActionTypes.forEach(function(type) {
            this.vm.actionTypes[type] = [];
        }, this);
        // Do not forget to include all possible types of actions into this list.
        _.each(metaActions, function(actions, actionType) {
            // Built-in actions are invisible to Knockout.js UI and should not be added into self.vm.actionTypes.
            if (actionType !== 'built_in') {
                if (typeof self.vm.actionTypes[actionType] === 'undefined') {
                    throw sprintf('Unknown action type: "%s"', actionType);
                }
                for (var i = 0; i < actions.length; i++) {
                    var actDef = actions[i];
                    if (typeof actDef.enabled === 'undefined') {
                        actDef.enabled = true;
                    }
                    if (actDef.enabled) {
                        self.vm.actionTypes[actionType].push(Grid.iocKoAction({
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
     * Can be used to perform grid-wide action programmatically via .doAction(),
     * row-specific action via .doForRow() methods.
     */
    Grid.getKoAction = function(actionName, actionType) {
        var action = null;
        $.each(this.vm.actionTypes, function(actType, actions) {
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
        this.actions.setLastKoAction(koAction);
        this.actions.performLastAction(actionOptions);
    };

    // Returns only enabled actions for particular App.ko.GridRow instance of the specified actionType.
    Grid.getEnabledActions = function(koRow, actionType) {
        var enabledActions = [];
        var actions = this.vm.actionTypes[actionType];
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
    Grid.getLastPkVal = function() {
        return this.lastClickedKoRow.getPkVal();
    };

    Grid.modelFormAction = function(response) {
        var vm = this.actions.getOurViewmodel(response);
        if (vm === null) {
            /**
             * If response has no our grid viewmodel (this.actions.viewModelName), then it's a form viewmodel errors
             * response which will be processed by App.AjaxForm.submit().
             */
            return true;
        } else {
            this.actions.respond(
                this.actions.lastActionName,
                response
            );
            // Do not process viewmodel response, because we already processed it here.
            return false;
        }
    };

    Grid.getLastActionLocalName = function() {
        return this.actions.lastKoAction.localName;
    };

    Grid.onActionTemplateDialogCreate = function(dialog, options) {
        /**
         * Update meta (display text) for bound ko template (this.templateId).
         * This may be used to invoke the same dialog with different messages
         * for similar yet different actions.
         */
        if (typeof options.meta !== 'undefined') {
            this.updateMeta(options.meta);
            delete options.meta;
        }
        options.title = this.getLastActionLocalName();
        options.actionLabel = options.title;
    };

    Grid.onActionTemplateDialogShow = function(dialog) {
        /**
         * Render current row object description in multiple actions menu when there are more than one 'click' type
         * actions for the current grid row.
         */
        if (typeof this.lastClickedKoRow !== 'undefined') {
            var actionHeading = this.lastClickedKoRow.renderDesc(
                this.actions.getNestedListOptions()
            );
            dialog.bdialog.getModalBody().prepend(actionHeading);
        }
    };

}(App.ko.Grid.prototype);

/**
 * Visual representation of grid action. Should be used to display / trigger button / glyphicon actions.
 * Do not confuse with App.Actions / App.GridActions which is the abstraction layer for AJAX handling of viewmodels.
 */
App.ko.Action = function(options) {
    this.init(options);
};

void function(Action) {

    Action.init = function(options) {
        this.grid = options.grid;
        this.actDef = options.actDef;
        this.name = this.actDef.name;
        this.localName = this.actDef.localName;
    };

    Action.actionCss = function(type) {
        var koCss = {};
        switch (typeof this.actDef.css) {
        case 'string':
            koCss[this.actDef.css] = true;
            break;
        case 'object':
            if (typeof this.actDef.css[type] !== 'undefined') {
                koCss[this.actDef.css[type]] = true;
            }
        }
        return koCss;
    };

    Action.doAction = function(actionOptions) {
        if (typeof actionOptions === 'undefined') {
            actionOptions = {};
        }
        if (this.grid.selectedRowsPks.length > 0) {
            // Multiple rows selected. Add all selected rows pk values.
            actionOptions['pk_vals'] =  this.grid.selectedRowsPks;
        }
        this.grid.performKoAction(this, actionOptions);
    };

    Action.doForRow = function(gridRow, actionOptions) {
        if (typeof actionOptions === 'undefined') {
            actionOptions = {};
        }
        if (gridRow.observeEnabledAction(this)()) {
            this.grid.lastClickedKoRow = gridRow;
            // Clicked row pk value ('pkVal').
            actionOptions = $.extend(actionOptions, gridRow.getActionOptions());
            this.doAction(actionOptions);
        }
    };

    Action.doLastClickedRowAction = function() {
        if (typeof this.grid.actionsMenuDialog !== 'undefined') {
            this.grid.actionsMenuDialog.close();
            delete this.grid.actionsMenuDialog;
        }
        this.doForRow(this.grid.lastClickedKoRow);
    };

}(App.ko.Action.prototype);


App.ko.RowsPerPageAction = function(options) {
    $.inherit(App.ko.Action.prototype, this);
    this.init(options);
};

void function(RowsPerPageAction) {

    RowsPerPageAction.init = function(options) {
        this._super._call('init', options);
        this.grid.vm.meta.rowsPerPageRange = this.actDef.range;
        this.grid.vm.meta.rowsPerPageValues = [];
        for (var i = this.actDef.range.min; i <= this.actDef.range.max; i += this.actDef.range.step) {
            this.grid.vm.meta.rowsPerPageValues.push(i);
        }
    };

}(App.ko.RowsPerPageAction.prototype);


/**
 * Base class for dialog-based grid filters.
 */
App.FilterDialog = function(options) {
    $.inherit(App.Dialog.prototype, this);
    this.create(options);
};

void function(FilterDialog) {

    FilterDialog.propCall = App.propCall;

    FilterDialog.getButtons = function() {
        var self = this;
        if (typeof this.owner !== 'undefined') {
            return [{
                id: 'filter_remove_selection',
                hotkey: 27,
                label: App.trans('Remove selection'),
                action: function(dialogItself) {
                    self.onRemoveSelection();
                }
            },{
                id: 'filter_apply',
                hotkey: 13,
                label: App.trans('Apply'),
                action: function(dialogItself) {
                    if (self.onApply()) {
                        self.close();
                    }
                }
            }];
        } else {
            return [{
                label: App.trans('Close'),
                hotkey: 27,
                action: function(dialogItself) {
                    self.close();
                }
            }];
        }
    };

    FilterDialog.create = function(options) {
        this.wasOpened = false;
        if (typeof options !== 'object') {
            options = {};
        }
        // Reference to owner component (for example App.ko.FkGridFilter instance).
        this.owner = options.owner;
        delete options.owner;
        // Filter options.
        this.filterOptions = $.extend({
                selectMultipleRows: typeof this.owner !== 'undefined'
            },
            options.filterOptions
        );
        delete options.filterOptions;
        this._super._call('create', options);
    };

    FilterDialog.onApply = function() {
        this.propCall('owner.onFilterDialogApply', {});
        return true;
    };

    FilterDialog.onRemoveSelection = function() {
        this.propCall('owner.onFilterDialogRemoveSelection', {});
    };

    FilterDialog.onShow = function() {
        this._super._call('onShow');
        if (this.wasOpened) {
            this.recreateContent();
        }
        ko.applyBindings(this.owner, this.bdialog.getModal().get(0));
        App.initClient(this.bdialog.getModal());
        this.wasOpened = true;
    };

    FilterDialog.onHide = function() {
        ko.cleanNode(this.bdialog.getModal().get(0));
        App.initClient(this.bdialog.getModal(), 'dispose');
        this._super._call('onHide');
    };

}(App.FilterDialog.prototype);

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

void function(GridDialog) {

    GridDialog.template = 'ko_grid_body';

    GridDialog.create = function(options) {
        this.componentElement = null;
        this._super._call('create', options);
    };

    GridDialog.runComponent = function(elem) {
        this.componentElement = elem;
        this.show();
    };

    GridDialog.removeComponent = function(elem) {
        // todo: implement
    };

    GridDialog.onRemoveSelection = function() {
        this.grid.unselectAllRows();
        this.propCall('owner.onGridDialogUnselectAllRows', {
            'childGrid': this.grid
        });
    };

    GridDialog.onChildGridFirstLoad = function() {
        this.propCall('owner.onGridDialogFirstLoad', {
            'childGrid': this.grid
        });
    };

    GridDialog.onChildGridSelectRow = function(pkVal) {
        console.log('pkVal: ' + JSON.stringify(pkVal));
        this.propCall('owner.onGridDialogSelectRow', {
            'pkVal': pkVal,
            'childGrid': this.grid
        });
    };

    GridDialog.onChildGridUnselectRow = function(pkVal) {
        console.log('pkVal: ' + JSON.stringify(pkVal));
        this.propCall('owner.onGridDialogUnselectRow', {
            'pkVal': pkVal,
            'childGrid': this.grid
        });
    };

    GridDialog.iocGrid = function(options) {
        var options = $.extend(
            this.filterOptions,
            options
        );
        if (typeof options.classPath === 'string') {
            var gridClass = App.getClassFromPath(options.classPath);
            return new gridClass(options);
        } else if (typeof this.dialogOptions.iocGrid === 'function') {
            return this.dialogOptions.iocGrid(options);
        } else if (typeof this.dialogOptions.iocGrid === 'string') {
            var gridClass = App.getClassFromPath(this.dialogOptions.iocGrid);
            return new gridClass(options);
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
        this.propCall('owner.onGridDialogHide');
        if (this.componentElement !== null) {
            delete this.grid;
            delete this.bdialog;
            var desc = App.components.unbind(this.componentElement);
            if (typeof desc.event !== 'undefined') {
                App.components.add(this.componentElement, desc.event);
            }
        }
    };

    GridDialog.onShow = function() {
        var self = this;
        // Inject ko_grid_pagination underscore / knockout.js template into BootstrapDialog modal footer.
        var $footer = this.bdialog.getModalFooter();
        var $gridPagination = this.iocTemplateProcessor().domTemplate('ko_grid_pagination');
        $footer.prepend($gridPagination);
        if (this.wasOpened) {
            this.recreateContent();
        } else {
            // Apply App.ko.Grid or descendant bindings to BootstrapDialog modal.
            this.grid = this.iocGridOwner();
            this.grid.firstLoad(function() {
                // Select grid rows when there are filter choices set already.
                var filterChoices = self.propCall('owner.getQueryFilter');
                self.grid.selectKoRowsByPkVals(filterChoices);
            });
        }
        this.grid.applyBindings(this.bdialog.getModal());
        this.wasOpened = true;
        this.propCall('owner.onGridDialogShow', {
            'childGrid': this.grid
        });
    };

    GridDialog.close = function() {
        this._super._call('close');
        this.propCall('owner.onGridDialogClose');
    };

}(App.GridDialog.prototype);

/**
 * Client-side part of widgets.ForeignKeyGridWidget to select foreign key via App.GridDialog.
 * Much similar to django.admin ForeignKeyRawIdWidget but is Knockout.js driven.
 */
App.FkGridWidget = function(options) {
    this.init(options);
};

void function(FkGridWidget) {

    FkGridWidget.init = function(options) {
        var gridOptions = $.extend(options, {
            selectMultipleRows: false,
            showSelection: true
        });
        this.gridDialog = new App.GridDialog({
            owner: this,
            filterOptions: gridOptions
        });
    };

    FkGridWidget.runComponent = function(element) {
        var self = this;
        this.$element = $(element);
        this.$element.find('.fk-choose').on('click', function(ev) {
            ev.preventDefault();
            self.gridDialog.show();
            return false;
        });
    };

    FkGridWidget.removeComponent = function(element) {
        // todo: implement
    };

    FkGridWidget.blockTags = App.blockTags.badges;

    FkGridWidget.getQueryFilter = function() {
        var pkVal = this.getInputValue();
        var koRow = this.gridDialog.grid.findKoRowByPkVal(pkVal);
        return (koRow !== null) ? [pkVal] : [];
    };

    FkGridWidget.getInputValue = function() {
        return $.intVal(this.$element.find('.fk-value').val());
    };

    FkGridWidget.setInputValue = function(value) {
        this.$element.find('.fk-value')
            .val(value);
        return this;
    };

    /**
     * Issued when the user choses grid row to display selected foreign key value in field's widget.
     */
    FkGridWidget.setDisplayValue = function(displayValue) {
        var $content = $('<span>');
        var nestedListOptions = $.extend(
            {
                blockTags: this.blockTags,
            },
            this.gridDialog.grid.vm.meta.listOptions
        );
        App.renderNestedList($content, displayValue, nestedListOptions);
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

}(App.FkGridWidget.prototype);

/**
 * BootstrapDialog displayed when grid row is clicked and multiple 'click' actions are defined.
 * .owner is the instance of App.ko.Grid.
 */
App.ActionsMenuDialog = function(options) {
    this.inherit();
    this.create(options);
};

void function(ActionsMenuDialog) {

    ActionsMenuDialog.templateId = 'ko_grid_row_click_menu';

    ActionsMenuDialog.inherit = function() {
        // Import methods of direct ancestor.
        $.inherit(App.ActionTemplateDialog.prototype, this);
        // Import methods of base class that are missing in direct ancestor.
        $.inherit(App.Dialog.prototype, this);
    };

    ActionsMenuDialog.getButtons = function() {
        var self = this;
        return [{
            label: App.trans('Cancel'),
            hotkey: 27,
            action: function(dialogItself) {
                self.close();
            }
        }];
    };

    ActionsMenuDialog.ownerOnCreate = function(options) {
        options.title = App.trans('Choose action');
        options.actionLabel = options.title;
    };

}(App.ActionsMenuDialog.prototype);
