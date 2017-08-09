'use strict';

/**
 * Unused by App.ko.Grid.
 */
App.ModelFormActions = function(options) {
    $.inherit(App.Actions.prototype, this);
    this.init(options);
};

(function(ModelFormActions){

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
        var dialog = new App.ModelFormDialog(viewModel);
        dialog.show();
    };

    ModelFormActions.callback_save_form = function(viewModel) {
        // noop
    };

    ModelFormActions.callback_save_inline = function(viewModel) {
        // noop
    };

})(App.ModelFormActions.prototype);


/**
 * BootstrapDialog that is used to create / edit model object instance.
 * May be used standalone, also is used by App.ko.Grid actions (eg. 'click' type ones).
 */
App.ModelFormDialog = function(options) {
    $.inherit(App.Dialog.prototype, this);
    this.create(options);
};

(function(ModelFormDialog) {

    ModelFormDialog.initClient = true;
    ModelFormDialog.actionCssClass = 'glyphicon-save';

    ModelFormDialog.create = function(options) {
        if (typeof options !== 'object') {
            options = {};
        }
        delete options.view;
        _.moveOptions(this, options, ['owner']);
        var dialogOptions = $.extend({
                type: BootstrapDialog.TYPE_PRIMARY,
            }, options
        );
        this._super._call('create', dialogOptions);
    };

    ModelFormDialog.getActionLabel = function() {
        return App.trans('Save');
    };

    ModelFormDialog.action = function(bdialog) {
        var self = this;
        var $form = bdialog.getModalBody().find('form');
        var $button = bdialog.getModalFooter().find('button.submit');
        App.AjaxForm.prototype.submit($form, $button, {
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
                icon: 'glyphicon glyphicon-ban-circle',
                label: App.trans('Cancel'),
                hotkey: 27,
                cssClass: 'btn-default',
                action: function(bdialog) {
                    self.close();
                }
            },
            {
                icon: 'glyphicon ' + this.actionCssClass,
                label: this.getActionLabel(),
                cssClass: 'btn-primary submit',
                action: function(bdialog) {
                    self.action(bdialog);
                }
            }
        ];
    };

})(App.ModelFormDialog.prototype);


/**
 * Standalone component for ModelFormActionsView. Unused by App.ko.Grid.
 */
App.EditForm = function(options) {
    this.init(options);
};

(function(EditForm) {

    EditForm.getInitialAction = function() {
        return (this.pkVal === null) ? 'create_form' : 'edit_form';
    };

    EditForm.init = function(options) {
        _.moveOptions(this, options, ['route', 'routeKwargs', {'pkVal': null}]);
    };

    EditForm.iocActions = function(options) {
        return new App.ModelFormActions(options);
    };

    EditForm.runComponent = function(elem) {
        this.actions = this.iocActions({
            owner: this,
            route: this.route,
            routeKwargs: this.routeKwargs,
        });
        this.componentElement = elem;
        this.actions.perform(this.getInitialAction(), {pk_val: this.pkVal});
    };

    EditForm.removeComponent = function(elem) {
        // todo: implement
    };

    EditForm.modelFormAction = function(response) {
        var vm = this.actions.getOurViewmodel(response);
        if (vm === null) {
            /**
             * If response has no our grid viewmodel (this.actions.viewModelName), then it's a
             * form viewmodel errors response which will be processed by App.AjaxForm.prototype.submit().
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

})(App.EditForm.prototype);


/**
 * Standalone component for ModelFormActionsView. Unused by App.ko.Grid.
 */
App.EditInline = function(options) {
    this.init(options);
};

(function(EditInline) {

    EditInline.getInitialAction = function() {
        return (this.pkVal === null) ? 'create_inline' : 'edit_inline';
    };

})(App.EditInline.prototype);
