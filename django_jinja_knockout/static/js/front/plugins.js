$ = (typeof $ === 'undefined') ? django.jQuery : $;

/**
 * Meta inheritance.
 * Copies parent object _prototype_ methods into _instance_ of pseudo-child.
 *
 * Multi-inheritance is possible via calling $.inherit multiple times with
 * different superName value.
 */
$.inherit = function(parentPrototype, childInstance, superName) {
    if (typeof superName === 'undefined') {
        superName = 'super';
    }
    if (superName !== null) {
        /**
         * @note: Call parent method via:
         * childInstance.super.parentMethod.call(childInstance, arg1, .. argN);
         */
        if (typeof childInstance[superName] !== 'undefined') {
            throw 'childInstance ' + childInstance + ' already has ' + superName + ' property';
        }
        childInstance[superName] = parentPrototype;
    }
    $.each(parentPrototype, function(k,v) {
        if (typeof childInstance[k] === 'undefined') {
            childInstance[k] = v;
        }
    });
};

$.fn.findSelf = function(selector) {
    var result = this.find(selector);
    return (this.is(selector)) ?
        result.add(this) : result;
};

$.fn.autogrow = function(method) {
    return {
        'init' : function() {
            this.findSelf('textarea.autogrow')
            .data('autogrowInit', true)
            .autogrow('update')
            .on('click keyup input paste', function(ev) {
                $(ev.target).autogrow('update');
            });
        },
        'update' : function() {
            return this.each(function() {
                var $textarea = $(this);
                if ($textarea.prop('tagName') !== 'TEXTAREA' ||
                        $textarea.data('autogrowInit') !== true) {
                    return;
                }
                if (typeof $textarea.data('autogrowMinRows') === 'undefined') {
                    // Default value for data-autogrow-min-rows.
                    $textarea.data('autogrowMinRows', $textarea.prop('rows'));
                }
                var minRows = $textarea.data('autogrowMinRows');
                var maxRows = $textarea.data('maxRows');
                if (typeof maxRows === 'undefined') {
                    maxRows = 10;
                }
                if (maxRows < minRows) {
                    maxRows = minRows;
                }
                var lines = $textarea.val().split('\n').length;
                if (lines > maxRows) {
                    lines = maxRows;
                } else if (lines < minRows) {
                    lines = minRows;
                }
                $textarea.prop('rows', lines);
            });
        }
    }[method].call(this);
};

$.fn.optionalInput = function(method) {
    return {
        'init' : function() {
            this.find('.optional-input[type="checkbox"]')
            // Next line is required because Django 1.8 MultiWidget does not allow to set css classes of child widgets separately.
            .prop('class', 'optional-input')
            .data('optionalInputInit', true)
            .optionalInput('update')
            .on('change', function(ev) {
                $(ev.target).optionalInput('update');
            });
        },
        'update' : function() {
            return this.each(function() {
                var $checkbox = $(this);
                if ($checkbox.data('optionalInputInit') !== true) {
                    return;
                }
                var $optInp = $checkbox.next();
                if (!$optInp.is(':input')) {
                    throw "optInp is not :input";
                }
                $optInp.prop('disabled', !this.checked);
                if (this.checked) {
                    var originalValue = $optInp.data('optionalInputOriginalValue');
                    if (typeof originalValue !== 'undefined') {
                        $optInp
                        .focus()
                        .val(originalValue).autogrow('update');
                    }
                } else {
                    $optInp
                    .data('optionalInputOriginalValue', $optInp.val())
                    .val('').autogrow('update');
                }
            });
        }
    }[method].call(this);
};

// Display submit button enclosed into .submit-group when the length of input.activates-submit-group text > 0.
$.fn.collapsibleSubmit = function(method) {
    return {
        // Applied to outer container.
        'init' : function() {
            this.find('.activates-submit-group')
            .data('collapsibleSubmitInit', true)
            .collapsibleSubmit('update')
            .on('keyup input paste', function(ev) {
                var $input = $(this).closest('.activates-submit-group')
                .data('collapsibleSubmitInit', true)
                .collapsibleSubmit('update');
            });
        },
        // Applied to input element that receives the events.
        'update': function() {
            return this.each(function() {
                var $input = $(this);
                if (!$input.is(':input:visible') ||
                        $input.data('collapsibleSubmitInit') !== true) {
                    return;
                }
                var $form = $input.closest('form');
                var text_is_empty = $input.val().length === 0;
                $form.find('.submit-group').toggleClass('hidden', text_is_empty);
            });
        }
    }[method].call(this);
};

$.fn.changePopover = function(opts) {
    return this.each(function() {
        for (var opt in opts) {
            if (opts.hasOwnProperty(opt)) {
                $(this).data('bs.popover').options[opt] = opts[opt];
            }
        }
    });
};

$.fn.toPopover = function(opts) {
    return this.each(function() {
        var $this = $(this);
        $this
        .changePopover(opts)
        .popover('show');
        window.location.hash = '#' + $this.prop('name');
    });
};

$.fn.scroller = function(method) {

    function Scroller(scroller) {
        this.scrollPadding = 20;
        this.$scroller = $(scroller);
        this.getPos();
    }

    (function(Scroller) {

        Scroller.getPos = function() {
            // Number of pixels the element is scrolled down vertically (top visible scrolling point).
            this.scrollTopPos = this.$scroller.scrollTop();
            // Height of element without padding.
            this.height = this.$scroller.height();
            // Height of element with padding.
            this.heightWithPadding = this.$scroller.innerHeight();
            // Current bottom visible scrolling point.
            this.scrollBottomPos = this.scrollTopPos + this.heightWithPadding;
            // Maximal bottom visible scrolling point.
            this.scrollHeight = this.$scroller[0].scrollHeight;
            // Max-height of element.
            this.maxHeight = this.$scroller.css('max-height');
            this.maxHeight = (this.maxHeight) === '' ? 0 : parseInt(this.maxHeight);
            return this;
        };

        Scroller.toTop = function() {
            this.$scroller.scrollTop(this.scrollPadding);
        };

        Scroller.toBottom = function() {
            var scrollTop = this.scrollHeight - this.heightWithPadding - this.scrollPadding;
            if (scrollTop < 0) {
                scrollTop = 0;
            }
            this.$scroller.scrollTop(scrollTop);
        };

        Scroller.getScrollDelta = function() {
            if (this.maxHeight === 0) {
                // Element is not loaded yet or has no required max-height css attribute.
                console.log('Scroller: element is not loaded yet.');
                return 0;
            }
            if (this.maxHeight < this.scrollHeight) {
                // Element already has overflow.
                console.log('Scroller: element already has overflow.')
                return 0;
            }
            // How much current height is lower than maximally allowed height.
            var scrollDelta = this.maxHeight - this.height;
            console.log('Scroller: scrollDelta=' + scrollDelta);
            if (scrollDelta < 0) {
                scrollDelta = 0;
            }
            return scrollDelta;
        };

        Scroller.expand = function() {
            var padHeight = this.getScrollDelta() / 2 + this.scrollPadding;
            this.$scroller
            .css('padding-top', padHeight)
            .css('padding-bottom', padHeight);
        };

        Scroller.trigger = function(eventType) {
            if (this.maxHeight < this.scrollHeight) {
                // Element already has overflow.
                if (eventType !== 'scroll') {
                    console.log('Scroll: skipping repeating event type:' + eventType);
                    return;
                }
            }
            console.log('Scroll: trigger event type: ' + eventType);
            if (this.scrollTopPos === 0) {
                this.$scroller.trigger('scroll:top');
            }
            if (this.scrollBottomPos >= this.scrollHeight) {
                this.$scroller.trigger('scroll:bottom');
            }
        };

    })(Scroller.prototype);

    return {
        'init': function() {
            return this.each(function() {
                var $this = $(this);
                var scroller = new Scroller($this);
                $this.on('scroll wheel touchstart', function(ev) {
                    scroller.getPos().trigger(ev.type);
                });
            });
        },
        'update': function() {
            return this.each(function() {
                var scroller = new Scroller(this);
                scroller.expand();
            });
        },
        'to_top': function() {
            return this.each(function() {
                var scroller = new Scroller(this);
                scroller.toTop();
            });
        },
        'to_bottom': function() {
            return this.each(function() {
                var scroller = new Scroller(this);
                scroller.toBottom();
            });
        }
    }[method].call(this);
};
