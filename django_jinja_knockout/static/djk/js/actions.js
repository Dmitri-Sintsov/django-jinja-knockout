import { sprintf } from './lib/sprintf-esm.js';
import { each } from './lib/underscore-esm.js';
import * as Ladda from './lib/ladda.js';

import { propGet } from './prop.js';
import { AppConf } from './conf.js';
import { showAjaxError } from './errors.js';
import { Url } from './url.js';
import { vmRouter } from './ioc.js';

/**
 * Client-side AJAX request / response viewmodel handler for server-side ActionsView.
 */
function Actions(options) {

    this.init(options);

} void function(Actions) {

    Actions.actionKwarg = 'action';
    Actions.viewModelName = 'action';

    Actions.init = function(options) {
        this.owner = propGet(options, 'owner');
        this.route = options.route;
        this.routeKwargs = options.routeKwargs;
        this.actions = (typeof options.actions === 'undefined') ? this.getActions() : options.actions;
        if (propGet(options, 'meta.actions')) {
            this.setActions(options.meta.actions);
        }
    };

    /**
     * Unordered actions with optional .type property.
     */
    Actions.getActions = function() {
        return {
            'delete': {'enabled': false},
        };
    };

    /**
     * Actions should be passed in ActionsView.vm_get_actions() result format (separate types ordered lists).
     */
    Actions.setActions = function(actions) {
        var self = this;
        each(actions, function(actions, actionType) {
            for (var i = 0; i < actions.length; i++) {
                actions[i].type = actionType;
                self.actions[actions[i].name] = actions[i];
            }
        });
    };

    Actions.setActionKwarg = function(actionKwarg) {
        this.actionKwarg = actionKwarg;
    };

    Actions.has = function(action) {
        return typeof this.actions[action] !== 'undefined' && propGet(this.actions[action], 'enabled', true);
    };

    Actions.getUrl =  function(action) {
        if (typeof action === 'undefined') {
            action = '';
        } else {
            action = '/' + action;
        }
        var params = $.extend({}, this.routeKwargs);
        params[this.actionKwarg] = action;
        return Url(this.route, params);
    };

    Actions.getLastActionUrl = function() {
        return this.getUrl(this.lastActionName);
    };

    Actions.getQueryArgs = function(action, queryArgs) {
        if (typeof queryArgs === 'undefined') {
            queryArgs = {};
        }
        var method = 'queryargs_' + action;
        if (typeof this[method] === 'function') {
            return this[method](queryArgs);
        } else {
            return queryArgs;
        }
    };

    Actions.getOurViewmodel = function(response) {
        var vms = vmRouter.filter(response, {
            view: this.viewModelName
        });
        // Assuming there is only one viewmodel with view: this.viewModelName, which is currently true.
        if (vms.length > 1) {
            throw new Error("Bug check in Actions.getOurViewmodel(), vms.length: " + vms.length);
        }
        return (vms.length === 0) ? null : vms[0];
    };

    Actions.getCsrfToken = function() {
        return AppConf('csrfToken');
    };

    /**
     * callback: function or {fn: function, context: bindContext}
     * callback.context also will be used for viewmodel response, when available;
     * in such case callback: {context: bindContext} is enough.
     */
    Actions.ajax = function(action, queryArgs, callback) {
        var self = this;
        if (typeof queryArgs === 'undefined') {
            queryArgs = {};
        }
        queryArgs.csrfmiddlewaretoken = this.getCsrfToken();
        return $.post(this.getUrl(action),
            queryArgs,
            function(response) {
                self.respond(action, response, callback);
                if (callback !== undefined) {
                    var vm = self.getOurViewmodel(response);
                    if (vm !== null) {
                        vmRouter.applyHandler(vm, callback);
                    }
                }
            },
            'json'
        )
        .fail(showAjaxError);
    };

    Actions.respond = function(action, response, options) {
        var self = this;
        if (this.ladda) {
            this.ladda.stop();
            this.ladda = false;
        }
        // Cannot use vmRouter.add(this.viewModelName, function(){}) because
        // this.viewModelName is dynamical (may vary) in child class.
        var responseOptions = $.extend({'after': {}}, options);
        if (typeof responseOptions.after[this.viewModelName] === 'undefined') {
            responseOptions['after'][this.viewModelName] = function(viewModel) {
                // console.log('Actions.perform response: ' + JSON.stringify(viewModel));
                var method = 'callback_' + propGet(viewModel, 'callback_action', action);
                // Override last action, when suggested by AJAX view response.
                // Use with care, due to asynchronous execution.
                if (typeof viewModel.last_action !== 'undefined') {
                    self.lastActionName = viewModel.last_action;
                    if (typeof viewModel.last_action_options !== 'undefined') {
                        self.lastActionOptions = viewModel.last_action_options;
                    } else {
                        self.lastActionOptions = {};
                    }
                }
                if (typeof self[method] === 'function') {
                    return self[method](viewModel);
                }
                throw new Error(
                    sprintf('Unimplemented %s()', method)
                );
            };
        }
        vmRouter.respond(response, responseOptions);
    };

    Actions.perform = function(action, actionOptions, ajaxCallback) {
        actionOptions = $.extend({queryArgs: {}}, actionOptions);
        var queryArgs = this.getQueryArgs(action, actionOptions.queryArgs);
        var method = 'perform_' + action;
        this.ladda = false;
        if (typeof this[method] === 'function') {
            // Override default AJAX action. This can be used to create client-side actions.
            this[method](queryArgs, ajaxCallback);
        } else {
            if (actionOptions.ajaxIndicator) {
                this.ladda = Ladda.create(actionOptions.ajaxIndicator);
                this.ladda.start();
            }
            // Call server-side ActionsView handler by default, which should return viewmodel response.
            this.ajax(action, queryArgs, ajaxCallback);
        }
    };

}(Actions.prototype);

export { Actions };
