import { isArray } from './lib/underscore-esm.js';
import { sprintf } from './lib/sprintf-esm.js';

import { isMapping, capitalize } from './dash.js';
import { splitPropChain, propGet, propGetParent } from './prop.js';
import { initClient } from './initclient.js';

function replaceInto(element, value) {
    var prepend = $(element).find('.preserve-prepend').detach();
    var append = $(element).find('.preserve-append').detach();
    $(element).empty().append(value);
    var immediateChildren = $(element).children('*');
    if (immediateChildren.length !== 1) {
        immediateChildren = $(element);
    }
    if (prepend.length > 0) {
        prepend.prependTo(immediateChildren);
    }
    if (append.length > 0) {
        append.appendTo(immediateChildren);
    }
}

function useKo(ko) {
    // https://github.com/knockout/knockout/issues/1019
    ko.forcibleComputed = function(readFunc, context, options) {
        var trigger = ko.observable().extend({notify: 'always'}),
            target = ko.computed(function() {
                trigger();
                return readFunc.call(context);
            }, null, options);
        target.evaluateImmediate = function() {
            trigger.valueHasMutated();
        };
        return target;
    };


    ko.utils.setProps = function(src, dst) {
        $.each(src, function(k, v) {
            if (typeof dst[k] === 'function') {
                dst[k](v);
            } else if (typeof dst[k] === 'object' && typeof src[k] === 'object' &&
                    !isArray(dst) && !isArray(src)
            ) {
                ko.utils.setProps(src[k], dst[k]);
            } else {
                dst[k] = v;
            }
        });
    };

    // Sparse bindings support.
    ko.applySelector = function(component, selector) {
        if (typeof selector === 'undefined') {
            selector = component.componentSelector;
        }
        $(selector).each(function(k, rootNode) {
            ko.applyBindings(component, rootNode);
        });
    };

    // Sparse bindings support.
    ko.cleanSelector = function(component, selector) {
        if (typeof selector === 'undefined') {
            selector = component.componentSelector;
        }
        if (typeof selector !== 'undefined') {
            $(selector).each(function(k, rootNode) {
                ko.cleanNode(rootNode);
            });
        }
    };

    /**
     * Use in knockout.js binding handlers that support virtual elements to get real bound DOM element.
        update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            var realElement = ko.fromVirtual(element);
            ...
        }
     */
    ko.fromVirtual = function(element) {
        var realElement = ko.virtualElements.firstChild(element);
        while (realElement !== null && realElement.nodeType !== 1) {
            realElement = ko.virtualElements.nextSibling(realElement);
        }
        return realElement;
    };

    // Use with care. Do not put custom bindings into documentReadyHooks,
    // there are ko.bindingHandlers for that.
    ko.bindingHandlers.initclient = {
        init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            initClient(element);
            ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
                initClient(element, 'dispose');
            });
        },
    };

    // Usage: <textarea data-bind="autogrow: {rows: 4}"></textarea>
    // @note: Currently is unused in script#messaging_dialog, due to dialog / messages vertical overflow issues.
    ko.bindingHandlers.autogrow = {
        init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            $(element).addClass('autogrow').prop('rows', valueAccessor().rows).autogrow('init');
            ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
                $(element).removeClass('autogrow').autogrow('destroy');
            });
        }
    };

    // Usage: <div data-bind="replaceInto: arbitraryValue"></div>
    ko.bindingHandlers.replaceInto = {
        update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            var value = valueAccessor();
            replaceInto(element, value);
        }
    };

    // Usage: <div data-bind="html: text, linkPreview"></div>
    ko.bindingHandlers.linkPreview = {
        init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            $(element).linkPreview('init');
            ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
                $(element).linkPreview('destroy');
            });
        }
    };

    // Usage: <textarea data-bind="focus"></textarea>
    ko.bindingHandlers.focus = {
        init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            var focus = function(ev) {
                $(element).focus();
            };
            $(element).on('mouseenter', focus);
            ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
                $(element).off('mouseenter', focus);
            });
        }
    };

    // Set observable property value to bound DOM element.
    // data-bind="element: viewmodel_property_name_to_store_bound_dom_element"
    ko.bindingHandlers.element = {
        init: function(element, valueAccessor) {
            valueAccessor()(element);
        }
    };

    // Usage: <div class="rows" data-bind="scroller: {top: 'loadPreviousRows', bottom: 'loadNextRows'}">
    ko.bindingHandlers.scroller = {
        init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            viewModel.$scroller = $(element);
            viewModel.$scroller.scroller('init')
            .on('scroll:top', function(ev) {
                viewModel[valueAccessor()['top']]();
            })
            .on('scroll:bottom', function(ev) {
                viewModel[valueAccessor()['bottom']]();
            });
        }
    };
}


/**
 * Switches Knockout.js subscription to bound instance methods.
 * https://django-jinja-knockout.readthedocs.io/en/latest/quickstart.html#knockout-js-subscriber
 */
function Subscriber() {

} void function(Subscriber) {

    Subscriber.getPropSubscription = function(propChain, methodChain) {
        propChain = splitPropChain(propChain);
        if (typeof methodChain === 'undefined') {
            var propHash = (typeof propChain === 'string') ? capitalize(propChain) : '_' + propChain.join('_');
            methodChain = 'on' + propHash;
        }
        var prop = propGet(this, propChain);
        if (typeof prop !== 'function' || !ko.isObservable(prop)) {
            var parent = propGetParent(this, propChain);
            if (typeof ko.es5 !== 'undefined' &&
                    isMapping(parent.obj) &&
                    ko.es5.isTracked(parent.obj, parent.childName)
            ) {
                prop = ko.getObservable(parent.obj, parent.childName);
            } else {
                throw new Error(
                    sprintf("%s is not observable", JSON.stringify(propChain))
                );
            }
        }
        var method = propGet(this, methodChain);
        if (typeof method !== 'function') {
            throw new Error(
                sprintf("%s is not callable", JSON.stringify(methodChain))
            );
        }
        var hash = (typeof methodChain === 'string') ? methodChain : methodChain.join('.');
        if (typeof this.koSubscriptions === 'undefined') {
            this.koSubscriptions = {};
        }
        return {'prop': prop, 'method': method, 'hash': hash};
    };

    /**
     * Subscribe / unsubscribe observables for Knockout.js in easy way.
     * Binds subscriptions to instanse method with prefix 'on*' by default.
     * this.from = ko.observable()
     *   propChain = 'from' subscribes to this.onFrom() method.
     * this.meta.rowsPerPage = ko.observable()
     *   propChain = 'meta.rowsPerPage' subscribes to this.on_meta_rowsPerPage() method.
     */
    Subscriber.subscribeToMethod = function(propChain, methodChain) {
        var result = this.getPropSubscription(propChain, methodChain);
        if (typeof this.koSubscriptions[result.hash] === 'undefined') {
            this.koSubscriptions[result.hash] = result.prop.subscribe(result.method, this);
        }
    };

    Subscriber.disposeMethod = function(propChain, methodChain) {
        var result = this.getPropSubscription(propChain, methodChain);
        if (typeof this.koSubscriptions[result.hash] !== 'undefined') {
            this.koSubscriptions[result.hash].dispose();
            delete this.koSubscriptions[result.hash];
        }
    };

}(Subscriber.prototype);

export { useKo, Subscriber };
