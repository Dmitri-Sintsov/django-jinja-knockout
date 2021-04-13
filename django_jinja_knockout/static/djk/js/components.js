import { globalIoc } from './ioc.js';

/**
 * Nested components support.
 * Detaches / reattaches inner component DOM nodes to avoid overlapped binding of outer component.
 *
 * Supported:
 *     single DOM subtree nested components;
 *     sparse components which may include single DOM subtree nested components;
 * Unsupported:
 *     nested sparse components;
 */
function ComponentManager(options) {

    this.init(options);

} void function(ComponentManager) {

    ComponentManager.init = function(options) {
        this.elem = options.elem;
        this.$nestedComponents = [];
        this.$selector = $(this.elem);
        if (this.$selector.data('componentSelector') !== undefined) {
            // Sparse component that contains separate multiple DOM subtrees.
            this.$selector = $(this.$selector.data('componentSelector'));
        }
    };

    ComponentManager.getSelector = function() {
        return this.$selector;
    };

    ComponentManager.each = function(fn) {
        return this.$selector.each(fn);
    };

    // Do not rebind nested components multiple times.
    ComponentManager.detachNestedComponents = function() {
        this.$nestedComponents = this.$selector.find('.component');
        this.$nestedComponents.each(function(k, v) {
            var $v = $(v);
            var $tmpElem = $('<span>')
            .addClass('nested-component-stub')
            .data('nestedComponentIdx', k);
            $v.after($tmpElem);
            $v.data('isDetachedComponent', true).detach();
        });
    };

    ComponentManager.reattachNestedComponents = function() {
        var self = this;
        this.$selector.find('.nested-component-stub').each(function() {
            var $this = $(this);
            var $detachedComponent = $(self.$nestedComponents[$this.data('nestedComponentIdx')]);
            $detachedComponent.removeData('isDetachedComponent');
            $this.replaceWith($detachedComponent);
        });
    };

}(ComponentManager.prototype);

/**
 * Auto-instantiated Javascript classes bound to selected DOM elements.
 * Primarily used with Knockout.js bindings, although is not limited to.
 *     'data-component-class' html5 attribute used as Javascript class path;
 *     'data-component-options' html5 attribute used as an argument of class constructor;
 *     'data-component-selector' html5 attribute used to define sparse component selector;
 *     'data-event' html5 attribute optionally specifies DOM event used to instantiate class;
 *         otherwise, the class is instantiated when DOM is ready;
 */
function Components() {

    this.init();

} void function(Components) {

    Components.init = function() {
        this.list = [];
    };

    Components.create = function(elem) {
        var $elem = $(elem);
        if ($elem.data('componentIdx') !== undefined) {
            throw new Error(
                sprintf('Component already bound to DOM element with index %d', $elem.data('componentIdx'))
            );
        }
        var classPath = $elem.data('componentClass');
        if (classPath === undefined) {
            console.log('Current $elem is not component node: ' + $elem.prop('outerHTML'));
            console.dir($elem);
            return null;
        } else {
            var options = $.extend({}, $elem.data('componentOptions'));
            if (typeof options !== 'object') {
                console.log('Skipping .component with invalid data-component-options');
                return;
            }
            if (classPath === undefined) {
                throw new Error('Undefined data-component-class classPath.');
            }
            var component = globalIoc.factory(classPath, options);
            return component;
        }
    };

    Components.getFreeIdx = function() {
        var freeIdx = this.list.indexOf(null);
        if (freeIdx  === -1) {
            freeIdx = this.list.length;
        }
        return freeIdx;
    };

    Components.bind = function(desc, elem, componentIdx) {
        $(elem).data('componentIdx', componentIdx);
        this.list[componentIdx] = desc;
    };

    /**
     * Note: when using nested components instantiated via DOM events, inner components will be detached
     * until the outer DOM event handler fires. To avoid that do not use 'data-event' attribute, attach the DOM handlers
     * in component.runComponent() code instead.
     */
    Components.run = function(desc, cm) {
        var self = this;
        var freeIdx = this.getFreeIdx();
        cm.each(function(k, elem) {
            self.bind(desc, elem, freeIdx);
        });
        desc.component.runComponent(cm.$selector);
        cm.reattachNestedComponents();
    };

    Components.add = function(elem, evt) {
        var self = this;
        var desc;
        var cm = new ComponentManager({'elem': elem});
        var $selector = cm.getSelector();
        cm.detachNestedComponents();
        if (typeof evt === 'undefined') {
            desc = {'component': this.create(elem)};
            if (desc.component !== null) {
                this.run(desc, cm);
            }
        } else {
            desc = {'event': evt};
            desc.handler = function() {
                try {
                    // Re-use already bound component, if any.
                    var component = self.get(elem);
                    component.runComponent($selector);
                } catch (e) {
                    desc.component = self.create(elem);
                    if (desc.component !== null) {
                        self.run(desc, cm);
                    }
                }
            };
            if (desc.component !== null) {
                $selector.on(desc.event, desc.handler);
            }
        }
    };

    Components.get = function(elem) {
        var $elem = $(elem);
        var componentIdx = $elem.data('componentIdx');
        if (componentIdx === undefined) {
            throw new Error('Supplied element has no bound component.');
        }
        return this.list[componentIdx].component;
    };

    Components.getById = function(id) {
        var elem = document.getElementById(id);
        if (elem === null) {
            throw new Error(
                sprintf('Unknown id of component element: "%s"', id)
            );
        }
        return this.get(elem);
    };

    Components.unbind = function($selector) {
        var self = this;
        var desc = {};
        var component = undefined;
        var componentIdx = undefined;
        $selector.each(function(k, elem) {
            component = self.get(elem);
            if (componentIdx === undefined) {
                componentIdx = $(elem).data('componentIdx')
                desc = self.list[componentIdx];
            } else if (componentIdx !== $(elem).data('componentIdx')) {
                throw new Error(sprintf(
                    'Current DOM subtree componentIdx "%s" does not match previous DOM subtree componentIdx "%s"',
                    $(elem).data('componentIdx'),
                    componentIdx
                ));
            }
            $(elem).removeData('componentIdx');
        });
        if (typeof desc.event !== 'undefined') {
            $selector.unbind(desc.event, desc.handler);
        }
        if (component !== undefined) {
            if (typeof component.removeComponent !== 'undefined') {
                component.removeComponent($selector);
            }
            this.list[componentIdx] = null;
        }
        return desc;
    };

}(Components.prototype);

// Get array with all component instances by jQuery selector.
$.fn.components = function() {
    var components = [];
    this.each(function() {
        components.push(components.get(this));
    });
    return components;
};

// Get object with first component instance matching supplied jQuery selector.
$.fn.component = function() {
    var component = null;
    this.each(function() {
        component = components.get(this);
        return false;
    });
    return component;
};

$.fn.findAttachedComponents = function() {
    var result = [];
    this.findSelf('.component').each(function() {
        // Do not add nested detached .component nodes.
        if ($(this).hasClass('component') && $(this).data('isDetachedComponent') !== true) {
            result.push(this);
        }
    });
    return $(result);
};

$.fn.findRunningComponents = function() {
    var result = [];
    this.findAttachedComponents().each(function() {
        // Do not add already unbound .component nodes.
        if ($(this).data('componentIdx') !== undefined) {
            result.push(this);
        }
    });
    return $(result);
};

var components = new Components();

export { ComponentManager, components };
