import { inherit } from './dash.js';
import { propGet } from './prop.js';
import { initClient } from './initclient.js';
import { globalIoc } from './ioc.js';
import { UiPopover } from './ui.js';

function ClosablePopover(target, popoverOptions) {

    this.create(target, popoverOptions);

} void function(ClosablePopover) {

    ClosablePopover.dataKey = 'ClosablePopover';

    ClosablePopover.is = function(another) {
        return this.$target.is(another.$target);
    };

    ClosablePopover.create = function(popoverOptions) {
        var self = this;
        self.$target = $(popoverOptions.target);
        self.$target.addInstance(this.dataKey, self);
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
        var $closeButton = $.contents('<a class="close"><button is="btn-dismiss"></button></a>');
        $closeButton.on('click', function(ev) {
            ev.preventDefault();
            return self.closeButtonEvent(ev);
        });
        $content.append(this.$popoverContent, $closeButton);
        popoverOptions.content = $content;
        self.onMouseEnter = function(ev) {
            self.mouseEnterTarget(ev);
        };
        self.onClick = function(ev) {
            self.mouseClickTarget(ev);
        };
        new UiPopover(self.$target).create(popoverOptions);
        self.$target
        .on('shown.bs.popover', function() {
            var id = $(this).attr('aria-describedby');
            self.popoverContent = $.id(id);
            self.popoverContent.on('mouseleave', self.leave.bind(self));
        })
        .on('mouseenter', self.onMouseEnter)
        .on('click', self.onClick);
    };

    ClosablePopover.leave = function() {
        new UiPopover(this.$target).hide();
        this.popoverContent.off('mouseleave', this.leave);
    };

    ClosablePopover.destroy = function() {
        this.$target
        .off('mouseenter', this.onMouseEnter)
        .off('click', this.onClick);
        new UiPopover(this.$target).dispose();
    };

    ClosablePopover.getThisOverrides = function() {
        return ['message', 'mouseEnterTarget', 'mouseClickTarget', 'closeButtonEvent'];
    };

    ClosablePopover.getDefaultOptions = function() {
        return {
            trigger: 'manual',
            placement: 'bottom',
            html: true,
            container: 'body',
        };
    };

    ClosablePopover.isVisible = function() {
        return new UiPopover(this.$target).isVisible();
    };

    ClosablePopover.hide = function(skippedPopover) {
        if (typeof skippedPopover !== 'undefined' &&
                skippedPopover.is(this)) {
                // Do not hide if self is current (skipped) popover to prevent flicker.
                return;
        }
        // Prevent flicker.
        if (this.isVisible()) {
            new UiPopover(this.$target).hide();
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

    ClosablePopover.getContentWrapper = function() {
        return $('<div class="alert alert-warning preformatted">');
    };

    ClosablePopover.createPopoverContent = function() {
        var message = this.getMessage();
        var $result = this.getContentWrapper();
        if (message instanceof jQuery) {
            $result.append(message);
        } else {
            $result.text(message);
        }
        return $result;
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
    };

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

}(ClosablePopover.prototype);

function ButtonPopover(popoverOptions) {

    inherit(ClosablePopover.prototype, this);
    this.create(popoverOptions);

} void function(ButtonPopover) {

    ButtonPopover.dataKey = 'ButtonPopover';

    ButtonPopover.create = function(target, popoverOptions) {
        var self = this;
        this._super._call('create', target, popoverOptions);
        this.onClickPopoverButton = function(ev) {
            ev.preventDefault();
            return self.clickPopoverButton(ev);
        };
        this.$popoverContent.on('click', this.onClickPopoverButton);
    };

    ButtonPopover.destroy = function() {
        this.$popoverContent.off('click', this.onClickPopoverButton);
        this._super._call('destroy');
    };

    ButtonPopover.getContentWrapper = function() {
        return $('<button class="button btn btn-default btn-sm">');
    };

    ButtonPopover.clickPopoverButton = function(ev) {
        this.hide();
    };

    ButtonPopover.getThisOverrides = function() {
        return ['message', 'mouseEnterTarget', 'mouseClickTarget', 'closeButtonEvent', 'clickPopoverButton'];
    };

}(ButtonPopover.prototype);

/**
 * Instantiation of bootstrap popover which optionally supports underscore.js templates.
 */
function ContentPopover(k, v) {
    var $popover = $(v);
    new UiPopover($popover).create({
        container: 'body',
        content: function() {
            var template = $(this).data("contentTemplate");
            if (template !== undefined) {
                var options = $(this).data("contentTemplateOptions");
                var processor = globalIoc.factory('Tpl', options);
                var $content = processor.domTemplate(template);
                initClient($content);
                return $content;
            } else {
                return $(this).attr('bs-content');
            }
        },
        title: function() {
            return $(this).attr('title');
        },
    })
    $popover.on("hidden.bs.popover", function(e) {
        if ($popover.data("contentTemplate") !== undefined) {
            new UiPopover($popover).empty();
        }
    });
}

export { ClosablePopover, ButtonPopover, ContentPopover };
