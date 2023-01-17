import { inherit } from '../dash.js';
import { Trans } from '../translate.js';
import { Actions } from '../actions.js';
import { renderNestedList } from '../nestedlist.js';
import { blockTags, ui } from '../ui.js';
import { ModelFormDialog, ActionTemplateDialog } from '../modelform.js';

/**
 * ViewModel actions performed for particular grid (row) instance.
 * Mostly are row-click AJAX actions, although not limited to.
 * .owner is the instance of Grid.
 */
function GridActions(options) {

    inherit(Actions.prototype, this);
    this.init(options);

} void function(GridActions) {

    GridActions.actionKwarg = 'action';
    GridActions.viewModelName = 'grid_page';

    GridActions.init = function(options) {
        this._super._call('init', options);
        // Compatibility alias. Also it has more precise meaning.
        this.grid = this.owner;
    };

    /**
     * Sample action. Actual actions are configured at server-side and populated via AJAX response
     * in Grid.listCallback() when data.meta was received from remote host, during first execution
     * of 'list' command.
     */
    GridActions.getActions = function() {
        return {
            'delete': {
                'localName': Trans('Remove'),
                'type': 'iconui',
                'glyph': 'remove',
                'enabled': false
            }
        };
    };

    // Set last action name from the visual action instance supplied.
    // koAction: instance of Action - visual representation of action in knockout template.
    GridActions.setLastKoAction = function(koAction) {
        this.lastKoAction = koAction;
        // Do not remove this property, because it may be overridden separately via AJAX call result in this.respond().
        this.lastActionName = koAction.name;
    };

    // Perform last action.
    GridActions.performLastAction = function(actionOptions) {
        this.lastActionOptions = actionOptions;
        this.perform(this.lastActionName, actionOptions);
    };

    GridActions.perform_rows_per_page = function(queryArgs, ajaxCallback) {
        this.grid.lastClickedKoRow = undefined;
        var dialog = new ActionTemplateDialog({
            // initClient: true,
            template: 'ko_grid_rows_per_page_dialog',
            owner: this.grid,
            buttons: [
                {
                    icon: 'iconui iconui-ok',
                    label: Trans('Ok'),
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
        var dialog = new ModelFormDialog(viewModel);
        dialog.show();
    };

    GridActions.callback_create_inline = function(viewModel) {
        this.callback_create_form(viewModel);
    };

    GridActions.blockTags = null;

    /**
     * Get rendering options with localized / verbose model field names, including nested relationships
     * to use these with current grid row data in actions dialog.
     */
    GridActions.getNestedListOptions = function() {
        // todo: Check related fields name clash (disambiguation).
        var options = $.extend(
            true,
            {
                blockTags: (this.blockTags === null) ? ui.dialogBlockTags : blockTags.badges,
                unwrapTop: true,
            },
            this.grid.meta.fkNestedListOptions,
            this.grid.meta.listOptions
        );
        return options;
    };

    /**
     * Issued as the confirmation dialog for two-stages actions, such as select one or many grid rows
     * then perform something with these, for example deletion.
     */
    GridActions.renderDescription = function(viewModel, dialogType) {
        viewModel.message = renderNestedList(
            $('<div>'), viewModel.description, this.getNestedListOptions()
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
            import('../dialog.js').then(function(module) {
                new module.Dialog(viewModel).alert();
            });
            return;
        }
        var pkVals = viewModel.pkVals;
        delete viewModel.pkVals;
        viewModel.callback = function(result) {
            if (result) {
                var actionOptions = {
                    'queryArgs': {
                        'pk_vals': pkVals
                    }
                };
                $.extend(true, actionOptions, self.grid.lastClickedKoRow.getActionOptions(self.lastKoAction));
                self.perform('delete_confirmed', actionOptions);
            }
        };
        this.renderDescription(viewModel);
        import('../dialog.js').then(function(module) {
            var dialog = new module.Dialog(viewModel);
            dialog.confirm();
        });
    };

    GridActions.callback_delete_confirmed = function(viewModel) {
        if (typeof viewModel.has_errors !== 'undefined') {
            this.renderDescription(viewModel);
            import('../dialog.js').then(function(module) {
                new module.Dialog(viewModel).alert();
            });
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

    GridActions.queryargs_list = function(queryArgs) {
        var result = $.extend(queryArgs, this.grid.getListQueryArgs());
        return result;
    };

    GridActions.queryargs_update = function(queryArgs) {
        return this.queryargs_list(queryArgs);
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
    GridActions.queryargs_meta_list = function(queryArgs) {
        return this.grid.getListQueryArgs();
    };

    GridActions.callback_meta_list = function(data) {
        this.callback_meta(data);
        this.callback_list(data);
    };

}(GridActions.prototype);

export { GridActions };
