import { inherit } from '../dash.js';
import { propCall } from '../prop.js';
import { Trans } from '../translate.js';
import { initClient } from '../initclient.js';
import { components } from '../components.js';
import { componentIoc } from '../ioc.js';
import { ui } from '../ui.js';
import { dialogIoc, Dialog } from '../dialog.js';
import { ActionTemplateDialog } from '../modelform.js';

import { Grid } from '../grid.js';

/**
 * Base class for dialog-based grid filters.
 */
function FilterDialog(options) {

    inherit(Dialog.prototype, this);
    this.create(options);

} void function(FilterDialog) {

    FilterDialog.propCall = propCall;

    FilterDialog.getButtons = function() {
        var self = this;
        if (typeof this.owner !== 'undefined') {
            return [{
                id: 'filter_remove_selection',
                hotkey: 27,
                label: Trans('Remove selection'),
                action: function(dialogItself) {
                    self.onRemoveSelection();
                }
            },{
                id: 'filter_apply',
                hotkey: 13,
                label: Trans('Apply'),
                action: function(dialogItself) {
                    if (self.onApply()) {
                        self.close();
                    }
                }
            }];
        } else {
            return [{
                label: Trans('Close'),
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
        // Reference to owner component (for example FkGridFilter instance).
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
        this.owner.applyBindings(this.bdialog.getModal());
        initClient(this.bdialog.getModal());
        this.wasOpened = true;
    };

    FilterDialog.onHide = function() {
        ko.cleanNode(this.bdialog.getModal().get(0));
        initClient(this.bdialog.getModal(), 'dispose');
        this._super._call('onHide');
    };

}(FilterDialog.prototype);

/**
 * BootstrapDialog that incorporates Grid descendant instance bound to it's content (this.dialog.message).
 *
 * Example of manual invocation:

import { documentReadyHooks } from './document.js';

documentReadyHooks.push(function() {
    var dialog = new GridDialog({
        iocGrid: function(options) {
            options.pageRoute = 'region_grid';
            // options.selectMultipleRows = false;
            return new Grid(options);
        }
    });
    dialog.show();
});

*/

function GridDialog(options) {

    inherit(FilterDialog.prototype, this);
    inherit(Dialog.prototype, this);
    this.create(options);

} void function(GridDialog) {

    GridDialog.template = 'ko_grid_body';

    /**
     * Pass grid options as options.filterOptions argument.
     * Override grid class to custom one by passing options.iocGrid argument.
     */
    GridDialog.create = function(options) {
        this.componentSelector = null;
        this._super._call('create', options);
    };

    GridDialog.runComponent = function($selector) {
        this.componentSelector = $selector;
        this.show();
    };

    GridDialog.removeComponent = function($selector) {
        if (this.grid) {
            this.grid.removeComponent();
        }
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

    GridDialog.onChildGridRowsChange = function(changes) {
        this.propCall('owner.onGridDialogRowsChange', changes);
    };

    GridDialog.iocGrid = function(options) {
        var gridOptions = $.extend(
            this.filterOptions,
            options
        );
        if (typeof gridOptions.classPath === 'string') {
            var gridClass = componentIoc.factory(gridOptions.classPath);
            return new gridClass(gridOptions);
        } else if (typeof this.dialogOptions.iocGrid === 'function') {
            return this.dialogOptions.iocGrid(gridOptions);
        } else if (typeof this.dialogOptions.iocGrid === 'string') {
            var gridClass = componentIoc.factory(this.dialogOptions.iocGrid);
            return new gridClass(gridOptions);
        } else {
            return new Grid(gridOptions);
        }
    };

    GridDialog.iocGridOwner = function() {
        this.grid = this.iocGrid({
            ownerCtrl: this
        });
        this.grid.ownerCtrlSetTitle = function(verboseNamePlural) {
            this.ownerCtrl.setTitle(verboseNamePlural);
        }.bind(this.grid);
    };

    GridDialog.onHide = function() {
        this.grid.cleanBindings();
        this.propCall('owner.onGridDialogHide');
        if (this.componentSelector !== null) {
            delete this.grid;
            delete this.bdialog;
            var desc = components.unbind(this.componentSelector);
            if (typeof desc.event !== 'undefined') {
                components.add(this.componentSelector, desc.event);
            }
        }
    };

    GridDialog.onShow = function() {
        dialogIoc.exec('baseOnShow', null, this);
        var self = this;
        // Inject ko_grid_pagination underscore / knockout.js template into BootstrapDialog modal footer.
        var $footer = this.bdialog.getModalFooter();
        $footer.find('button').addClass('m-1');
        if (ui.version === 4) {
            $footer.wrapInner('<div class="row m-1"></div>');
        }
        var $gridPagination = this.iocTemplateProcessor().domTemplate('ko_grid_pagination');
        // $gridPagination = $gridPagination.wrapAll('<div class="pagination-wrap"></div>').parent();
        $footer.prepend($gridPagination);
        if (this.wasOpened) {
            this.recreateContent();
        } else {
            // FkGridWidget may already instantiate grid, in case options.initialFkRows are supplied.
            if (!this.grid) {
                // Apply Grid or descendant bindings to BootstrapDialog modal.
                this.iocGridOwner();
            }
            this.gridRowsSubscription = this.grid.ownerRowsChange();
            this.grid.firstLoad(function() {
                // Select grid rows when there are filter choices set already.
                var filterChoices = self.propCall('owner.getQueryFilter');
                if (filterChoices !== null) {
                    self.grid.selectKoRowsByPkVals(filterChoices);
                }
            });
        }
        this.grid.applyBindings(this.bdialog.getModal());
        this.wasOpened = true;
        this.propCall('owner.onGridDialogShow', {
            'childGrid': this.grid
        });
    };

    GridDialog.close = function() {
        this.gridRowsSubscription.dispose();
        this._super._call('close');
        this.propCall('owner.onGridDialogClose');
    };

}(GridDialog.prototype);

/**
 * BootstrapDialog displayed when grid row is clicked and multiple 'click' actions are defined.
 * .owner is the instance of .Grid.
 */
function ActionsMenuDialog(options) {

    this.inherit();
    this.create(options);

} void function(ActionsMenuDialog) {

    ActionsMenuDialog.templateId = 'ko_grid_row_click_menu';

    ActionsMenuDialog.inherit = function() {
        // Import methods of direct ancestor.
        inherit(ActionTemplateDialog.prototype, this);
        // Import methods of base class that are missing in direct ancestor.
        inherit(Dialog.prototype, this);
    };

    ActionsMenuDialog.getButtons = function() {
        var self = this;
        return [{
            label: Trans('Cancel'),
            hotkey: 27,
            action: function(dialogItself) {
                self.close();
            }
        }];
    };

    ActionsMenuDialog.ownerOnCreate = function(options) {
        options.title = Trans('Choose action');
        options.actionLabel = options.title;
    };

}(ActionsMenuDialog.prototype);

export { FilterDialog, GridDialog, ActionsMenuDialog };
