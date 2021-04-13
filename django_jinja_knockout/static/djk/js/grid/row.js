import { isEqual, each, mapObject, size } from '../lib/underscore-esm.js';
import { recursiveMap } from '../dash.js';
import { propGet } from '../prop.js';
import { initClient } from '../initclient.js';
import { renderNestedList } from '../nestedlist.js';
import { Trans } from '../translate.js';

/**
 * Single row of grid (ko viewmodel).
 */
function GridRow(options) {

    this.init(options);

} void function(GridRow) {

    // By default does not use initClient() for performance reasons.
    GridRow.useInitClient = false;

    // todo: turn off by default and update saved row at whole.
    GridRow.observeDisplayValue = true;

    GridRow.prepare = function() {
        initClient(this.$row);
    };

    GridRow.dispose = function() {
        initClient(this.$row, 'dispose');
    };

    GridRow.getPkVal = function() {
        return this.getValue(this.ownerGrid.meta.pkField);
    };

    GridRow.is = function(gridRow) {
        // .strFields has to be compared because when foreignkey field has modified values of .get_str_fields()
        // such grids should be highlighted as changed.
        return isEqual(this.values, gridRow.values) && isEqual(this.strFields, gridRow.strFields);
    };

    /**
     * Used by Grid.updateKoRows() to find matching rows to update after row saving,
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
            return recursiveMap(displayValue, $.htmlEncode);
        }
    };

    GridRow.getDisplayValue = function(field) {
        if (typeof this.strFields[field] !== 'undefined') {
            return this.strFields[field];
        }
        var related = field.split(/__/).filter(Boolean);
        if (related.length > 1) {
            return propGet(this.strFields, related);
        }
        return undefined;
    };

    /**
     * Low-level access for custom layout templates.
     */
    GridRow.val = function(field) {
        var displayValue = this.getDisplayValue(field);
        return (displayValue === undefined) ? this.getValue(field) : displayValue;
    };

    /**
     * Descendant could format it's own displayValue, including html content.
     */
    GridRow.display = function(field) {
        var value = this.getValue(field);
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
                    displayValue = {true: Trans('Yes'), false: Trans('No')}[value];
                } else if (value === null) {
                    displayValue = Trans('N/A');
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
        var displayValue = this.display(field);
        return this.observeDisplayValue ? ko.observable(displayValue) : displayValue;
    };

    // 'Rendered' (formatted) field values, as displayed by ko_grid_body template bindings.
    GridRow.initDisplayValues = function() {
        var self = this;
        this.displayValues = {};
        // When there are virtual display values, assume empty values, otherwise mapObject() will miss these.
        each(this.strFields, function(displayValue, field) {
            if (typeof self.values[field] === 'undefined') {
                self.values[field] = '';
            }
        });
        this.displayValues = mapObject(this.values, this.wrapDisplayValue.bind(this));
    };

    GridRow.getSelectionCss = function() {
        return {
            'iconui-check': this.isSelectedRow(),
            'iconui-unchecked': !this.isSelectedRow(),
            'pointer': true,
        };
    };

    GridRow.getActiveActions = function(actionType) {
        return this.ownerGrid.getEnabledActions(this, actionType);
    };

    GridRow.getRowCss = function() {
        this.lastRowCss = mapObject(this.lastRowCss, function() {
            return false;
        });
        this.lastRowCss = $.extend(this.lastRowCss, {
            'grid-new-row': this.isUpdated(),
            'pointer': this.getActiveActions('click').length > 0,
        });
        var highlightModeRule = this.ownerGrid.getHighlightModeRule();
        if (highlightModeRule.direction === 1) {
            // Finds foreach $index() inaccessible directly in computed.
            var index = this.ownerGrid.gridRows().indexOf(this);
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
        // Used by FkGridWidget.
        this.perm = {};
        if (typeof this.values['__perm'] !== 'undefined') {
            this.perm = this.values['__perm'];
            delete this.values['__perm'];
        }
        this.initDisplayValues();

        // Permissions should be set after the values are initialized, because custom permissions may use this.values.
        this.actionsACL = {};
        this.ownerGrid.setACL(this);

        // Visual part should be initialized last.
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
        if (this.isSelectedRow()) {
            this.ownerGrid.addSelectedPkVal(this.getPkVal());
        }
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

    GridRow.onActiveClick = function(data, ev) {
        if (this.getActiveActions('click').length > 0) {
            return this.onRowClick(data, ev);
        }
        return false;
    };

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
        each(savedRow.values, function(value, field) {
            self.values[field] = value;
        });
        each(savedRow.strFields, function(value, field) {
            self.strFields[field] = value;
        });
        each(savedRow.displayValues, function(value, field) {
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
        };
        // https://stackoverflow.com/questions/14149551/subscribe-to-observable-array-for-new-or-removed-entry-only
        this.ownerGrid.propCall('ownerCtrl.onChildGridRowsChange', [{
            status: 'modified',
            value: savedRow,
        }]);
    };

    GridRow.getDescParts = function() {
        if (this.ownerGrid.meta.strDesc && this.str !== null) {
            return [this.str];
        }
        if (size(this.strFields) > 0) {
            return this.strFields;
        } else if (this.str !== null) {
            return [this.str];
        }
        // Last resort.
        return [this.getPkVal()];
    };

    GridRow.renderDesc = function(renderOptions) {
        var descParts = this.getDescParts();
        if (size(descParts) === 0) {
            return '';
        }
        var $content = $('<span>');
        return renderNestedList($content, descParts, renderOptions);
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

}(GridRow.prototype);

export { GridRow };
