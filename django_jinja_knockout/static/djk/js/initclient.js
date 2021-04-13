import { isArray } from './lib/underscore-esm.js';
import { intVal } from './dash.js';
import { propGet } from './prop.js';

function OrderedHooks(hooks) {

    this.init(hooks);

} void function(OrderedHooks) {

    OrderedHooks.init = function(hooks) {
        this.weightIndex = {};
        this.hooks = [];
        if (isArray(hooks)) {
            for (var i = 0; i < hooks.length; i++) {
                this.add(hooks[i]);
            }
        }
    };

    OrderedHooks.add = function(hook) {
        if (typeof hook == 'function') {
            // Non-disposable 'init'.
            hook = {
                'init': hook,
                'dispose': false,
            };
        }
        if (typeof hook.weight === 'undefined') {
            hook.weight = 0;
        }
        var weightPos = propGet(this.weightIndex, hook.weight);
        if (weightPos === undefined) {
            for (weightPos = 0; weightPos < this.hooks.length; weightPos++) {
                if (this.hooks[weightPos].weight > hook.weight) {
                    break;
                }
            }
        } else {
            weightPos = intVal(weightPos);
        }
        if (weightPos === this.hooks.length) {
            this.hooks.push(hook);
        } else {
            this.hooks.splice(weightPos, 0, hook);
        }
        this.weightIndex[hook.weight] = weightPos + 1;
        for (var k in this.weightIndex) {
            if (this.weightIndex.hasOwnProperty(k) && intVal(k) > hook.weight) {
                this.weightIndex[k]++;
            }
        }
    };

    OrderedHooks.execHook = function($selector, hook, method) {
        var fn = hook[method];
        if (typeof fn === 'function') {
            fn($selector);
        } else if (fn !== false) {
            throw new Error(
                sprintf("initClient hook must be a function or object with key '%s'", method)
            );
        }
    };

    OrderedHooks.exec = function($selector, method) {
        for (var i = 0; i < this.hooks.length; i++) {
            this.execHook($selector, this.hooks[i], method);
        }
    };

    OrderedHooks.reverseExec = function($selector, method) {
        for (var i = this.hooks.length - 1; i >= 0; i--) {
            this.execHook($selector, this.hooks[i], method);
        }
    };

}(OrderedHooks.prototype);

var initClientHooks = new OrderedHooks();

/**
 * @note: Do not forget to call method=='init' for newly loaded AJAX DOM.
 * Dispose is not supposed to restore DOM to original state, rather it is supposed to remove event handlers
 * and bootstrap widgets, to minimize memory leaks, before DOM nodes are emptied.
 */
function initClient(selector, method, reverse) {

    if (typeof selector === 'undefined') {
        throw new Error('initClient requires valid selector as safety precaution.');
    }
    if (typeof method === 'undefined') {
        method = 'init';
    }
    if (method === 'init') {
        reverse = false;
    } else if (method === 'dispose') {
        reverse = true;
    }
    if (typeof reverse === 'undefined') {
        reverse = false;
    }

    var $selector = $(selector);
    if (reverse) {
        initClientHooks.reverseExec($selector, method);
    } else {
        initClientHooks.exec($selector, method);
    }
}

function initClientMark(html) {
    return '<span class="init-client-begin"></span>' + html + '<span class="init-client-end"></span>';
}

function initClientApply(selector, method) {
    var $selector = $(selector);
    if (typeof method === 'undefined') {
        method = 'init';
    }
    var markerBegin = method + '-client-begin';
    var markerEnd = method + '-client-end';
    if ($selector.findSelf('.' + markerBegin).length === 0) {
        $selector = $selector.parent();
        if ($selector.find('.' + markerBegin).length === 0) {
            return initClient(selector, method);
        }
    }
    $selector.findSelf('.' + markerBegin).each(function(k, v) {
        // todo: check unbalanced trees.
        initClient($(v).nextUntil('.' + markerEnd), method);
    });
    if (method === 'init') {
        $selector.findSelf('.' + markerBegin).removeClass(markerBegin).addClass('dispose-client-begin');
        $selector.find('.' + markerEnd).removeClass(markerEnd).addClass('dispose-client-end');
    } else if (method === 'dispose') {
        $selector.findSelf('.' + markerBegin).remove();
        $selector.find('.' + markerEnd).remove();
    }
}

export { initClientHooks, initClient, initClientMark, initClientApply };
