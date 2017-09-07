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
 * May be inherited to create BootstrapDialog with client-side template form for implemented action.
 * .owner usually is the instance of App.ko.Grid but can be any knockout.js bound class with owner-implemented methods.
 * Usage:

    App.ChildActionDialog = function(options) {
        $.inherit(App.ActionTemplateDialog.prototype, this);
        this.inherit();
        this.create(options);
    };

    ChildActionDialog.create = function(options) {
        this._super._call('create', options);
        ...
    };
 */
App.ActionTemplateDialog = function(options) {
    this.inherit();
    this.create(options);
};

(function(ActionTemplateDialog) {

    ActionTemplateDialog.initClient = true;
    ActionTemplateDialog.type = BootstrapDialog.TYPE_PRIMARY;
    ActionTemplateDialog.templateId = 'ko_action_form';
    ActionTemplateDialog.actionCssClass = 'glyphicon-plus';

    ActionTemplateDialog.inherit = function() {
        $.inherit(App.Dialog.prototype, this);
        this.getButtons = App.ModelFormDialog.prototype.getButtons;
        this.action = App.ModelFormDialog.prototype.action;
    };

    ActionTemplateDialog.getTitle = function() {
        return this.owner.getLastActionLocalName();
    };

    ActionTemplateDialog.create = function(options) {
        this.wasOpened = false;
        _.moveOptions(this, options, ['owner']);
        var dialogOptions = $.extend(
            {
                template: this.templateId,
                title: this.getTitle(),
            }, options
        );
        /**
         * Update meta (display text) for bound ko template (this.templateId).
         * This may be used to invoke the same dialog with different messages
         * for similar yet different actions.
         */
        if (typeof options.meta !== 'undefined' && typeof this.owner.updateMeta === 'function') {
            this.owner.updateMeta(options.meta);
            delete options.meta;
        }
        this._super._call('create', dialogOptions);
    };

    /**
     * Issued to render current row object description in multiple actions menu when there are more than one
     * 'click' type actions for the current grid row.
     */
    ActionTemplateDialog.renderHeading = function() {
        return this.owner.renderLastActionHeading();
    };

    ActionTemplateDialog.onShow = function() {
        this._super._call('onShow');
        if (this.wasOpened) {
            this.recreateContent();
        }
        this.owner.applyBindings(this.bdialog.getModal());
        var actionHeading = this.renderHeading();
        if (actionHeading instanceof jQuery) {
            this.bdialog.getModalBody().prepend(actionHeading);
        }
        this.wasOpened = true;
    };

    ActionTemplateDialog.onHide = function() {
        // Clean only grid bindings of this dialog, not invoker bindings.
        this.owner.cleanBindings(this.bdialog.getModal());
        this._super._call('onHide');
    };

    ActionTemplateDialog.getActionLabel = function() {
        return this.owner.getLastActionLocalName();
    };

})(App.ActionTemplateDialog.prototype);


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

    /**
     * Supports passing pkVal to server-side view both via optional pkUrlKwarg value as well as via POST 'pk_val' value.
     * See also views.ajax.ModelFormActionsView.get_pk_val().
     */
    EditForm.init = function(options) {
        _.moveOptions(this, options, [
            'route',
            {'routeKwargs': {}},
            {'pkUrlKwarg': null},
        ]);
        if (typeof options.pkVal !== 'undefined') {
            this.pkVal = options.pkVal;
            if (typeof this.pkUrlKwarg !== null) {
                this.routeKwargs[this.pkUrlKwarg] = this.pkVal;
            }
        } else {
            if (typeof this.pkUrlKwarg !== null) {
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
        return new App.ModelFormActions(options);
    };

    EditForm.runComponent = function(elem) {
        this.actions = this.iocActions({
            owner: this,
            route: this.route,
            routeKwargs: this.routeKwargs,
        });
        this.componentElement = elem;
        var queryArgs = (this.pkUrlKwarg === null) ? {pk_val: this.pkVal} : {};
        this.actions.perform(this.initialAction, queryArgs);
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
    $.inherit(App.EditForm.prototype, this);
    this.init(options);
};

(function(EditInline) {

    EditInline.getInitialAction = function() {
        return (this.pkVal === null) ? 'create_inline' : 'edit_inline';
    };

})(App.EditInline.prototype);
