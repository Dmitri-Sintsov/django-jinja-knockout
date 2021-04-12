import { isArray, size } from './lib/underscore-esm.js';
import { ODict } from './dash.js';
import { propGet, propByPath } from './prop.js';
import { globalIoc } from './ioc.js';
import { blockTags } from './ui.js';

/**
 * Render nested Javascript structures as nested DOM nodes.
 */
function NestedList(options) {
    this.init(options);
};

void function(NestedList) {

    NestedList.init = function(options) {
        if (typeof options !== 'object') {
            options = {};
        }
        this.fn = (typeof options.fn === 'undefined') ? 'text' : options.fn; // 'html'
        this.keyPrefix = (typeof options.keyPrefix === 'undefined') ? '' : options.keyPrefix;
        this.keyPath = [];
        if (typeof options.blockTags === 'undefined') {
            this.blockTags = blockTags.list;
        } else if (isArray(options.blockTags)) {
            this.blockTags = options.blockTags;
        } else if (typeof options.blockTags === 'string') {
            this.blockTags = propByPath(options.blockTags);
        } else {
            console.log('Invalid type of options.blockTags: ' + typeof(options.blockTags));
        }
        this.level = (typeof options.level === 'undefined') ? 0 : options.level;
        this.showKeys = (typeof options.showKeys === 'undefined') ? false : options.showKeys;
        this.i18n = (typeof options.i18n === 'undefined') ? undefined : options.i18n;
    };

    NestedList.getListContainer = function(level) {
        return $(this.blockTags[level].enclosureTag)
            .addClass(this.blockTags[level].enclosureClasses);
    };

    NestedList.getElementContainer = function(k, v, level) {
        return $(this.blockTags[level].itemTag)
            .addClass(this.blockTags[level].itemClasses)
    };

    NestedList.renderValue = function(k, v, fn, level) {
        var localKey;
        if (typeof k === 'string' && this.showKeys) {
            if (typeof this.i18n === 'object') {
                var localPath = this.keyPath.join('›');
                if (typeof this.i18n[localPath] !== 'undefined') {
                    localKey = this.i18n[localPath];
                } else if (this.keyPrefix !== '' &&
                        typeof this.i18n[this.keyPrefix + '›' + localPath] !== 'undefined') {
                    localKey = this.i18n[this.keyPrefix + '›' + localPath];
                } else if (localPath !== k && typeof this.i18n[k] !== 'undefined') {
                    localKey = this.i18n[k];
                } else {
                    localKey = k;
                }
            } else {
                localKey = k;
            }
            if (v instanceof jQuery) {
                // Clone nodes, otherwise the consequitive recursive rendering will accumulate the same nodes.
                v = v.clone();
            } else {
                fn = 'append';
                v = $('<span>').text(v);
            }
            v.prepend(
                $(this.blockTags[level].localKeyTag, {
                    'class': this.blockTags[level].localKeyClasses,
                }).text(localKey)
            );
        }
        var $li = this.getElementContainer(k, v, level)[fn](v);
        return $li;
    };

    /**
     * Render scalar element as plain html or as nested list of specified block tags.
     */
    NestedList.render = function(element, value, fn, level) {
        var self = this;
        var curr_fn = (fn === undefined) ? this.fn : fn;
        fn = curr_fn;
        if (level === undefined) {
            level = 0;
        }
        var $element = $(element);
        if (typeof value !== 'object') {
            $element[fn](value);
            return;
        }
        if (size(value) > 0) {
            var $ul = this.getListContainer(level);
            $.each(value, function(k, v) {
                fn = curr_fn;
                var isNested = false;
                if (v instanceof ODict) {
                    k = v.k;
                    v = v.v;
                }
                if (typeof k === 'string') {
                    self.keyPath.push(k);
                }
                if (v instanceof jQuery) {
                    fn = 'append';
                } else if (typeof v ==='object') {
                    var nextLevel = (level < self.blockTags.length - 1) ? level + 1 : level;
                    isNested = true;
                    self.render($ul, v, fn, nextLevel);
                }
                if (!isNested) {
                    var $li = self.renderValue(k, v, fn, level);
                    $ul.append($li);
                }
                if (typeof k === 'string') {
                    self.keyPath.pop();
                }
            });
            $element.append($ul);
        }
        return $element;
    };

}(NestedList.prototype);


function renderNestedList(element, value, options) {
    var result = globalIoc.factory('NestedList', options).render(element, value);
    if (propGet(options, 'unwrapTop')) {
        // var unwrap = result.children('*');
        var unwrap = result.children();
        if (unwrap.length > 1) {
            throw new Error('unwrapTop requires single top node');
        } else if (unwrap.length === 0) {
            return result;
        } else {
            return unwrap;
        }
    } else {
        return result;
    }
};


/**
 * Supports jQuery objects, nested structures rendering and scalar values.
 */
function renderValue(element, value, getOptions) {
    if (value instanceof jQuery) {
        $(element).empty().append(value);
    } else {
        var options;
        if (typeof getOptions === 'function') {
            options = getOptions();
        } else {
            options = $.extend({}, getOptions);
        }
        if (typeof options.fn === 'undefined') {
            // "safe" by default. use "text" for "unsafe".
            options.fn = 'html';
        }
        if (typeof value === 'object') {
            $(element).empty();
            renderNestedList(element, value, options);
        } else {
            // Primarily use is to display server-side formatted strings (Djano local date / currency format).
            $(element)[options.fn](value);
        }
    }
};

export { NestedList, renderNestedList, renderValue };
