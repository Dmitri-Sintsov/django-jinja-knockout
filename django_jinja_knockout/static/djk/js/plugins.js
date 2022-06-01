$ = (typeof $ === 'undefined') ? django.jQuery : $;

$.randomHash = function() {
    return Math.random().toString(36).slice(2);
};

$.id = function(id) {
    // FF 54 generates warning when empty string is passed.
    if (typeof id !== 'string' || id === '') {
        return $();
    } else {
        // Support multiple ID's to detect content bugs.
        return $(document.querySelectorAll('#' + CSS.escape(id)));
    }
};

$.select = function(selector) {
    var $selector = $(selector);
    if ($selector.length === 0) {
        console.log('selector is not found: "' + selector + '"');
    }
    return $selector;
};

$.htmlEncode = function(value) {
	return $('<div>').text(value).html().replace(/&nbsp;/g, '\xa0');
};

$.htmlDecode = function(value) {
	return $('<div>').html(value).text();
};

// Create jQuery DOM nodes from arbitrary text contents.
// Do not use $(contents) as $() is supposed to accept only top-level tags or jQuery selectors, not arbitrary text.
$.contents = function(contents, initCustomElements) {
    var $contents = $('<span>').html(contents).contents();
    if (initCustomElements) {
        // https://stackoverflow.com/questions/55791168/initialisation-of-custom-elements-inside-document-fragment
        // Append fragment to document so the custom elements are properly initialized,
        // otherwise nested components test will fail):
        /*
        var $span = $('span').css({'display': 'none'});
        $span.appendTo('body');
        $contents.appendTo($span);
        $contents.detach();
        $span.remove();
        */
        $contents.appendTo('body');
        $contents.detach();
    }
    return $contents;
};

$.parseUrl = function(url) {
    var result = {};
    var parser = document.createElement('a');
    parser.href = url;
    var props = ['protocol', 'host', 'hostname', 'port', 'href', 'hash', 'search'];
    for (var i = 0; i < props.length; i++) {
        result[props[i]] = parser[props[i]];
    }
    // IE pathname fix.
    result.pathname = (parser.pathname.charAt(0) !== '/' ? '/' : '') + parser.pathname;
    // IE lt 11 does not support .remove().
    if (typeof parser.remove === 'function') {
        parser.remove();
    }
    return result;
};

// Bind instance of Javascript object to DOM element.
$.fn.addInstance = function(key, instance) {
    return this.each(function() {
        var $this = $(this);
        var data = $this.data('Instance');
        if (data === undefined) {
            data = {};
        }
        if (typeof data[key] !== 'undefined') {
            throw 'Element already has instance with key "' + key + '"';
        }
        data[key] = instance;
        $this.data('Instance', data);
    });
};

// Get instance of Javascript object previously bound to DOM element.
$.fn.getInstance = function(key, pop) {
    if (typeof pop === 'undefined') {
        pop = false;
    }
    var $this = $(this[0]);
    var data = $this.data('Instance');
    if (data === undefined || typeof data[key] === 'undefined') {
        return undefined;
    }
    var result = data[key];
    if (pop) {
        delete data[key];
        $this.data('Instance', data);
    }
    return result;
};

// Get instance of Javascript object previously bound to DOM element.
$.fn.popInstance = function(key) {
    var $this = $(this[0]);
    return $this.getInstance(key, true);
};

$.fn.findSelf = function(selector) {
    var result = this.find(selector);
    return (this.is(selector)) ?
        result.add(this) : result;
};

$.fn.replaceWithTag = function(tagName) {
    var result = [];
    this.each(function() {
        var newElem = $('<' + tagName + '>').get(0);
        for (var i = 0; i < this.attributes.length; i++) {
            newElem.setAttribute(
                this.attributes[i].name, this.attributes[i].value
            );
        }
        newElem = $(this).wrapInner(newElem).children(0).unwrap().get(0);
        result.push(newElem);
    });
    return $(result);
};

$.fn.dataHref = function() {
    this.findSelf('[data-href]').on('click', function(ev) {
        window.location.href = $(this).data('href');
    });
    return this;
};

$.fn.scrollableParent = function() {
    var $parents = this.parents();

    var $scrollable = $parents.filter(function(idx) {
        return this.scrollHeight > this.offsetHeight && this.offsetWidth !== this.clientWidth;
    }).first();

    if ($scrollable.length === 0) {
        $scrollable = $('html, body');
    }
    return $scrollable;
};

$.fn.autogrow = function(method) {

    function updateAutogrow(ev) {
        $(ev.target).autogrow('update');
    }

    return {
        'init' : function() {
            this.findSelf('textarea.autogrow')
            .data('autogrowInit', true)
            .autogrow('update')
            .on('click keyup input paste', updateAutogrow);
        },
        'destroy' : function() {
            this.findSelf('textarea.autogrow')
            .removeData('autogrowInit')
            .off('click keyup input paste', updateAutogrow);
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

    function updateInput(ev) {
        $(ev.target).optionalInput('update');
    }

    return {
        'init' : function() {
            this.find('.optional-input[type="checkbox"]')
            // Next line is required because Django 1.8 MultiWidget does not allow to set css classes of child widgets separately.
            .prop('class', 'optional-input')
            .data('optionalInputInit', true)
            .optionalInput('update')
            .on('change', updateInput);
        },
        'destroy' : function() {
            this.find('.optional-input[type="checkbox"]')
            // Next line is required because Django 1.8 MultiWidget does not allow to set css classes of child widgets separately.
            .removeProp('class')
            .removeData('optionalInputInit')
            .off('change', updateInput);
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
 * Client-side support to render_field_multiple() Jinja2 macro (list of checkboxes / radiobuttons).
 * Used with RadioSelect / CheckboxSelectMultiple Django widgets.
 */
$.fn.inputAsSelect = function(method) {

    function getInputs(self) {
        return self.findSelf('.input-as-select')
            .find('input[type="checkbox"], input[type="radio"]');
    };

    function updateLabels($inputs) {
        $inputs.filter(':checked').parent('label').addClass('selected');
        $inputs.filter(':not(:checked)').parent('label').removeClass('selected');
    };

    function highlightSelection(ev) {
        $(ev.target).closest('.input-as-select').inputAsSelect('update');
    };

    return {
        'init' : function() {
            var $inputs = getInputs(this);
            updateLabels($inputs);
            $inputs.on('change', highlightSelection);
        },
        'update': function() {
            var $inputs = getInputs(this);
            updateLabels($inputs);
        },
        'destroy' : function() {
            getInputs(this).off('change', highlightSelection);
        },
    }[method].call(this);
};

/**
 * Bootstrap plugin to use input-group-append control to prefill input-group with dropdown-menu values.
 * Server-side html part is generated by widgets.PrefillWidget.
 */
$.fn.prefillField = function(method) {

    function getAddons(self) {
        return self.findSelf('.prefill-field');
    };

    function setSelectedChoice($selectedChoice) {
        var matches = $selectedChoice.parents('.prefill-field').prop('id').split(/-PREFILL_CHOICES$/g);
        if (matches.length === 2) {
            var $fillingInput = $.id(matches[0]);
            if ($fillingInput.hasClass('optional-input-wrap')) {
                var $inputs = $fillingInput.find('.optional-input');
                if (!$inputs.eq(0).prop('checked')) {
                    $inputs.eq(0).click();
                }
                $fillingInput = $inputs.eq(1);
            }
            $fillingInput.val($selectedChoice.text());
            if ($fillingInput.hasClass('autogrow')) {
                $fillingInput.autogrow('update');
            }
        }
    };

    function prefillChoice(ev) {
        var $target = $(ev.target);
        if ($target.hasClass('prefill-field input-group-append')) {
            ev.stopPropagation();
            $target.find('.dropdown-toggle').dropdown('toggle');
        } else if ($target.prop('tagName') === 'A') {
            setSelectedChoice($target);
        }
    };

    function showDropdown(ev) {
        var $invoker = $(ev.relatedTarget);
        $invoker.children('.iconui')
        .removeClass('iconui-chevron-down').addClass('iconui-chevron-up');
    };

    function hideDropdown(ev) {
        var $invoker = $(ev.relatedTarget);
        $invoker.children('.iconui')
        .removeClass('iconui-chevron-up').addClass('iconui-chevron-down');
    };

    return {
        'init' : function() {
            var $addons = getAddons(this);
            /**
             * http://getbootstrap.com/javascript/#dropdowns
             * All dropdown events are fired at the .dropdown-menu's parent element.
             */
            var $toggle = $addons.find('.dropdown-menu').parent();
            $addons.on('click', prefillChoice);
            $toggle.on('show.bs.dropdown', showDropdown)
            .on('hide.bs.dropdown', hideDropdown);
        },
        'destroy' : function() {
            var $addons = getAddons(this);
            var $toggle = $addons.find('.dropdown-menu').parent();
            $addons.off('click', prefillChoice);
            $toggle.off('show.bs.dropdown', showDropdown)
            .off('hide.bs.dropdown', hideDropdown);
        },
    }[method].call(this);

};

/**
 * Display submit button enclosed into .submit-group when the length of input.activates-submit-group text > 0.
 */
$.fn.collapsibleSubmit = function(method) {

    function updateCollapsible(ev) {
        var $input = $(this).closest('.activates-submit-group')
        .data('collapsibleSubmitInit', true)
        .collapsibleSubmit('update');
    };

    return {
        // Applied to outer container.
        'init' : function() {
            this.find('.activates-submit-group')
            .data('collapsibleSubmitInit', true)
            .collapsibleSubmit('update')
            .on('keyup input paste', updateCollapsible);
        },
        // Applied to outer container.
        'destroy' : function() {
            this.find('.activates-submit-group')
            // off() does not work in jQuery 1.11.3 / Chrome 51.0.2704.63 (64-bit) for Linux,
            // thus using less reilable unbind() instead.
            // .off('keyup input paste', updateCollapsible)
            .unbind('keyup input paste')
            .removeData('collapsibleSubmitInit');
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

/**
 * Display href link targets in bootstrap popover sandboxed iframe.
 *
 * Set .link-preview DOM element html5 data attribute 'tipCSS' to modify popover css, for example
 * to override popover z-index originally hidden by BootstrapDialog with higher z-index.
 */
$.fn.linkPreview = function(method) {

    var scaledPreview = function($anchor) {
        this.create($anchor);
    };

    void function(scaledPreview) {

        scaledPreview.enabledLocalHrefs = [
            // These extensions should be previewed locally.
            /\.(jpg|jpeg|gif|png|pdf)$/i
        ];

        scaledPreview.disabledRemoteHrefs = [
            // These remote extensions are known to cause glitches during preview.
            /\.(docx|dwg|xslx|zip|rar|gz|tgz)$/i
        ];

        scaledPreview.shouldEnable = function() {
            var anchor = this.$anchor.get(0);
            var isLocalDomain = anchor.hostname === window.location.hostname &&
                anchor.port === window.location.port;
            var patterns = (isLocalDomain) ? this.enabledLocalHrefs : this.disabledRemoteHrefs;
            for (var i = 0; i < patterns.length; i++) {
                var match = anchor.pathname.match(patterns[i]) !== null;
                if (isLocalDomain) {
                    if (match) {
                        return true;
                    }
                } else {
                    if (match) {
                        return false;
                    }
                }
            }
            return !isLocalDomain;
        };

        scaledPreview.create = function($anchor) {
            var self = this;
            this.$anchor = $anchor;
            this.hasPopover = this.shouldEnable();
            if (!this.hasPopover) {
                return;
            }
            this.href = this.$anchor.prop('href');
            this.$anchor.addInstance('scaledPreview', this);
            this.isObject = false;
            this.scale = 1;
            this.id = 'iframe_' + $.randomHash();
            var content = this.getPopoverContent();
            $anchor.popover({
                // non-default container is required for block elements which has overflow.
                container: 'body',
                html: true,
                trigger: 'hover',
                placement: 'auto',
                content: this.getPopoverContent(),
            });
            $anchor.on('shown.bs.popover', function(ev) {
                var tipCSS = self.$anchor.data('tipCSS');
                if (tipCSS !== undefined) {
                    self.$anchor.data('bs.popover').$tip.css(tipCSS);
                }
                return self.show(ev);
            });
        };

        scaledPreview.destroy = function() {
            if (!this.hasPopover) {
                return;
            }
            this.$anchor.unbind('shown.bs.popover');
            // https://github.com/twbs/bootstrap/issues/475
            this.$anchor.popover('hide');
            this.$anchor.popover('disable');
            var iframe = document.getElementById(this.id);
            if (iframe !== null) {
                $(iframe).remove();
            }
            this.hasPopover = false;
        };

        scaledPreview.getPopoverContent = function() {
            var result;
            if (this.isObject) {
                result =
                    '<object id="' + this.id + '" style="overflow:hidden; margin:0; padding:0;" data="' +
                    this.href + '"></object'
            } else {
                result =
                    '<iframe sandbox="allow-same-origin allow-scripts allow-popups allow-forms" id="' + this.id +
                    '"frameborder="0" scrolling="no" src="' +
                    $.htmlEncode(this.href) +
                    '" class="transform-origin-0"></iframe>' +
                    '<div class="link-preview-spinner"><img src="/static/djk/img/loading.gif"></div>';
            }
            return result;
        };

        scaledPreview.show = function(ev) {
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

    }(scaledPreview.prototype);

    return {
        init: function() {
            return this.each(function() {
                var $elem = $(this);
                if ($elem.prop('href') !== undefined) {
                    new scaledPreview($elem);
                } else {
                    $elem.find('a').each(function(k, anchor) {
                        new scaledPreview($(anchor));
                    });
                }
            });
        },
        destroy: function() {
            return this.each(function() {
                var $elem = $(this);
                if ($elem.prop('href') !== undefined) {
                    var scaledPreview = $elem.popInstance('scaledPreview');
                    if (scaledPreview !== undefined) {
                        scaledPreview.destroy();
                    }
                } else {
                    $elem.find('a').each(function(k, anchor) {
                        var scaledPreview = $(anchor).popInstance('scaledPreview');
                        if (scaledPreview !== undefined) {
                            scaledPreview.destroy();
                        }
                    });
                }
            });
        }
    }[method].call(this);

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

    } void function(Scroller) {

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

    }(Scroller.prototype);

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
        'destroy': function() {
            return this.each(function() {
                var $this = $(this);
                $this.unbind('scroll wheel touchstart');
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
