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
        viewModel.instance = new App.FieldPopover(viewModel);
    },
    'form_error': function(viewModel) {
        var errTitle = null;
        var $field = $.id(viewModel.id);
        if ($field.length > 1) {
            errTitle = 'Multiple fields with auto_id: ' + viewModel.id;
        }
        if ($field.length == 0) {
            errTitle = "Unknown field auto_id: " + viewModel.id;
        }
        if (errTitle !== null) {
            var $errmsg = $('<div>');
            App.renderNestedList($errmsg, viewModel.messages);
            new App.Dialog({
                title: errTitle,
                message: $errmsg,
            }).alert();
        } else {
            var $inputGroup = $field.parents('.input-group:eq(0)');
            if ($inputGroup.length > 0) {
                $field = $inputGroup;
            }
            var $formErrors = $field.parent('.has-error');
            if ($formErrors.length === 0) {
                var $formErrors = $('<div>').addClass('has-error');
                $field.wrap($formErrors);
            } else {
                $formErrors.find('.alert').remove();
            }
            var alert_class = (typeof viewModel.class === 'undefined') ? 'warning' : 'danger';
            for (var i = 0; i < viewModel.messages.length; i++) {
                var $contents = $('<div>', {
                    'class': 'alert alert-' + CSS.escape(alert_class) + ' alert-dismissible"></div>',
                }).text(viewModel.messages[i]);
                $contents.prepend($('<button>', {
                    'class': 'close',
                    'data-dismiss': 'alert',
                    'type': 'button'
                }).text('×'))
                $field.after($contents);
            }
        }
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
                this.$field = $('[name="' + this.$messageTarget.attr('for') + ']"');
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
                this.$field = $('[name="' + this.$messageTarget.data('popover') + ']"');
        }

        if (this.$field.length === 0) {
            throw "Unmatched input: " + JSON.stringify(options);
        }

        this.message = options.message;
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
        this.$field.focus();
        // Do not show/hide multiple times to prevent flickering.
        this.status = 'show';
        var _popover;
        _popover = this.$messageTarget.popover({
            trigger: 'manual',
            placement: 'bottom',
            container: 'body',
            content: self.message,
            html: true,
            template: "<div class=\"popover\"><div class=\"arrow\"></div><div class=\"popover-inner\"><div class=\"popover-content\"><p></p></div></div></div>"
        });
        _popover.data("bs.popover").options.content = self.message;
        this.$messageTarget
        .popover(self.status);
        this.$field
        .on(this.destroyEventName, function(ev) {
            self.$messageTarget.popover('destroy');
        })
        .on('blur', function(ev) {
            if (typeof self.$messageTarget.popover === 'function' && self.status !== 'hide') {
                self.$messageTarget.popover(self.status = 'hide');
            }
        })
        .on('focus', function(ev) {
            if (typeof self.$messageTarget.popover === 'function' && self.status !== 'show') {
                self.$messageTarget.popover(self.status = 'show');
            }
        });
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
                this.$messageTarget.attr('data-original-title') + '\n' + this.message
            );
        } else {
            this.$messageTarget
              .attr('title', this.message);
            this.$messageTarget.tooltip({
                'container': 'body',
                'placement': 'bottom'
            });
            this.destroyed = false;
            this.$cssTarget.addClass('validation-error');
            this.$field.on(this.destroyEventName, function(ev) {
                self.destroy();
            });
            $('html, body').scrollTop(this.$field.offset().top);
        }
    };

    FieldTooltip.destroy = function() {
        if (!this.destroyed) {
            this.$messageTarget.removeAttr('title').tooltip('destroy');
            this.$cssTarget.removeClass('validation-error');
            this.$field.off(this.destroyEventName);
            this.destroyed = true;
        }
    };

}) (App.FieldTooltip.prototype);


/**
 * @note: has optional support for viewModel.instance.destroy()
 * @todo: destroy tooltip errors only for the form specified
 */
App.destroyTooltipErrors = function(form) {
    App.vmRouter.filterExecuted(
        function(viewModel) {
            if (viewModel.view === 'tooltip_error' &&
                    typeof viewModel.instance !== 'undefined') {
                viewModel.instance.destroy();
                return false;
            }
            return true;
        }
    );
};


(function(AjaxForm) {

    var superBeforeSubmit = AjaxForm.beforeSubmit;

    AjaxForm.beforeSubmit = function($form) {
        App.destroyTooltipErrors($form);
        superBeforeSubmit($form);
    }

})(App.AjaxForm.prototype);
