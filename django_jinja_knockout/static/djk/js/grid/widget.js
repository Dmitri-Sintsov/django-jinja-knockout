import { propGet } from '../prop.js';
import { getTemplateSubstitution } from '../tpl.js';
import { blockTags } from '../ui.js';
import { renderNestedList } from '../nestedlist.js';
import { GridDialog } from './dialogs.js';

/**
 * Client-side part of widgets.MultipleKeyGridWidget / ForeignKeyGridWidget
 * to select foreign key relationships via GridDialog.
 * Similar to django.admin FilteredSelectMultiple / ForeignKeyRawIdWidget but is Knockout.js driven.
 */
function FkGridWidget(options) {
    this.init(options);
};

void function(FkGridWidget) {

    FkGridWidget.getInputAttrs = function(inputRow, fieldIdIndex) {
        var attrs = $.extend({}, this.attrs);
        if (this.idParts) {
            attrs.id = this.idParts.prefix + this.formsetIndex() + this.idParts.suffix;
        }
        if (this.selectMultipleRows) {
            attrs.id += '_' + fieldIdIndex;
        }
        if (this.nameParts) {
            attrs.name = this.nameParts.prefix + this.formsetIndex() + this.nameParts.suffix;
        } else {
            attrs.name = this.baseName;
        }
        attrs.value = inputRow.pk;
        return attrs;
    };

    FkGridWidget.getEmptyAttrs = function() {
        return this.getInputAttrs({pk: 0});
    };

    FkGridWidget.parseFormsetPrefix = function(val) {
        var parts = val.split('__prefix__', 2);
        return (parts.length === 2) ? {prefix: parts[0], suffix: parts[1]} : false;
    };

    FkGridWidget.init = function(options) {
        var gridOptions = options.fkGridOptions;
        gridOptions.showSelection = true;
        delete options.fkGridOptions;
        this.selectMultipleRows = gridOptions.selectMultipleRows;
        this.baseName = options.name;
        this.nameParts = this.parseFormsetPrefix(options.name);
        this.attrs = options.attrs;
        this.isRequired = options.isRequired;
        this.idParts = this.parseFormsetPrefix(options.attrs.id);
        this.formsetIndex = ko.observable(0);

        this.inputRows = ko.observableArray();
        var initialFkRows;
        if (typeof options.initialFkRows !== 'undefined') {
            initialFkRows = options.initialFkRows;
            delete options.initialFkRows;
        } else {
            initialFkRows = [];
        }
        this.gridDialog = new GridDialog({
            owner: this,
            filterOptions: gridOptions
        });
        if (typeof options.clickActions !== 'undefined') {
            if (this.gridDialog.grid === undefined) {
                this.gridDialog.iocGridOwner();
            }
            this.gridDialog.grid.setKoActionTypes(options.clickActions);
            delete options.clickActions;
        }
        if (initialFkRows.length > 0) {
            if (this.gridDialog.grid === undefined) {
                this.gridDialog.iocGridOwner();
            }
            for (var i = 0; i < initialFkRows.length; i++) {
                var koRow = this.gridDialog.grid.iocRowOwner({
                    isSelectedRow: true,
                    values: initialFkRows[i],
                    index: i
                });
                var inputRow = this.iocInputRow(koRow);
                this.inputRows.push(inputRow);
            }
        }
    };

    FkGridWidget.applyBindings = function(selector) {
        var self = this;
        this.componentSelector = $(selector);
        this.componentSelector.each(function(k, v) {
            ko.applyBindings(self, v);
        });
    };

    FkGridWidget.cleanBindings = function() {
        if (this.componentSelector) {
            this.componentSelector.each(function(k, v) {
                ko.cleanNode(v);
            });
        }
    };

    FkGridWidget.runComponent = function($selector) {
        this.applyBindings($selector);
    };

    FkGridWidget.removeComponent = function($selector) {
        this.gridDialog.removeComponent();
        this.cleanBindings();
    };

    FkGridWidget.getTemplateName = function(templateName) {
        return getTemplateSubstitution(this.componentSelector, templateName);
    };

    FkGridWidget.deleteFk = function(inputRow) {
        this.inputRows.remove(inputRow);
        var fkGrid = this.gridDialog.grid;
        var koRow = fkGrid.findKoRowByPkVal(inputRow.pk);
        if (koRow !== null) {
            koRow.isSelectedRow(false);
        } else {
            fkGrid.removeSelectedPkVal(inputRow.pk);
        }
    };

    FkGridWidget.findInputRowByPkVal = function(pkVal) {
        return ko.utils.arrayFirst(this.inputRows(), function(inputRow) {
            return inputRow.pk === pkVal;
        });
    };

    FkGridWidget.getInputRowDescParts = function(koRow) {
        return koRow.getDescParts();
    };

    // note: "this" is bound to inputRow, not to FkGridWidget.
    FkGridWidget.getInputRowDisplay = function() {
        var $content = $('<div>');
        return renderNestedList(
            $content, this.desc(), {blockTags: blockTags.badges, unwrapTop: true}
        );
    };

    FkGridWidget.iocInputRow = function(koRow) {
        var self = this;
        var inputRow = {
            pk: koRow.getPkVal(),
            desc: ko.observable(this.getInputRowDescParts(koRow)),
            css: {
                'pointer': koRow.getActiveActions('click').length > 0,
            },
            onClick: koRow.onActiveClick.bind(koRow),
            canDelete: propGet(koRow, 'perm.canDeleteFk', true),
        };
        inputRow.display = ko.pureComputed(this.getInputRowDisplay, inputRow);
        inputRow.remove = function() {
            self.deleteFk(inputRow);
        };
        return inputRow;
    };

    FkGridWidget.updateInputRow = function(koRow) {
        var matchingRow = this.findInputRowByPkVal(koRow.getPkVal());
        // not found matchingRow === null in Knockout 3.4, === undefined in Knockout 3.5.
        if (matchingRow) {
            matchingRow.desc(this.getInputRowDescParts(koRow));
        }
    };

    FkGridWidget.onFkButtonClick = function(data, ev) {
        this.gridDialog.show();
    };

    FkGridWidget.onGridDialogRowsChange = function(changes) {
        console.log(changes);
        for (var i = 0; i < changes.length; i++) {
            var change = changes[i];
            if (['modified', 'added'].indexOf(change.status) !== -1) {
                var koRow = change.value;
                this.updateInputRow(koRow);
                break;
            }
        }
    };

    FkGridWidget.onGridDialogSelectRow = function(options) {
        var koRow = options.childGrid.findKoRowByPkVal(options.pkVal);
        var inputRow = this.iocInputRow(koRow);
        if (this.selectMultipleRows) {
            // MultipleKeyGridWidget
            this.inputRows.push(inputRow);
        } else {
            // ForeignKeyGridWidget
            this.inputRows([inputRow]);
        }
    };

    FkGridWidget.onGridDialogUnselectRow = function(options) {
        this.inputRows.remove(function(inputRow) {
            return inputRow.pk === options.pkVal;
        });
    };

    FkGridWidget.onGridDialogUnselectAllRows = function(options) {
    };

}(FkGridWidget.prototype);

export { FkGridWidget };
