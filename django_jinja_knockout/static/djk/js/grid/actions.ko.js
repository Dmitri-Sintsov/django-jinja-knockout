import { inherit } from '../dash.js';

/**
 * Knockout.js models for visual representation of grid action. Used to display / trigger button / iconui actions in templates.
 * Do not confuse with Actions / GridActions which is the abstraction layer for AJAX handling of viewmodel HTTP response.
 */
function KoGridAction(options) {

    this.init(options);

} void function(KoGridAction) {

    KoGridAction.init = function(options) {
        this.grid = options.grid;
        this.actDef = options.actDef;
        this.name = this.actDef.name;
        this.localName = this.actDef.localName;
    };

    KoGridAction.actionCss = function(type) {
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

    KoGridAction.doAction = function(actionOptions) {
        if (typeof actionOptions === 'undefined') {
            actionOptions = {};
        }
        if (this.grid.selectedRowsPks.length > 0) {
            // Multiple rows selected. Add all selected rows pk values.
            actionOptions['pk_vals'] =  this.grid.selectedRowsPks;
        }
        this.grid.performKoAction(this, actionOptions);
    };

    KoGridAction.doForRow = function(gridRow, actionOptions) {
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

    KoGridAction.doLastClickedRowAction = function() {
        if (typeof this.grid.actionsMenuDialog !== 'undefined') {
            this.grid.actionsMenuDialog.close();
            delete this.grid.actionsMenuDialog;
        }
        this.doForRow(this.grid.lastClickedKoRow);
    };

}(KoGridAction.prototype);


function GridRowsPerPageAction(options) {

    inherit(KoGridAction.prototype, this);
    this.init(options);

} void function(GridRowsPerPageAction) {

    GridRowsPerPageAction.init = function(options) {
        this._super._call('init', options);
        this.grid.meta.rowsPerPageRange(this.actDef.range);
        this.grid.meta.rowsPerPageValues([]);
        for (var i = this.actDef.range.min; i <= this.actDef.range.max; i += this.actDef.range.step) {
            this.grid.meta.rowsPerPageValues.push(i);
        }
    };

}(GridRowsPerPageAction.prototype);

export { KoGridAction, GridRowsPerPageAction };
