import { isArray, map, mapObject } from './lib/underscore-esm.js';

function isMapping(v) {
    return typeof v === 'object' && v !== null;
}

function isScalar(v) {
    var nonScalarTypes = ['object', 'undefined', 'function'];
    return (nonScalarTypes.indexOf(typeof(v)) === -1) || v === null;
}

function intVal(s) {
    var i = parseInt(s);
    return isNaN(i) ? s : i;
}

function capitalize(s) {
    if (s.length === 0) {
        return s;
    } else {
        return s.charAt(0).toUpperCase() + s.slice(1);
    }
}

// note: jQuery.camelCase() is a built-in function.
function camelCaseToDash(value) {
    return value.replace( /([a-z])([A-Z])/g, '$1-$2' ).toLowerCase();
}

function inheritProps(parent, child) {
    for (var prop in parent) {
        if (parent.hasOwnProperty(prop) && !(prop in child)) {
            child[prop] = parent[prop];
        }
    }
}

/**
 * OrderedDict element.
 */
function ODict(k, v) {
    this.k = k;
    this.v = v;
}

function odict(k, v) {
    return new ODict(k, v);
}

function recursiveMap(value, fn) {
    if (isArray(value)) {
        return map(value, function(v) {
            return recursiveMap(v, fn);
        });
    } else if (typeof value === 'object') {
        return mapObject(value, function(v) {
            return recursiveMap(v, fn);
        });
    } else {
        return fn(value);
    }
}

function moveOptions(toObj, fromObj, keys) {
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
}

/**
 * Implements nested chains of prototypes (multi-level inheritance).
 *
 * An instance of SuperChain represents parent class context which may be nested.
 * Each context has following properties:
 *  .instance
 *     childInstance reference
 *  .proto
 *     prototype of ancestor class (parentPrototype)
 *  ._super
 *     null, when there is no more parent, instance of SuperChain when there are base parents.
 *     Deepest nested level of ._super._super is the context of top class prototype (context of base class).
 */
function SuperChain(childInstance, parentPrototype) {

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

} void function(SuperChain) {

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

}(SuperChain.prototype);

/**
 * Multi-level inheritance should be specified in descendant to ancestor order.
 *
 * For example to inherit from base class ClosablePopover, then from immediate ancestor class ButtonPopover,
 * use the following code:
 *
 *  import { inherit } from './dash.js';
 *  import { ClosablePopover, ButtonPopover } from './button-popover.js';
 *  CustomPopover = function(options) {
 *      inherit(ButtonPopover.prototype, this);
 *      inherit(ClosablePopover.prototype, this);
 *      // this.init(options);
 *  };
 */
function inherit(parentPrototype, childInstance) {
    new SuperChain(childInstance, parentPrototype);
}

export {
    isMapping, isScalar, intVal, capitalize, camelCaseToDash, inheritProps, ODict, odict, recursiveMap, moveOptions,
    inherit
};
