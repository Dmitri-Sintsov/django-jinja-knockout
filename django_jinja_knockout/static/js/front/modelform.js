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
        viewModel.ownerComponent = this.ownerComponent;
        var dialog = new App.ModelFormDialog(viewModel);
        dialog.show();
    };

})(App.ModelFormActions.prototype);


/**
 * BootstrapDialog that is used to create / edit row model object instance.
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
        _.moveOptions(this, options, ['ownerComponent']);
        if (typeof this.routeKwargs === 'undefined') {
            this.routeKwargs = {};
        };
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
                if (typeof self.ownerComponent !== 'undefined') {
                    var result = self.ownerComponent.modelFormAction(response);
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


App.EditForm = function(options) {
    this.init(options);
};

(function(EditForm) {

    EditForm.action = 'edit_form';

    EditForm.init = function(options) {
        _.moveOptions(this, options, ['route', 'routeKwargs', 'pkVal']);
    };

    EditForm.iocActions = function(options) {
        return new App.ModelFormActions(options);
    };

    /**
     * Used when invoked as standalone component. Unused by App.ko.Grid.
     */
    EditForm.runComponent = function(elem) {
        this.actions = this.iocActions({
            ownerComponent: this,
            route: this.route,
            routeKwargs: this.routeKwargs,
        });
        this.componentElement = elem;
        this.actions.perform(this.action, {pk_val: this.pkVal});
    };

    EditForm.removeComponent = function(elem) {
        // todo: implement
    };

    EditForm.modelFormAction = function(response) {
        var vm = this.actions.getOurViewmodel(response);
        if (vm === null) {
            /**
             * If response has no our grid viewmodel (this.gridActions.viewModelName), then it's a form viewmodel errors
             * response which will be processed by App.AjaxForm.prototype.submit().
             */
            return true;
        } else {
            this.actions.respond(
                this.gridActions.lastActionName,
                response
            );
            // Do not process viewmodel response, because we already processed it here.
            return false;
        }
    };

})(App.EditForm.prototype);


App.EditInline = function(options) {
    this.init(options);
};

(function(EditInline) {

    EditInline.action = 'edit_inline';
})(App.EditInline.prototype);
