App.ClosablePopover = function(target, popoverOptions) {
    this.create(target, popoverOptions);
};

(function(ClosablePopover) {

    ClosablePopover.create = function(popoverOptions) {
        var self = this;
        self.$target = $(popoverOptions.target);
        delete popoverOptions.target;

        $.each(this.getThisOverrides(), function(k, v) {
            if (typeof popoverOptions[v] !== 'undefined') {
                self[v] = popoverOptions[v]
                delete popoverOptions[v];
            }
        });

        if (typeof popoverOptions.relatedPopovers !== 'undefined') {
            this.relatedPopovers = popoverOptions.relatedPopovers;
            delete popoverOptions.relatedPopovers;
        } else {
            this.relatedPopovers = [];
        }
        this.relatedPopovers.push(this);

        popoverOptions = $.extend(this.getDefaultOptions(), popoverOptions);

        var $content = $('<div/>');
        this.$popoverContent = this.createPopoverContent();
        var $closeButton = $('<button class="close" type="button">×</button>');
        $closeButton.on('click', function(ev) {
            ev.preventDefault();
            return self.closeButtonEvent(ev);
        });
        $content.append(this.$popoverContent, $closeButton);
        popoverOptions.content = $content;
        self.$target.popover(popoverOptions);
        self.$target
        .on('mouseenter', function(ev) {
            self.mouseEnterTarget(ev);
        })
        .on('click', function(ev) {
            self.mouseClickTarget(ev);
        });
    };

    ClosablePopover.getThisOverrides = function() {
        return ['message', 'mouseEnterTarget', 'mouseClickTarget', 'closeButtonEvent'];
    };

    ClosablePopover.getDefaultOptions = function() {
        return {
            trigger: 'manual',
            placement: 'bottom',
            html: 'true',
        };
    };

    ClosablePopover.isVisible = function() {
        return this.$target.data()['bs.popover'].tip().hasClass('in');
    };

    ClosablePopover.hide = function(skippedPopover) {
        if (typeof skippedPopover !== 'undefined' &&
                skippedPopover.$target.is(this.$target)) {
                // Do not hide if self is current (skipped) popover to prevent flicker.
                return;
        }
        // Prevent flicker.
        if (this.isVisible()) {
            this.$target.popover('hide');
            this.back();
        }
    };

    ClosablePopover.show = function(always) {
        // Prevent flicker.
        if (always === true || !this.isVisible()) {
            this.$target.popover('show');
        }
        return this;
    };

    ClosablePopover.getMessage = function() {
        return (typeof this.message === 'undefined') ? 'Sample message' : this.message;
    };

    ClosablePopover.createPopoverContent = function() {
        return $('<div class="alert alert-warning preformatted">' + this.getMessage() + '</div>');
    };

    ClosablePopover.mouseEnterTarget = function(ev) {
        var self = this;
        $.each(this.relatedPopovers, function(k, v) {
            v.hide(self);
        });
        // Bootstrap 3.3.4 has some glitch when popover is not displayed but it's state is visible.
        // It happens when hiding popover via close button overlaps with target mouseenter event.
        // Thus we are enforcing to display popover (alas, there will be some flicker).
        self.show(true);
    };


    ClosablePopover.mouseClickTarget = function(ev) {
        if (this.isVisible()) {
            this.hide();
        } else {
            this.show();
        }
    };

    ClosablePopover.closeButtonEvent = function(ev) {
        ev.preventDefault();
        this.hide();
        return false;
    }

    ClosablePopover.goto = function(ev) {
        var hash = this.$target.prop('name');
        if (typeof hash !== 'undefined') {
            if (typeof this.backHash === 'undefined') {
                this.backHash = window.location.hash;
            }
            window.location.hash = '#' + hash;
        }
    };

    ClosablePopover.back = function() {
        if (typeof this.backHash !== 'undefined') {
            window.location.hash = this.backHash;
            delete this.backHash;
        }
    };

    ClosablePopover.notify = function(message) {
        this.message = message;
        this.$popoverContent.replaceWith(this.createPopoverContent());
        this.show(true);
        this.goto();
    };

})(App.ClosablePopover.prototype);

App.ButtonPopover = function(popoverOptions) {
    $.inherit(App.ClosablePopover.prototype, this);
    this.create(popoverOptions);
};

(function(ButtonPopover) {

    ButtonPopover.create = function(target, popoverOptions) {
        var self = this;
        this.super.create.call(this, target, popoverOptions);
        this.$popoverContent.on('click', function(ev) {
            ev.preventDefault();
            return self.clickPopoverButton(ev);
        });
    };

    ButtonPopover.createPopoverContent = function() {
        return $('<button class="button btn btn-default btn-sm">' + this.getMessage() + '</button>');
    };

    ButtonPopover.clickPopoverButton = function(ev) {
        this.hide();
    };

})(App.ButtonPopover.prototype);
