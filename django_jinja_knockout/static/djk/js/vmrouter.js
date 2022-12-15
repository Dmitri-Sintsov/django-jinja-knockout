import { isArray, isEqual, filter } from './lib/underscore-esm.js';
import { newClassByPath } from './prop.js';
import { Trans } from './translate.js';

/**
 * https://django-jinja-knockout.readthedocs.io/en/latest/viewmodels.html
 */
function ViewModelRouter(viewHandlers) {

    this.handlers = [];
    this.executedViewModels = [];
    this.savedResponses = {};
    this.add(viewHandlers);

} void function(ViewModelRouter) {

    /**
     * Require viewModel handlers with specified viewModel names to exists.
     */
    ViewModelRouter.req = function(names) {
        for (var i = 0; typeof names[i] !== 'undefined'; i++) {
            if (typeof this.handlers[names[i]] === 'undefined') {
                throw new Error("Missing .handlers['" + names[i] + "']");
            }
        }
        return this;
    };

    ViewModelRouter.findHandler = function(viewName, handler) {
        if (isArray(this.handlers[viewName])) {
            for (var i = 0; typeof this.handlers[viewName][i] !== 'undefined'; i++) {
                if (isEqual(this.handlers[viewName][i], handler)) {
                    return i;
                }
            }
            return -1;
        } else {
            return isEqual(this.handlers[viewName], handler);
        }
    };

    /**
     * Add bound method: handler={'fn': methodName, 'context': classInstance}
     *   'fn' is not bound, and context is passed separately (re-binding is available)
     * Add classPath:    handler='MyClass'
     * Add function:     handler=fn (unbound function)
     *   one may pass bound function, in such case re-binding will be unavailable:
     *     https://stackoverflow.com/questions/20925138/bind-more-arguments-of-an-already-bound-function-in-javascript
     *     https://stackoverflow.com/questions/26545549/chaining-bind-calls-in-javascript-unexpected-result
     */
    ViewModelRouter.addHandler = function(viewName, handler) {
        if (typeof this.handlers[viewName] === 'undefined') {
            this.handlers[viewName] = handler;
        } else {
            var k = this.findHandler(viewName, handler);
            if (k === -1) {
                this.handlers[viewName].push(handler);
            } else if (k === false) {
                // Convert single handler to the array of handlers.
                this.handlers[viewName] = [
                    this.handlers[viewName], handler
                ];
            } else {
                // k !== -1 || k === true
                console.log('Warning: skipping already existing handler');
            }
        }
    };

    /**
     * Add multiple viewHandlers at once.
     * Each key is viewName, while the values are handler definitions.
     */
    ViewModelRouter.add = function(viewHandlers) {
        if (typeof viewHandlers === 'object') {
            for (var viewName in viewHandlers) {
                if (viewHandlers.hasOwnProperty(viewName)) {
                    var handler = viewHandlers[viewName];
                    this.addHandler(viewName, handler);
                }
            }
        } else if (typeof viewHandlers === 'string') {
            this.addHandler.apply(this, arguments);
        }
        return this;
    };

    ViewModelRouter.once = function(viewName, handler) {
        if (!this.hasView(viewName)) {
            this.addHandler(viewName, handler);
        }
    };

    ViewModelRouter.removeHandler = function(viewName, handler) {
        if (typeof this.handlers[viewName] !== 'undefined') {
            var k = this.findHandler(viewName, handler);
            if (k === false || k === -1) {
                // return this;
            } else if (k === true) {
                delete this.handlers[viewName];
            } else {
                // k !== -1
                this.handlers[viewName].splice(k, 1);
                if (this.handlers[viewName].length === 0) {
                    delete this.handlers[viewName];
                }
            }
        }
        return this;
    };

    ViewModelRouter.hasView = function(viewName) {
        return typeof this.handlers[viewName] !== 'undefined';
    };

    ViewModelRouter.removeAll = function() {
        for (var i = 0; i < arguments.length; i++) {
            if (typeof this.handlers[arguments[i]] !== 'undefined') {
                delete this.handlers[arguments[i]];
            }
        }
        return this;
    };

    /**
     * Execute a handler of any available type: unbound, bound, classPath.
     */
    ViewModelRouter.applyHandler = function(viewModel, handler, bindContext) {
        var fn;
        if (typeof handler === 'object') {
            fn = (typeof handler.fn === 'undefined') ? function() {} : handler.fn;
            if (bindContext === undefined) {
                bindContext = handler.context;
            }
        } else {
            fn = handler;
        }
        if (typeof bindContext === 'object') {
            return fn.apply(bindContext, [viewModel, this]);
        } else {
            if (typeof fn === 'string') {
                return this.factory(fn, viewModel, this);
            } else {
                return fn(viewModel, this);
            }
        }
    };

    /**
     * Executes single handler viewmodel / classPath.
     */
    ViewModelRouter.factory = function(viewName, viewModel, bindContext) {
        if (typeof this.handlers[viewName] === 'undefined') {
            if (isArray(viewModel)) {
                // Class args [].
                return newClassByPath(viewName, viewModel);
            } else {
                // Class options {}.
                return newClassByPath(viewName, [viewModel, bindContext]);
            }
        } else {
            if (Array.isArray(this.handlers[viewName])) {
                throw new Error("ViewModelRouter.factory supports only single viewmodel handler: " + viewName);
            } else {
                return this.applyHandler(viewModel, this.handlers[viewName], bindContext);
            }
        }
    };

    /**
     * Allows to specify a different viewName, to override viewModel.view.
     * Supports multiple handlers, thus does not return the result of called handlers.
     */
    ViewModelRouter.exec = function(viewName, viewModel, bindContext) {
        if (typeof this.handlers[viewName] !== 'undefined') {
            var handler = this.handlers[viewName];
            if (isArray(handler)) {
                for (var i = 0; typeof handler[i] !== 'undefined'; i++) {
                    this.applyHandler(viewModel, handler[i], bindContext);
                }
            } else {
                this.applyHandler(viewModel, handler, bindContext);
            }
        }
        return this;
    };

    /**
     * Executes viewModel based on it's viewModel.view property which contains viewModel name.
     */
    ViewModelRouter.showView = function(viewModel, bindContext) {
        if (typeof viewModel.view === 'undefined') {
            var viewModelStr = '';
            try {
                viewModelStr = JSON.stringify(viewModel);
            } catch (e) {
                console.log('@exception: ' + e);
            }
            import('./dialog.js').then(function(module) {
                new module.Dialog({
                    'title': Trans('AJAX response error'),
                    'message': Trans('Undefined viewModel.view %s', $.htmlEncode(viewModelStr)),
                }).alertError();
            });

            throw new Error('ViewModelRouter.show() error');
        }
        var hasView = typeof this.handlers[viewModel.view] !== 'undefined';
        if (hasView) {
            this.exec(viewModel.view, viewModel, bindContext);
        }
        return hasView;
    };

    // Can be called static.
    ViewModelRouter.filter = function(response, props) {
        if (typeof props !== 'object') {
            throw new Error("ViewModelRouter.filter 'props' arg must be an instance of object.");
        }
        var foundVms = [];
        for (var i = 0; typeof response[i] !== 'undefined'; i++) {
            var vm = response[i];
            var found = true;
            for (var k in props) {
                if (props.hasOwnProperty(k)) {
                    if (typeof vm[k] === 'undefined' || vm[k] !== props[k]) {
                        found = false;
                        break;
                    }
                }
            }
            if (found) {
                foundVms.push(vm);
            }
        }
        return foundVms;
    };

    ViewModelRouter.filterExecuted = function(filterFn) {
        this.executedViewModels = filter(
            this.executedViewModels, filterFn
        );
    };

    ViewModelRouter.respond = function(response, options) {
        if (typeof options !== 'object') {
            options = {};
        }
        var bindContext = (typeof options.context ==='undefined') ? undefined : options.context;
        if (!isArray(response)) {
            response = [response];
        }
        options = $.extend({before: {}, after: {}}, options);
        // @note: Do not replace with response.length; because
        // response may have extra non-integer properties and object
        // has no length property in such case.
        for (var i = 0; typeof response[i] !== 'undefined'; i++) {
            var hasView;
            var viewModel = response[i];
            // Execute custom 'before' handler, when available.
            if (hasView = (typeof options.before[viewModel.view] !== 'undefined')) {
                this.applyHandler(viewModel, options.before[viewModel.view], bindContext);
            }
            // Execute registered handler.
            var hasView = this.showView(viewModel, bindContext) || hasView;
            // Execute custom 'after' handler, when available.
            if (typeof options.after[viewModel.view] !== 'undefined') {
                this.applyHandler(viewModel, options.after[viewModel.view], bindContext);
                hasView = true;
            }
            if (hasView) {
                this.executedViewModels.push(viewModel);
            } else {
                var viewModelStr = viewModel.view;
                try {
                    viewModelStr = JSON.stringify(viewModel);
                } catch (e) {
                    console.log('@exception: ' + e);
                }
                console.log('Warning: skipped unhandled viewModel: ' + viewModelStr);
            }
        }
    };

    ViewModelRouter.saveResponse = function(name, response) {
        this.savedResponses[name] = response;
    };

    ViewModelRouter.loadResponse = function(name, options) {
        if (typeof this.savedResponses[name] !== 'undefined') {
            this.respond(this.savedResponses[name], options);
            delete this.savedResponses[name];
        }
    };

}(ViewModelRouter.prototype);

export { ViewModelRouter };
