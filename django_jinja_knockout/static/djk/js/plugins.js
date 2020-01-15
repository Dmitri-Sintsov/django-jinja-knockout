'use strict';

$ = (typeof $ === 'undefined') ? django.jQuery : $;

$.isMapping = function(v) {
    return typeof v === 'object' && v !== null;
};

$.isScalar = function(v) {
    var nonScalarTypes = ['object', 'undefined', 'function'];
    return (nonScalarTypes.indexOf(typeof(v)) === -1) || v === null;
};

$.intVal = function(s) {
    var i = parseInt(s);
    return isNaN(i) ? s : i;
};

$.capitalize = function(s) {
    if (s.length === 0) {
        return s;
    } else {
        return s.charAt(0).toUpperCase() + s.slice(1);
    }
};

// note: $.camelCase() is built-in function.
$.camelCaseToDash = function(value) {
    return value.replace( /([a-z])([A-Z])/g, '$1-$2' ).toLowerCase();
};

$.randomHash = function() {
    return Math.random().toString(36).slice(2);
};

$.inheritProps = function(parent, child) {
    for (var prop in parent) {
        if (parent.hasOwnProperty(prop) && !(prop in child)) {
            child[prop] = parent[prop];
        }
    }
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
        console.log(
            sprintf('selector is not found: "%s"', selector)
        );
    }
    return $selector;
};

/**
 * OrderedDict element.
 */
_.ODict = function(k, v) {
    this.k = k;
    this.v = v;
};

_.odict = function(k, v) {
    return new _.ODict(k, v);
};

_.recursiveMap = function(value, fn) {
    if (_.isArray(value)) {
        return _.map(value, function(v) {
            return _.recursiveMap(v, fn);
        });
    } else if (typeof value === 'object') {
        return _.mapObject(value, function(v) {
            return _.recursiveMap(v, fn);
        });
    } else {
        return fn(value);
    }
};


_.moveOptions = function(toObj, fromObj, keys) {
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var defVal = undefined;
        if (typeof key === 'object') {
            // tuple key / defVal.
            var k;
            for (k in key) {
                if (key.hasOwnProperty(k)) {
                    break;
                }
            }
            defVal = key[k];
            key = k;
        }
        if (typeof fromObj[key] !== 'undefined') {
            toObj[key] = fromObj[key];
            delete fromObj[key];
        } else if (defVal !== undefined) {
            toObj[key] = defVal;
        }
    }
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
    return $('<span>').html(contents).contents();
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

/**
 * Chain of multi-level inheritance.
 * An instance of $.SuperChain represents parent class context which may be nested.
 * Each context has following properties:
 *  .instance
 *     childInstance reference
 *  .proto
 *     prototype of ancestor class (parentPrototype)
 *  ._super
 *     null, when there is no more parent, instance of $.SuperChain when there are base parents.
 *     Deepest nested level of ._super._super is the context of top class prototype (context of base class).
 */
$.SuperChain = function(childInstance, parentPrototype) {
    /**
     * childInstance._super represents current parent call context, which originally matches
     * immediate parent but may be changed to deeper parents when calling nested _super.
     *
     * this.instance._superTop represents immediate parent call top context (immediate ancestor context).
     */
    this._super = null;
    if (typeof childInstance._superTop !== 'undefined') {
        var lastSuper = childInstance._superTop;
        while (lastSuper._super !== null) {
            lastSuper = lastSuper._super;
        }
        lastSuper._super = this;
    } else {
        childInstance._superTop = this;
        childInstance._super = this;
    }
    this.instance = childInstance;
    this.proto = parentPrototype;
    /**
     * Meta inheritance.
     * Copies parent object prototype methods into the instance of pseudo-child.
     */
    for (var k in parentPrototype) {
        if (parentPrototype.hasOwnProperty(k) && typeof childInstance[k] === 'undefined') {
            childInstance[k] = parentPrototype[k];
        }
    }
};

/**
 * Implements nested chains of prototypes (multi-level inheritance).
 */
void function(SuperChain) {

    /**
     * Find method / property among inherited prototypes from top (immediate ancestor) to bottom (base class).
     */
    SuperChain._find = function(name, hasOwnProto) {
        // Chain of multi-level inheritance.
        var hasProp = typeof this.proto[name] !== 'undefined';
        var atTopAndOwnProto = this === this.instance._superTop && !hasOwnProto;
        // Will return immediate _super property only when method is defined in instance own prototype.
        if (hasProp && !atTopAndOwnProto) {
            return this;
        }
        if (this._super !== null) {
            return this._super._find(name, hasOwnProto);
        } else {
            if (hasProp && atTopAndOwnProto) {
                // Fallback for _super methods which are not defined in instance own prototype.
                return this;
            } else {
                throw 'No such property: ' + name;
            }
        }
    };

    SuperChain.find = function(name) {
        // var instanceProto = this.instance.__proto__.
        var instanceProto = Object.getPrototypeOf(this.instance);
        return this._find(name, typeof instanceProto[name] !== 'undefined');
    };

    SuperChain.prop = function(name) {
        var context = this.find(name);
        return context.proto[name];
    };

    /**
     * Usage: this._super._call('methodName', arg1, .. argN);
     */
    SuperChain._call = function() {
        return this._apply(arguments[0], Array.prototype.slice.call(arguments, 1));
    };

    /**
     * Usage: this._super._apply('methodName', argsArray);
     */
    SuperChain._apply = function(methodName, args) {
        var context = this.find(methodName);
        var method = context.proto[methodName];
        if (typeof method !== 'function') {
            throw 'No such method: ' + methodName;
        }
        var callerSuper = this.instance._super;
        // Switch instance _super to context parent to allow nested _super._call() / _super._apply().
        this.instance._super = context._super;
        var result = method.apply(this.instance, args);
        this.instance._super = callerSuper;
        return result;
    };

}($.SuperChain.prototype);

/**
 * Multi-level inheritance should be specified in descendant to ancestor order.
 *
 * For example to inherit from base class App.ClosablePopover, then from immediate ancestor class App.ButtonPopover,
 * use the following code:
 *
 *  App.CustomPopover = function(options) {
 *      $.inherit(App.ButtonPopover.prototype, this);
 *      $.inherit(App.ClosablePopover.prototype, this);
 *      // this.init(options);
 *  };
 */
$.inherit = function(parentPrototype, childInstance) {
    new $.SuperChain(childInstance, parentPrototype);
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
    };

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


$.fn.highlightListUrl = function(location) {
    if (location === undefined) {
        var url = $(document.body).data('highlightUrl');
        if (url !== undefined) {
            location = $.parseUrl(url);
        } else {
            location = window.location;
        }
    }
    var $anchors = this.findSelf('ul.auto-highlight > li > a');
    var exactMatches = [];
    var searchMatches = [];
    var pathnameMatches = [];
    $anchors.each(function() {
        App.ui.highlightNav(this, false);
    });
    $anchors.each(function(k, a) {
        var a_pathname = a.pathname;
        if (a_pathname === location.pathname &&
            a.port === location.port &&
            a.hostname === location.hostname &&
            // Ignore anchors which actually have no 'href' with pathname defined.
            !a.getAttribute('href').match(/^#/)
        ) {
            if (a.search === location.search) {
                if (a.hash === location.hash) {
                    exactMatches.push(a);
                } else {
                    searchMatches.push(a);
                }
            } else {
                pathnameMatches.push(a);
            }
        }
    });
    if (exactMatches.length > 0) {
        for (var i = 0; i < exactMatches.length; i++) {
            App.ui.highlightNav(exactMatches[i], true);
        }
    } else if (searchMatches.length === 1) {
        App.ui.highlightNav(searchMatches[0], true);
    } else if (pathnameMatches.length === 1) {
        App.ui.highlightNav(pathnameMatches[0], true);
    }
};


/**
 * Change properties of Bootstrap popover.
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
 * Bootstrap popover notification.
 * Changes properties of Bootstrap popover, show popover and move window scrollpos to related location hash.
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
 * Get tip DOM elements for each selected popover.
 */
$.fn.getPopoverTip = function() {
    var result = [];
    this.each(function() {
        var data = $(this).data();
        if (typeof data['bs.popover'] === 'object' &&
                typeof data['bs.popover'].tip === 'function') {
            // Bootstrap 3
            var tip = data['bs.popover'].tip();
        } else {
            // Bootstrap 4
            var tip = $.id(
                $(this).attr('aria-describedby')
            );
        }
        if (tip.length > 0) {
            result.push(tip.get(0));
        }
    });
    return $(result);
};


/**
 * Checks whether Boostrap popover bound to selected element(s) is visible.
 */
$.fn.getVisiblePopovers = function() {
    var result = []
    this.each(function() {
        // Boostrap 3 uses '.in', Bootstrap 4 uses '.show'
        if ($(this).getPopoverTip().filter('.in, .show').length > 0) {
            result.push(this);
        }
    });
    return $(result);
};


$.fn.closeVisiblePopovers = function() {
    this.find('[data-toggle="popover"]').getVisiblePopovers().each(function() {
        var evt = $(this).data('trigger');
        if (evt !== undefined) {
            $(this).trigger(evt);
        } else {
            $(this).popover('hide');
        }
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

    void function(Scroller) {

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
