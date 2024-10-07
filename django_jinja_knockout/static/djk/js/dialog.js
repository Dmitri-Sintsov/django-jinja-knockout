import { isArray } from './lib/underscore-esm.js';
import { propGet } from './prop.js';
import { ViewModelRouter } from './vmrouter.js';
import { vmRouter, globalIoc } from './ioc.js';
import { Trans } from './translate.js';
import { ui, UiPopover } from './ui.js';
import { renderNestedList } from './nestedlist.js';
import { initClient } from  './initclient.js';

var dialogIoc = new ViewModelRouter({
    'baseOnShow' : function() {
        // Close opened popovers otherwise they may overlap opened dialog.
        $(document.body).find('[bs-toggle="popover"]').each(function() {
            var uiPopover = new UiPopover(this);
            if (uiPopover.isVisible()) {
                uiPopover.close();
            }
        });
        // Ensure dialog size is set.
        this.bdialog.setSize(this.dialogOptions.size);
    },
});

/**
 * BootstrapDialog wrapper.
 */
function Dialog(options) {

    this.create(options);

} void function(Dialog) {

    Dialog.type = BootstrapDialog.TYPE_WARNING;
    Dialog.size = null;
    Dialog.template = undefined;
    // Make sure to set .isClosable = false in child class when implementing unconditional confirmation dialogs.
    Dialog.isClosable = true;
    Dialog.autoEmpty = true;
    Dialog.initClient = false;

    /**
     * Convert string / nested object to jQuery object.
     * Note that HTML string content is supported.
     * Be sure to encode 'title' / 'message' HTML at the server-side to prevent XSS.
     */
    Dialog.renderObject = function(obj) {
        if (obj instanceof jQuery) {
            return obj;
        } else {
            if (typeof obj === 'object') {
                var $content = $('<div>');
                return renderNestedList(
                    $content, obj, this.getNestedListOptions()
                );
            } else {
                return $.contents(obj, true);
            }
        }
    };


    Dialog.create = function(options) {
        var self = this;
        if (typeof options !== 'object') {
            options = {};
        }
        this.dialogOptions = {
            // BootstrapDialog.TYPE_DEFAULT
            // BootstrapDialog.TYPE_INFO
            // BootstrapDialog.TYPE_PRIMARY
            // BootstrapDialog.TYPE_SUCCESS
            // BootstrapDialog.TYPE_WARNING
            // BootstrapDialog.TYPE_DANGER
            type: this.type,
            animate: false,
            closable: this.isClosable,
            draggable: true,
            initClient: this.initClient,
            buttonLabel: Trans('OK'),
            btnCancelLabel: Trans('No'),
            btnOKLabel: Trans('Yes'),
            // BootstrapDialog.SIZE_SMALL
            // BootstrapDialog.SIZE_WIDE
            // BootstrapDialog.SIZE_LARGE
            size: (this.size === null) ? ui.defaultDialogSize : this.size,
            onshow: function(bdialog) {
                self.bdialog = bdialog;
                bdialog._owner = self;
                self.onShow();
            },
            onshown: function(bdialog) {
                self.onShown();
            },
            onhide: function(bdialog) {
                self.onHide();
            },
            onhidden: function(bdialog) {
                self.onHidden();
            },
        };
        this.dialogOptions = $.extend(this.dialogOptions, this.getOptions(), options);
        this.initClient = this.dialogOptions.initClient;
        delete this.dialogOptions.initClient;
        if (typeof this.dialogOptions.buttons === 'undefined') {
            this.dialogOptions.buttons = this.getButtons();
            if (!isArray(this.dialogOptions.buttons)) {
                delete this.dialogOptions.buttons;
            }
        }
        if (typeof this.dialogOptions.title === 'undefined') {
            this.dialogOptions.title = this.getDialogTitle();
        } else {
            this.dialogOptions.title = this.renderObject(this.dialogOptions.title);
        }
        // Do not forget to escape from XSS.
        if (typeof this.dialogOptions.message === 'undefined') {
            this.dialogOptions.message = this.createDialogContent();
        } else {
            this.dialogOptions.message = this.renderObject(this.dialogOptions.message);
        }
        if (typeof this.dialogOptions.method !== 'undefined') {
            this.showMethod = this.dialogOptions.method;
            delete this.dialogOptions.method;
        }
        // Remove unused properties possibly extended from options.
        delete this.dialogOptions.view;
        switch (typeof this.dialogOptions.callback) {
        case 'object':
            // App viewmodel.
            var cbViewModel = this.dialogOptions.callback;
            this.dialogOptions.callback = function(result) {
                // @note: Do not use alert view as callback, it will cause stack overflow.
                if (result) {
                    vmRouter.respond(cbViewModel);
                } else if (typeof self.dialogOptions.cb_cancel === 'object') {
                    vmRouter.respond(self.dialogOptions.cb_cancel);
                }
            };
            break;
        case 'function':
            // Function callback.
            break;
        default:
            // Default action.
            this.dialogOptions.callback = function(result) {
                if (result) {
                    self.dialogAction();
                } else {
                    self.dialogCancel();
                }
            };
        }
    };

    Dialog.runComponent = function($selector) {
        this.show();
    };

    Dialog.show = function() {
        if (typeof this.showMethod !== 'undefined') {
            this[this.showMethod](this.dialogOptions);
        } else {
            this.bdialog = BootstrapDialog.show(this.dialogOptions);
        }
    };

    Dialog.onShow = function() {
        dialogIoc.exec('baseOnShow', null, this);
        if (this.initClient) {
            initClient(this.bdialog.getModalBody());
        }
    };

    Dialog.onShown = function() {
        /* noop */
    };

    Dialog.onHide = function() {
        if (this.initClient) {
            initClient(this.bdialog.getModalBody(), 'dispose');
        }
        if (this.autoEmpty) {
            this.bdialog.getModal().remove();
        }
    };

    Dialog.onHidden = function() {
        /* noop */
    };

    Dialog.alert = function() {
        if (typeof BootstrapDialog === 'undefined') {
            alert(this.dialogOptions.message);
            this.dialogOptions.callback(true);
            return;
        }
        this.bdialog = BootstrapDialog.alert(this.dialogOptions, this.dialogOptions.callback);
    };

    Dialog.alertError = function() {
        this.dialogOptions.type = BootstrapDialog.TYPE_DANGER;
        this.alert();
    };

    Dialog.confirm = function() {
        if (typeof BootstrapDialog === 'undefined') {
            this.dialogOptions.callback(confirm(this.dialogOptions.message));
            return;
        }
        this.bdialog = BootstrapDialog.confirm(this.dialogOptions);
    };

    Dialog.getDialogTitle = function() {
        return (typeof this.dialogOptions.title === 'undefined') ? $.contents(' ') : this.dialogOptions.title;
    };

    Dialog.recreateTitle = function() {
        this.bdialog.getModalHeader().empty().append(this.getDialogTitle());
    };

    Dialog.setTitle = function(title) {
        if (typeof title !== 'undefined') {
            this.dialogOptions.title = title;
        }
        if (typeof this.bdialog !== 'undefined') {
            this.bdialog.setTitle(this.dialogOptions.title);
        }
    };

    Dialog.iocTemplateProcessor = function(options) {
        var _options = $.extend({'meta_is_dialog': true}, options);
        return globalIoc.factory('Tpl', _options);
    };

    Dialog.createDialogContent = function() {
        var template = propGet(this.dialogOptions, 'template');
        if (template === undefined) {
            template = propGet(this, 'template');
        }
        if (template !== undefined) {
            return this.iocTemplateProcessor().domTemplate(template);
        } else {
            return $.contents('sample content');
        }
    };

    Dialog.recreateContent = function() {
        this.bdialog.getModalBody().empty().append(this.createDialogContent());
    };

    Dialog.getButtons = function() {
        return null;
    };

    Dialog.getOptions = function() {
        return {};
    };

    Dialog.getNestedListOptions = function() {
        var options = {blockTags: ui.dialogBlockTags, unwrapTop: true};
        if (this.dialogOptions.nestedListOptions !== 'undefined') {
            options = $.extend(options, this.dialogOptions.nestedListOptions);
        }
        return options;
    };

    Dialog.isOpened = function() {
        return (typeof this.bdialog !== 'undefined') ? this.bdialog.isOpened() : false;
    };

    Dialog.dialogAction = function() {
        // alert('Sample action');
    };

    Dialog.dialogCancel = function() {
        // alert('Cancelled');
    };

    Dialog.close = function() {
        this.bdialog.close();
    };

}(Dialog.prototype);

export { dialogIoc, Dialog };
