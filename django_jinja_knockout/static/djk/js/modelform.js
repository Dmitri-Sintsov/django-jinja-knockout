import { inherit, moveOptions } from './dash.js';
import { Trans } from './translate.js';
import { Actions } from './actions.js';
import { Dialog } from './dialog.js';
import { AjaxForm } from './ajaxform.js';

/**
 * Unused by Grid.
 */
function ModelFormActions(options) {

    inherit(Actions.prototype, this);
    this.init(options);

} void function(ModelFormActions) {

    /**
     * The same client-side AJAX form is used both to add new objects and to update existing ones.
     */
    ModelFormActions.callback_edit_form = function(viewModel) {
        this.callback_create_form(viewModel);
    };

    ModelFormActions.callback_edit_inline = function(viewModel) {
        this.callback_create_form(viewModel);
    };

    ModelFormActions.callback_create_form = function(viewModel) {
        viewModel.owner = this.owner;
        $.extend(viewModel, this.owner.dialogOptions);
        var dialog = new ModelFormDialog(viewModel);
        dialog.show();
    };

    ModelFormActions.callback_save_form = function(viewModel) {
        // noop
    };

    ModelFormActions.callback_save_inline = function(viewModel) {
        // noop
    };

}(ModelFormActions.prototype);


/**
 * BootstrapDialog that is used to create / edit model object instance.
 * May be used standalone, also is used by Grid actions (eg. 'click' type ones).
 */
function ModelFormDialog(options) {

    inherit(Dialog.prototype, this);
    this.create(options);

} void function(ModelFormDialog) {

    ModelFormDialog.initClient = true;
    ModelFormDialog.actionCssClass = 'iconui-save';

    ModelFormDialog.create = function(options) {
        if (typeof options !== 'object') {
            options = {};
        }
        delete options.view;
        moveOptions(this, options, ['owner']);
        var dialogOptions = $.extend({
                type: BootstrapDialog.TYPE_PRIMARY,
            }, options
        );
        this._super._call('create', dialogOptions);
    };

    ModelFormDialog.getActionLabel = function() {
        return Trans('Save');
    };

    ModelFormDialog.action = function(bdialog) {
        var self = this;
        var $form = bdialog.getModalBody().find('form');
        var $button = bdialog.getModalFooter().find('button.submit');
        var ajaxForm = new AjaxForm($form);
        ajaxForm.submit($button, {
            success: function(response) {
                if (typeof self.owner !== 'undefined') {
                    var result = self.owner.modelFormAction(response);
                    if (result) {
                        // Has form errors.
                        return true;
                    } else {
                        // Successfully saved, close the dialog.
                        self.close();
                        return false;
                    }
                }
            }
        });
    };

    ModelFormDialog.getButtons = function() {
        var self = this;
        return [
            {
                icon: 'iconui iconui-ban-circle',
                label: Trans('Cancel'),
                hotkey: 27,
                cssClass: 'btn-default',
                action: function(bdialog) {
                    self.close();
                }
            },
            {
                icon: 'iconui ' + this.actionCssClass,
                label: this.getActionLabel(),
                cssClass: 'btn-primary submit',
                action: function(bdialog) {
                    self.action(bdialog);
                }
            }
        ];
    };

}(ModelFormDialog.prototype);


/**
 * May be inherited to create BootstrapDialog with client-side template form for implemented action.
 * .owner can be any knockout.js bound class which may have purely optional owner-implemented methods.
 * Built-in example of .owner is an instance of Grid class.
 * Usage:

    ChildActionDialog = function(options) {
        inherit(ActionTemplateDialog.prototype, this);
        this.inherit();
        this.create(options);
    };

    ChildActionDialog.create = function(options) {
        this._super._call('create', options);
        ...
    };
 */
function ActionTemplateDialog(options) {

    this.inherit();
    this.create(options);

} void function(ActionTemplateDialog) {

    ActionTemplateDialog.initClient = true;
    ActionTemplateDialog.type = BootstrapDialog.TYPE_PRIMARY;
    ActionTemplateDialog.templateId = 'ko_action_form';
    ActionTemplateDialog.actionCssClass = 'iconui-plus';

    ActionTemplateDialog.inherit = function() {
        inherit(Dialog.prototype, this);
        this.getButtons = ModelFormDialog.prototype.getButtons;
        this.action = ModelFormDialog.prototype.action;
    };

    ActionTemplateDialog.create = function(options) {
        this.wasOpened = false;
        moveOptions(this, options, ['owner', {'template': this.templateId}]);
        this.ownerOnCreate(options);
        moveOptions(this, options, ['actionLabel']);
        this._super._call('create', options);
    };

    ActionTemplateDialog.ownerOnCreate = function(options) {
        if (typeof this.owner.onActionTemplateDialogCreate === 'function') {
            this.owner.onActionTemplateDialogCreate(this, options);
        }
    };

    ActionTemplateDialog.onShow = function() {
        this._super._call('onShow');
        if (this.wasOpened) {
            this.recreateContent();
        }
        this.owner.applyBindings(this.bdialog.getModal());
        this.ownerOnShow();
        this.wasOpened = true;
    };

    ActionTemplateDialog.ownerOnShow = function() {
        if (typeof this.owner.onActionTemplateDialogShow === 'function') {
            this.owner.onActionTemplateDialogShow(this);
        }
    };

    ActionTemplateDialog.onHide = function() {
        this.ownerOnHide();
        // Clean only grid bindings of this dialog, not invoker bindings.
        this.owner.cleanBindings(this.bdialog.getModal());
        this._super._call('onHide');
    };

    ActionTemplateDialog.ownerOnHide = function() {
        if (typeof this.owner.onActionTemplateDialogHide === 'function') {
            this.owner.onActionTemplateDialogHide(this);
        }
    };

    ActionTemplateDialog.getActionLabel = function() {
        return this.actionLabel;
    };

}(ActionTemplateDialog.prototype);


/**
 * Standalone component for ModelFormActionsView. Unused by Grid.
 */
function EditForm(options) {

    this.init(options);

} void function(EditForm) {

    EditForm.getInitialAction = function() {
        return (this.pkVal === null) ? 'create_form' : 'edit_form';
    };

    /**
     * Supports passing pkVal to server-side view both via optional pkUrlKwarg value as well as via POST 'pk_val' value.
     * See also views.ajax.ModelFormActionsView.get_pk_val().
     */
    EditForm.init = function(options) {
        moveOptions(this, options, [
            {'dialogOptions': {}},
            'route',
            {'routeKwargs': {}},
            {'pkUrlKwarg': null},
        ]);
        if (typeof options.pkVal !== 'undefined') {
            this.pkVal = options.pkVal;
            if (this.pkUrlKwarg !== null) {
                this.routeKwargs[this.pkUrlKwarg] = this.pkVal;
            }
        } else {
            if (this.pkUrlKwarg !== null) {
                this.pkVal = this.routeKwargs[this.pkUrlKwarg];
                if (this.pkVal === 0 || this.pkVal === '0') {
                    this.pkVal = null;
                }
            }
        }
        if (typeof options.initialAction !== 'undefined') {
            this.initialAction = options.initialAction;
        } else {
            this.initialAction = this.getInitialAction();
        }
    };

    EditForm.iocActions = function(options) {
        return new ModelFormActions(options);
    };

    EditForm.runComponent = function(elem, event) {
        this.actions = this.iocActions({
            owner: this,
            route: this.route,
            routeKwargs: this.routeKwargs,
        });
        this.componentElement = elem;
        var queryArgs = (this.pkUrlKwarg === null) ? {pk_val: this.pkVal} : {};
        this.actions.perform(this.initialAction, {
            // 'ajaxIndicator': event.currentTarget,
            queryArgs,
        });
    };

    EditForm.removeComponent = function(elem) {
        // todo: implement
    };

    EditForm.respond = function(response) {
        this.actions.respond(
            this.actions.lastActionName,
            response
        );
        // Do not process viewmodel response, because we already processed it here.
        return false;
    };

    EditForm.modelFormAction = function(response) {
        var vm = this.actions.getOurViewmodel(response);
        if (response.length > 0 && vm === null) {
            /**
             * If non-empty response has no our grid viewmodel (this.actions.viewModelName), then it's a
             * form viewmodel errors response which will be processed by AjaxForm.submit().
             */
            return true;
        } else {
            return this.respond(response);
        }
    };

}(EditForm.prototype);


/**
 * Standalone component for ModelFormActionsView. Unused by Grid.
 */
function EditInline(options) {

    inherit(EditForm.prototype, this);
    this.init(options);

} void function(EditInline) {

    EditInline.getInitialAction = function() {
        return (this.pkVal === null) ? 'create_inline' : 'edit_inline';
    };

}(EditInline.prototype);

export { ModelFormActions, ModelFormDialog, ActionTemplateDialog, EditForm, EditInline };
