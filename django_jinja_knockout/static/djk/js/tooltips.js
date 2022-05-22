import { inherit } from './dash.js';
import { renderNestedList } from './nestedlist.js';
import { UiPopover, UiTooltip } from './ui.js';
import { vmRouter } from './ioc.js';
import { AjaxForm } from './ajaxform.js';
import { TabPane } from './tabpane.js';

function useTooltips() {
    vmRouter.add({
        'tooltip_error': function(viewModel) {
            var fieldTooltip = new FieldTooltip(viewModel);
            // Save instance of tooltip to delete it later via applying _.filter() to
            // vmRouter.executedViewModels only when there was no previous instance created
            // for the matching or the same selector.
            if (!fieldTooltip.hasInstance) {
                viewModel.instance = fieldTooltip;
            }
        },
        'popover_error': function(viewModel) {
            // Do not forget to escape viewModel.message from XSS.
            // Is not reliable due to: https://github.com/twbs/bootstrap/issues/20511
            viewModel.instance = new FieldPopover(viewModel);
        },
        'bs_alert_error': function(viewModel) {
            viewModel.instance = new AlertError(viewModel);
        },
        'form_error': function(viewModel, vmRouter) {
            vmRouter.exec('bs_alert_error', viewModel);
        }
    });
}

/**
 * Information popover (useful to show ajax form errors and more).
 */
function GenericPopover(options) {

    this.create(options);

} void function(GenericPopover) {

    GenericPopover.create = function(options) {
        this.destroyEventName = 'input';
        if (typeof options.selector !== 'undefined') {
            this.$messageTarget = $(options.selector);
        } else {
            this.$messageTarget = $(document.getElementById(options.id));
        }
        this.$cssTarget = this.$messageTarget;
        if (this.$messageTarget.length === 0) {
            throw "Unmatched target: " + JSON.stringify(options);
        }

        switch (this.$messageTarget.prop('tagName')) {
            case 'LABEL':
                // Find associated input by label[for].
                this.$field = $('[name="' + CSS.escape(this.$messageTarget.attr('for')) + ']"');
                break;
            case 'BUTTON':
                this.destroyEventName = 'click';
            case 'INPUT':
            case 'TEXTAREA':
                this.$field = this.$messageTarget;
                // Detect bootstrap datepicker.
                if (this.$field.closest('.datepicker').length > 0) {
                    this.destroyEventName += ' changeDate';
                }
                if (this.$field.is(':disabled')) {
                    this.$messageTarget = this.$field.parent();
                }
                break;
            case 'SELECT':
                this.$field = this.$messageTarget;
                // Detect select2.
                if (this.$field.hasClass('select2-offscreen')) {
                    this.$messageTarget = this.$field.siblings('.select2-container:first');
                    this.$cssTarget = this.$messageTarget.find('.select2-chosen').parent();
                    this.destroyEventName += ' select2-selecting';
                }
                if (this.$messageTarget.length === 0) {
                    throw "Unmatched target: " + JSON.stringify(options);
                }
                break;
            default:
                this.$field = new UiPopover(this.$messageTarget).getRelatedInput();
        }

        if (this.$field.length === 0) {
            throw "Unmatched input: " + JSON.stringify(options);
        }

        this.messages = options.messages;
        this.setupEvents();
    }

}(GenericPopover.prototype);


function FieldPopover(options) {

    inherit(GenericPopover.prototype, this);
    this.create(options);

} void function(FieldPopover) {

    FieldPopover.setupEvents = function() {
        var self = this;
        this.destroyed = false;
        this.$field.focus();
        // Do not show/hide multiple times to prevent flickering.
        this.status = 'show';
        var $errmsg = $('<div>');
        renderNestedList($errmsg, this.messages);
        var _popover = new UiPopover(this.$messageTarget).create({
            trigger: 'manual',
            placement: 'bottom',
            container: 'body',
            content: $errmsg,
            html: true,
            template:
                "<div class=\"popover\">" +
                "<div class=\"arrow\"></div><div class=\"popover-inner\"><div class=\"bs-popover-body\"><p></p></div></div>" +
                "</div>"
        });
        // new UiPopover(_popover).setContent($errmsg);
        new UiPopover(this.$messageTarget).state(self.status);
        this.onDestroy = function(ev) {
            new UiPopover(self.$messageTarget).dispose();
        };
        this.onBlur = function(ev) {
            if (typeof self.$messageTarget.popover === 'function' && self.status !== 'hide') {
                new UiPopover(self.$messageTarget).state(self.status = 'hide');
            }
        };
        this.onFocus = function(ev) {
            if (typeof self.$messageTarget.popover === 'function' && self.status !== 'show') {
                new UiPopover(self.$messageTarget).state(self.status = 'show');
            }
        };
        this.$field
        .on(this.destroyEventName, this.onDestroy)
        .on('blur', this.onBlur)
        .on('focus', this.onFocus);
    };

    FieldPopover.destroy = function() {
        if (!this.destroyed) {
            this.$field
            .off(this.destroyEventName, this.onDestroy)
            .off('blur', this.onBlur)
            .off('focus', this.onFocus);
            // https://github.com/twbs/bootstrap/issues/20511
            disposePopover(this.$messageTarget.popover);
            this.destroyed = true;
        }
    };

}(FieldPopover.prototype);


function FieldTooltip(options) {

    inherit(GenericPopover.prototype, this);
    this.create(options);

} void function(FieldTooltip) {

    FieldTooltip.setupEvents = function() {
        var self = this;
        this.hasInstance = this.$cssTarget.hasClass('validation-error');
        if (this.hasInstance) {
            // @note: data-original-title is boostrap3 standard attribute, do not change the name.
            this.$messageTarget.attr(
                'data-original-title',
                this.$messageTarget.attr('data-original-title') + '\n' + this.messages.join('\n')
            );
        } else {
            this.$messageTarget
              .attr('title', this.messages.join('\n'));
            new UiTooltip(this.$messageTarget).create({
                container: 'body',
                html: false,
                placement: 'bottom'
            });
            this.destroyed = false;
            this.$cssTarget.addClass('validation-error');
            this.onDestroy = function(ev) {
                self.destroy();
            };
            this.$field.on(this.destroyEventName, this.onDestroy);
            // $('html, body').scrollTop(this.$field.offset().top);
            var $scrollable = this.$field.scrollableParent();
            window.setTimeout(function() {
                $scrollable.scrollTop(self.$field.position().top);
            }, 100);
        }
    };

    FieldTooltip.destroy = function(form) {
        if (!this.destroyed) {
            if (form === undefined || $.contains(form, this.$field.get(0))) {
                this.$messageTarget.removeAttr('title');
                new UiTooltip(this.$messageTarget).dispose();
                this.$cssTarget.removeClass('validation-error');
                this.$field.off(this.destroyEventName, this.onDestroy);
                this.destroyed = true;
            }
        }
    };

}(FieldTooltip.prototype);


function AlertError(options) {

    this.init(options);

} void function(AlertError) {

    AlertError.init = function(options) {
        var self = this;
        var errTitle = null;
        this.$field = $.id(options.id);
        if (this.$field.length > 1) {
            errTitle = 'Multiple fields with auto_id: ' + options.id;
        }
        if (this.$field.length === 0) {
            errTitle = "Unknown field auto_id: " + options.id;
        }
        if (errTitle !== null) {
            var $errmsg = $('<div>');
            renderNestedList($errmsg, options.messages);
            import('./dialog.js').then(function(module) {
                new module.Dialog({
                    title: errTitle,
                    message: $errmsg,
                }).alert();
            });
        } else {
            var $inputGroup = this.$field.parents('.input-group:eq(0)');
            if ($inputGroup.length > 0) {
                this.$field = $inputGroup;
            }
            var $formErrors = this.$field.parent('.has-error');
            if ($formErrors.length === 0) {
                $formErrors = $('<div>').addClass('has-error');
                this.$field.wrap($formErrors);
            } else {
                $formErrors.find('.alert').remove();
            }
            var alert_class = (typeof options.class === 'undefined') ? 'warning' : 'danger';
            for (var i = 0; i < options.messages.length; i++) {
                var $contents = $('<div>', {
                    'class': 'alert alert-' + CSS.escape(alert_class) + ' alert-dismissible"></div>',
                }).text(options.messages[i]);
                $contents.append($('<button is="dismiss-alert">'));
                this.$field.after($contents);
            }
            if (options.messages.length > 0) {
                var $fieldTabPane = this.$field.closest('.tab-pane');
                if ($fieldTabPane.length > 0 && $fieldTabPane.prop('id')) {
                    var tabPane = TabPane($fieldTabPane.prop('id'));
                    tabPane.switchTo().highlight();
                } else {
                    var $scrollable = this.$field.scrollableParent();
                    window.setTimeout(function() {
                        $scrollable.scrollTop(self.$field.position().top);
                    }, 100);
                }
            }
        }
    };

    AlertError.destroy = function(form) {
        if (form === undefined || $.contains(form, this.$field.get(0))) {
            var $formErrors = this.$field.parent('.has-error');
            $formErrors.find('.alert').remove();
            // Remove div.has-error wrapper, keep it's inner contents:
            $formErrors.removeClass('has-error').contents().unwrap();
        }
    };

}(AlertError.prototype);


/**
 * Extend AjaxForm.always() to support 'form_error' viewmodel removal.
 */
void function(AjaxForm) {

    var superAlways = AjaxForm.always;

    /**
     * @note: has optional support for viewModel.instance.destroy()
     */
    AjaxForm.destroyFormErrors = function() {
        var form = this.$form.get(0);
        vmRouter.filterExecuted(
            function(viewModel) {
                if (viewModel.view === 'form_error' && typeof viewModel.instance !== 'undefined') {
                    viewModel.instance.destroy(form);
                    return false;
                }
                return true;
            }
        );
    };

    AjaxForm.always = function() {
        this.destroyFormErrors();
        superAlways.apply(this);
    };

}(AjaxForm.prototype);

export { useTooltips, GenericPopover, FieldPopover, FieldTooltip, AlertError };
