$ = (typeof $ === 'undefined') ? django.jQuery : $;

$.randomHash = function() {
    return Math.random().toString(36).slice(2);
};

$.htmlEncode = function(value) {
	return $('<div>').text(value).html();
};

$.htmlDecode = function(value) {
	return $('<div>').html(value).text();
};

// Create jQuery DOM nodes from arbitrary text contents.
// Do not use $(contents) as $() is supposed to accept only top-level tags or jQuery selectors, not arbitrary text.
$.contents = function(contents) {
    return $('<span>').html(contents).contents()
};

// Chain of multi-level inheritance.
$.SuperChain = function(childInstance, parentPrototype) {
    this.super = null;
    if (typeof childInstance.superTop !== 'undefined') {
        var lastSuper = childInstance.superTop;
        while (lastSuper.super !== null) {
            lastSuper = lastSuper.super;
        }
        lastSuper.super = this;
    } else {
        childInstance.superTop = this;
        childInstance.super = this;
    }
    this.instance = childInstance;
    this.proto = parentPrototype;
    for (var k in parentPrototype) {
        if (parentPrototype.hasOwnProperty(k) && typeof childInstance[k] === 'undefined') {
            childInstance[k] = parentPrototype[k];
        }
    }
};

(function(SuperChain) {

    SuperChain.find = function(name) {
        // Chain of multi-level inheritance.
        if (typeof this.proto[name] !== 'undefined') {
            return this;
        } else if (this.super !== null) {
            return this.super.prop(name);
        } else {
            throw 'No such property: ' + name;
        }
    };

    SuperChain.prop = function(name) {
        var context = this.find(name);
        return context.proto[name];
    };

    SuperChain._call = function() {
        var context = this.find(arguments[0]);
        var method = context.proto[arguments[0]];
        if (typeof method !== 'function') {
            throw 'No such method: ' + methodName;
        }
        var callerSuper = this.instance.super;
        this.instance.super = context.super;
        result = method.apply(this.instance, Array.prototype.slice.call(arguments, 1));
        this.instance.super = callerSuper;
        return result;
    };

    SuperChain._apply = function(method, args) {
        var context = this.find(arguments[0]);
        var method = context.proto[arguments[0]];
        if (typeof method !== 'function') {
            throw 'No such method: ' + methodName;
        }
        var callerSuper = this.instance.super;
        this.instance.super = context.super;
        return method.apply(this.instance, args);
        this.instance.super = callerSuper;
        return result;
    };

})($.SuperChain.prototype);

/**
 * Meta inheritance.
 * Copies parent object prototype methods into instance of pseudo-child.
 *
 */
$.inherit = function(parentPrototype, childInstance) {
    new $.SuperChain(childInstance, parentPrototype);
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

/**
 * Display submit button enclosed into .submit-group when the length of input.activates-submit-group text > 0.
 */
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

$.fn.linkPreview = function() {

    var scaledPreview = function($anchor) {
        var self = this;
        this.$anchor = $anchor;
        this.isObject = false;
        this.scale = 1;
        this.id = 'iframe_' + $.randomHash();
        var content = this.getPopoverContent();
        this.popover = $anchor.popover({
            // non-default container is required for block elements which has overflow.
            container: 'body',
            html: true,
            trigger: 'hover',
            placement: 'auto',
            content: this.getPopoverContent(),
        });
        this.popover.on('shown.bs.popover', function(ev) {
            return self.show(ev);
        });
    };

    scaledPreview.prototype.getPopoverContent = function() {
        var result;
        if (this.isObject) {
            result =
                '<object id="' + this.id + '" style="overflow:hidden; margin:0; padding:0;" data="' +
                this.$anchor.prop('href') + '"></object'
        } else {
            result =
                '<iframe sandbox="allow-same-origin allow-scripts allow-popups allow-forms" id="' + this.id +
                '"frameborder="0" scrolling="no" src="' +
                $.htmlEncode(this.$anchor.prop('href')) +
                '" class="transform-origin-0"></iframe>' +
                '<div class="link-preview-spinner"><img src="/static/img/loading.gif"></div>';
        }
        return result;
    };

    scaledPreview.prototype.show = function(ev) {
        // console.log('shown.bs.popover');
        var iframe = document.getElementById(this.id);
        var doc;
        try {
            doc = iframe.contentWindow.document;
        } catch (e) {
            // Usually means 'X-Frame-Options' is set to 'DENY' or to 'SAMEORIGIN'.
            return;
        }
        var $iframe = $(iframe);
        $iframe.parent().find('.link-preview-spinner').remove();
        var body = doc.body;
        // console.log('doc.location: ' + doc.location);
        // console.log('doc.location.hostname: ' + doc.location.hostname);
        if (doc.body === null) {
            if (doc.location.hostname == '') {
                // Embedded object loading random failure in Chrome 47.
                // Refresh the popover content to try load it again.
                $iframe.parent().html(this.getPopoverContent());
                return;
            }
            // console.log('doc.body is null');
            // Embedded object (not html / image); for example pdf
            // Fix works in Chrome 47. In Firefox 43 / IE 11 it is seem to very hard to fix.
            this.isObject = true;
            $iframe.parent()
            .css({
                'overflow': 'hidden',
                'margin': 0,
                'padding': 0,
            })
            .html(this.getPopoverContent());
            // Imitate document body without real iframe as popover-content parent.
            return;
        } else {
            // console.log('doc.body is not null');
        }
        // Rescale iframe document body to fit into popover-content.
        var width = $(body).width();
        var scrollWidth = body.scrollWidth;
        console.log('scrolWidth: ' + scrollWidth);
        console.log('width: ' + width);
        var containerHeight = $iframe.parent().height();
        if (scrollWidth > width) {
            var scale = width / scrollWidth;
            $iframe.css({
                'width': 100 / scale + '%',
                'height':  containerHeight / scale,
                '-webkit-transform' : 'scale(' + scale + ')',
                '-moz-transform'    : 'scale(' + scale + ')',
                '-ms-transform'     : 'scale(' + scale + ')',
                '-o-transform'      : 'scale(' + scale + ')',
                'transform'         : 'scale(' + scale + ')'
            });
        }
        $iframe.parent().height(containerHeight);
    };

    return this.each(function() {
        var $elem = $(this);
        if ($elem.prop('href') !== undefined) {
            new scaledPreview($elem);
        } else {
            $.each($elem.find('a'), function(k, anchor) {
                new scaledPreview($(anchor));
            });
        }
    });
};

/**
 * Change properties of bootstrap3 popover.
 */
$.fn.changePopover = function(opts) {
    return this.each(function() {
        for (var opt in opts) {
            if (opts.hasOwnProperty(opt)) {
                $(this).data('bs.popover').options[opt] = opts[opt];
            }
        }
    });
};

/**
 * Bootstrap3 popover notification.
 * Changes properties of bootstrap3 popover, show popover and move window scrollpos to related location hash.
 */
$.fn.toPopover = function(opts) {
    return this.each(function() {
        var $this = $(this);
        $this
        .changePopover(opts)
        .popover('show');
        window.location.hash = '#' + $this.prop('name');
    });
};

/**
 * Infinite virtual scroller plugin.
 * Another functionality of jQuery mobile is not used.
 */
$.fn.scroller = function(method) {

    var directions = ['top', 'bottom'];

    function Scroller(scroller) {
        this.scrollPadding = 20;
        // Milliseconds.
        this.scrollThrottleTime = 300;
        this.$scroller = $(scroller);
        this.getPos();
        if (this.$scroller.data('lastScrollTime') === undefined) {
            var lastScrollTime = {};
            for (var i = 0; i < directions.length; i++) {
                lastScrollTime[directions[i]] = 0;
            }
            this.$scroller.data('lastScrollTime', lastScrollTime);
        }
        this.$scroller.focus()
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

        Scroller.setLastScrollTime = function(direction) {
            // Scroller throttling to prevent ugly glitches.
            var lastScrollTime = this.$scroller.data('lastScrollTime');
            var currScrollTime = {};
            var now = Date.now();
            for (var i = 0; i < directions.length; i++) {
                currScrollTime[directions[i]] = (directions[i] === direction) ?
                    now : lastScrollTime[directions[i]];
            }
            this.$scroller.data('lastScrollTime', currScrollTime);
            return now - lastScrollTime[direction];
        };

        Scroller.getScrollTimeDelta = function(direction) {
            return Date.now() - this.$scroller.data('lastScrollTime')[direction];
        };

        Scroller.expand = function() {
            var padHeight = this.getScrollDelta() / 2 + this.scrollPadding;
            this.$scroller
            .css('padding-top', padHeight)
            .css('padding-bottom', padHeight);
            // Vertical padding expansion causes scrolling as side-effect, which may cause infinite expansion glitch.
            // Thus Scroller.trigger implements events throttling.
            // Observed in Chrome 46, not observed in Firefox 42. Painful in IE11.
        };

        Scroller.trigger = function(eventType) {
            /*
            if (this.maxHeight < this.scrollHeight) {
                // Element already has overflow.
                if (eventType !== 'scroll') {
                    console.log('Scroll: skipping repeating event type:' + eventType);
                    return;
                }
            }
            */
            console.log('Scroll: source event type: ' + eventType);
            if (this.scrollTopPos === 0) {
                var scrollTimeDelta = this.setLastScrollTime('top');
                if (scrollTimeDelta < this.scrollThrottleTime) {
                    // Too fast automated scrolling glitch.
                    console.log('Scroll: throttling top scroll: ' + scrollTimeDelta);
                } else {
                    console.log('Scroll:top, scrollTimeDelta:' + scrollTimeDelta);
                    this.$scroller.trigger('scroll:top');
                }
            }
            if (this.scrollBottomPos >= this.scrollHeight) {
                var scrollTimeDelta = this.setLastScrollTime('bottom');
                if (scrollTimeDelta < this.scrollThrottleTime) {
                    // Too fast automated scrolling glitch.
                    console.log('Scroll: throttling bottom scroll: ' + scrollTimeDelta);
                } else {
                    console.log('Scroll:bottom, scrollTimeDelta:' + scrollTimeDelta);
                    this.$scroller.trigger('scroll:bottom');
                }
            }
        };

    })(Scroller.prototype);

    return {
        'init': function() {
            return this.each(function() {
                var $this = $(this);
                // https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/tabindex
                // Make target focusable so arrow keys will also work.
                if ($this.prop('tabindex') !== undefined) {
                    $this.prop('tabindex', '-1');
                }
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
