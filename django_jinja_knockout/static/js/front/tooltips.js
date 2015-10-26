App.viewHandlers['tooltip_error'] = function(viewModel) {
    var fieldTooltip = new App.fieldTooltip(
        viewModel.selector,
        viewModel.message
    );
    // Save instance of tooltip to delete it later via applying _.filter() to
    // App.executedViewModels only when there was no previous instance created
    // for the matching or the same selector.
    if (!fieldTooltip.hasInstance) {
        viewModel.instance = fieldTooltip;
    }
};

App.viewHandlers['popover_error'] = function(viewModel) {
    viewModel.instance = new App.fieldPopover(
        viewModel.selector,
        // Used as text, no need to escape from XSS.
        viewModel.message
    );
};

/**
 * Information popover (useful to show ajax form errors and more).
 *
 * @param String
 *   jQuery selector
 * @param String
 *   message
 */
App.genericPopover = function(selector, message) {
    this.create(selector, message);
};

(function(genericPopover) {
    genericPopover.create = function(selector, message) {
        this.destroyEventName = 'input';
        this.$messageTarget = $(selector);
        this.$cssTarget = this.$messageTarget;
        if (this.$messageTarget.length === 0) {
            throw "Unmatched target: " + selector;
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
                    throw "Unmatched target: " + selector;
                }
                break;
            default:
                // Find associated input by [data-popover].
                this.$field = $('[name="' + this.$messageTarget.data('popover') + ']"');
        }

        if (this.$field.length === 0) {
            throw "Unmatched input: " + selector;
        }

        this.message = message;
        this.setupEvents();
    }
})(App.genericPopover.prototype);


App.fieldPopover = function(selector, message) {
    $.inherit(App.genericPopover.prototype, this);
    this.create(selector, message);
};

(function(fieldPopover) {
    fieldPopover.setupEvents = function() {
        var self = this;
        this.$field.focus();
        // Do not show/hide multiple times to prevent flickering.
        this.status = 'show';
        var _popover;
        _popover = this.$messageTarget.popover({
            trigger: "manual",
            placement: "top",
            content: self.message,
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
}) (App.fieldPopover.prototype);


App.fieldTooltip = function(selector, message) {
    $.inherit(App.genericPopover.prototype, this);
    this.create(selector, message);
};

(function(fieldTooltip) {
    fieldTooltip.setupEvents = function() {
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
            App.tooltip(this.$messageTarget);
            this.destroyed = false;
            this.$cssTarget.addClass('validation-error');
            this.$field.on(this.destroyEventName, function(ev) {
                self.destroy();
            });
            $('html, body').scrollTop(this.$field.offset().top);
        }
    };

    fieldTooltip.destroy = function() {
        if (!this.destroyed) {
            this.$messageTarget.removeAttr('title').tooltip('destroy');
            this.$cssTarget.removeClass('validation-error');
            this.$field.off(this.destroyEventName);
            this.destroyed = true;
        }
    };

}) (App.fieldTooltip.prototype);
