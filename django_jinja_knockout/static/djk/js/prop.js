import { isArray } from './lib/underscore-esm.js';
import { isMapping } from './dash.js';

/**
 * Property addressing via arrays / dot-separated strings.
 * propChain is the relative property to specified object, propPath is the absolute (from window).
 */
function splitPropChain(propChain) {
    if (typeof propChain === 'string' && propChain.indexOf('.') !== -1) {
        return propChain.split(/\./);
    } else {
        return propChain;
    }
};

/**
 * A supplementary function to propGet() which gets the immediate parent of property instead of it's value.
 * This allows to check the type of property before accessing it.
 */
function propGetParent(self, propChain) {
    var prop = self;
    var propName;
    propChain = splitPropChain(propChain);
    if (isArray(propChain)) {
        propName = propChain[propChain.length - 1];
        for (var i = 0; i < propChain.length - 1; i++) {
            if (typeof prop[propChain[i]] !== 'object') {
                return {obj: undefined};
            }
            prop = prop[propChain[i]];
        }
    } else {
        propName = propChain;
    }
    var parent = {
        obj: prop,
        childName: propName,
    };
    return parent;
};

function propSet(self, propChain, val) {
    var prop = (self === null)? window : self;
    propChain = splitPropChain(propChain);
    if (isArray(propChain)) {
        for (var i = 0; i < propChain.length - 1; i++) {
            var propName = propChain[i];
            if (typeof prop === 'undefined') {
                prop = {};
            }
            if (!isMapping(prop)) {
                return false;
            }
            prop = prop[propName];
        }
        propName = propChain[i];
    } else {
        propName = propChain;
    }
    if (typeof prop === 'undefined') {
        prop = {};
    }
    if (!isMapping(prop)) {
        return false;
    }
    prop[propName] = val;
    return true;
};

/**
 * Usage:
 *   propGet(this, 'propName');
 *   ...
 *   propGet(someInstance, ['propName1', 'propNameN'], 'defaultValue');
 *   ...
 *   propGet(someInstance, 'propName1.propNameN', 'defaultValue');
 */
function propGet(self, propChain, defVal, get_context) {
    var prop = (self === null)? window : self;
    if (!isMapping(prop)) {
        return defVal;
    }
    var parent = propGetParent(prop, propChain);
    if (isMapping(parent.obj)) {
        var propType = typeof parent.obj[parent.childName];
        if (propType !== 'undefined') {
            var propVal = parent.obj[parent.childName];
            if (propType === 'function' && get_context !== undefined) {
                /**
                 * See also ViewModelRouter which uses the same object keys to specify function context.
                 * Javascript cannot .apply() to bound function without implicitly specifying context,
                 * thus next code is commented out:
                 */
                // return _.bind(propVal, parent.obj);
                return function() { return {'context': parent.obj, 'fn': propVal } };
            }
            return propVal;
        }
    }
    return defVal;
};

/**
 * Usage:
 *   MyClass.prototype.propCall = propCall;
 *   ...
 *   this.propCall('prop1.prop2.fn', arg1, .. argn);
 *
 *   or use _.bind() or .bindTo() to change this.
 */
function propCall() {
    var args = Array.prototype.slice.call(arguments);
    var propChain = args.shift();
    var propVal = propGet(this, propChain, null, true);
    if (typeof propVal === 'function') {
        var prop = propVal();
        return prop.fn.apply(prop.context, args);
    } else {
        return propVal;
    }
};

function propByPath(propPath) {
    return propGet(window, propPath);
};

function objByPath(propPath, typ) {
    if (typ === undefined) {
        typ = 'function';
    }
    var obj = propByPath(propPath);
    if (typeof obj !== typ) {
        throw new Error(
            sprintf('Invalid type "%s" (required "%s") for the propPath: "%s"', typeof obj, typ, propPath)
        );
    }
    return obj;
};

// http://stackoverflow.com/questions/1606797/use-of-apply-with-new-operator-is-this-possible
function newClassByPath(classPath, classPathArgs) {
    if (classPathArgs === undefined) {
        classPathArgs = [];
    }
    var cls = objByPath(classPath);
    if (typeof cls !== 'function') {
        throw new Error("Unknown classPath : " + classPath);
    }
    var self = Object.create(cls.prototype);
    cls.apply(self, classPathArgs);
    return self
};

export { splitPropChain, propGetParent, propSet, propGet, propCall, propByPath, objByPath, newClassByPath };
