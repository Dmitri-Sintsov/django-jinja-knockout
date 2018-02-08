'use strict';

App.vmRouter.add({
    'tooltip_error': function(viewModel) {
        var fieldTooltip = new App.FieldTooltip(viewModel);
        // Save instance of tooltip to delete it later via applying _.filter() to
        // App.vmRouter.executedViewModels only when there was no previous instance created
        // for the matching or the same selector.
        if (!fieldTooltip.hasInstance) {
            viewModel.instance = fieldTooltip;
        }
    },
    'popover_error': function(viewModel) {
        // Do not forget to escape viewModel.message from XSS.
        // Is not reliable due to: https://github.com/twbs/bootstrap/issues/20511
        viewModel.instance = new App.FieldPopover(viewModel);
    },
    'bs_alert_error': function(viewModel) {
        viewModel.instance = new App.AlertError(viewModel);
    },
    'form_error': function(viewModel, vmRouter) {
        vmRouter.exec('bs_alert_error', viewModel);
    }
});

/**
 * Information popover (useful to show ajax form errors and more).
 */
App.GenericPopover = function(options) {
    this.create(options);
};

(function(GenericPopover) {

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
                // Find associated input by [data-popover].
                this.$field = $('[name="' + CSS.escape(this.$messageTarget.data('popover')) + ']"');
        }

        if (this.$field.length === 0) {
            throw "Unmatched input: " + JSON.stringify(options);
        }

        this.messages = options.messages;
        this.setupEvents();
    }

})(App.GenericPopover.prototype);


App.FieldPopover = function(options) {
    $.inherit(App.GenericPopover.prototype, this);
    this.create(options);
};

(function(FieldPopover) {

    FieldPopover.setupEvents = function() {
        var self = this;
        this.destroyed = false;
        this.$field.focus();
        // Do not show/hide multiple times to prevent flickering.
        this.status = 'show';
        var $errmsg = $('<div>');
        App.renderNestedList($errmsg, this.messages);
        var _popover = this.$messageTarget.popover({
            trigger: 'manual',
            placement: 'bottom',
            container: 'body',
            content: $errmsg,
            html: true,
            template:
                "<div class=\"popover\">" +
                "<div class=\"arrow\"></div><div class=\"popover-inner\"><div class=\"popover-content\"><p></p></div></div>" +
                "</div>"
        });
        _popover.data("bs.popover").options.content = $errmsg;
        this.$messageTarget.popover(self.status);
        this.onDestroy = function(ev) {
            self.$messageTarget.popover('destroy');
        };
        this.onBlur = function(ev) {
            if (typeof self.$messageTarget.popover === 'function' && self.status !== 'hide') {
                self.$messageTarget.popover(self.status = 'hide');
            }
        };
        this.onFocus = function(ev) {
            if (typeof self.$messageTarget.popover === 'function' && self.status !== 'show') {
                self.$messageTarget.popover(self.status = 'show');
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
            this.$messageTarget.popover('destroy');
            this.destroyed = true;
        }
    };

}) (App.FieldPopover.prototype);


App.FieldTooltip = function(options) {
    $.inherit(App.GenericPopover.prototype, this);
    this.create(options);
};

(function(FieldTooltip) {

    FieldTooltip.setupEvents = function() {
        var self = this;
        if (this.hasInstance = this.$cssTarget.hasClass('validation-error')) {
            // @note: data-original-title is boostrap3 standard attribute, do not change the name.
            this.$messageTarget.attr(
                'data-original-title',
                this.$messageTarget.attr('data-original-title') + '\n' + this.messages.join('\n')
            );
        } else {
            this.$messageTarget
              .attr('title', this.messages.join('\n'));
            this.$messageTarget.tooltip({
                'container': 'body',
                'placement': 'bottom'
            });
            this.destroyed = false;
            this.$cssTarget.addClass('validation-error');
            this.onDestroy = function(ev) {
                self.destroy();
            };
            this.$field.on(this.destroyEventName, this.onDestroy);
            $('html, body').scrollTop(this.$field.offset().top);
        }
    };

    FieldTooltip.destroy = function(form) {
        if (!this.destroyed) {
            if (form === undefined || $.contains(form, this.$field.get(0))) {
                this.$messageTarget.removeAttr('title').tooltip('destroy');
                this.$cssTarget.removeClass('validation-error');
                this.$field.off(this.destroyEventName, this.onDestroy);
                this.destroyed = true;
            }
        }
    };

}) (App.FieldTooltip.prototype);


App.AlertError = function(options) {
    this.init(options);
};

(function(AlertError) {

    AlertError.init = function(options) {
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
            App.renderNestedList($errmsg, options.messages);
            new App.Dialog({
                title: errTitle,
                message: $errmsg,
            }).alert();
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
                $contents.prepend($('<button>', {
                    'class': 'close',
                    'data-dismiss': 'alert',
                    'type': 'button'
                }).text('×'))
                this.$field.after($contents);
            }
        }
    };

    AlertError.destroy = function(form) {
        if (form === undefined || $.contains(form, this.$field.get(0))) {
            var $formErrors = this.$field.parent('.has-error');
            $formErrors.find('.alert').remove();
            $formErrors.removeClass('has-error');
        }
    };

})(App.AlertError.prototype);


(function(AjaxForm) {

    var superAlways = AjaxForm.always;

    /**
     * @note: has optional support for viewModel.instance.destroy()
     */
    AjaxForm.destroyFormErrors = function() {
        var form = this.$form.get(0);
        App.vmRouter.filterExecuted(
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

})(App.AjaxForm.prototype);
