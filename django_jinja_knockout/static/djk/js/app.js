'use strict';

// Requires plugins.js to be loaded before.

if (typeof console !== 'object') {
    console = {
        log: function() {}
    };
}

if (typeof console.dir !== 'function') {
    console.dir = function(s) { console.log(s) };
}

if (typeof window.App === 'undefined') {
    window.App = {};
}

App = window.App;

// Runtime script shared objects.
App.bag = {};

// Knockout,js bindings.
App.ko = {};

/**
 * Property addressing via arrays / dot-separated strings.
 * propChain is the relative property to specified object, propPath is the absolute (from window).
 */
App.propChain = function(propChain) {
    if (typeof propChain === 'string' && propChain.indexOf('.') !== -1) {
        return propChain.split(/\./);
    } else {
        return propChain;
    }
};

/**
 * A supplementary function to App.propGet() which gets the immediate parent of property instead of it's value.
 * This allows to check the type of property before accessing it.
 */
App.propGetParent = function(self, propChain) {
    var prop = self;
    var propName;
    propChain = App.propChain(propChain);
    if (_.isArray(propChain)) {
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

App.propSet = function(self, propChain, val) {
    var prop = (self === null)? window : self;
    propChain = App.propChain(propChain);
    if (_.isArray(propChain)) {
        for (var i = 0; i < propChain.length - 1; i++) {
            var propName = propChain[i];
            if (typeof prop === 'undefined') {
                prop = {};
            }
            if (!$.isMapping(prop)) {
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
    if (!$.isMapping(prop)) {
        return false;
    }
    prop[propName] = val;
    return true;
};

/**
 * Usage:
 *   App.propGet(this, 'propName');
 *   ...
 *   App.propGet(someInstance, ['propName1', 'propNameN'], 'defaultValue');
 *   ...
 *   App.propGet(someInstance, 'propName1.propNameN', 'defaultValue');
 */
App.propGet = function(self, propChain, defVal, get_context) {
    var prop = (self === null)? window : self;
    if (!$.isMapping(prop)) {
        return defVal;
    }
    var parent = App.propGetParent(prop, propChain);
    if ($.isMapping(parent.obj)) {
        var propType = typeof parent.obj[parent.childName];
        if (propType !== 'undefined') {
            var propVal = parent.obj[parent.childName];
            if (propType === 'function' && get_context !== undefined) {
                /**
                 * See also App.ViewModelRouter which uses the same object keys to specify function context.
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
 *   MyClass.prototype.propCall = App.propCall;
 *   ...
 *   this.propCall('prop1.prop2.fn', arg1, .. argn);
 *
 *   or use _.bind() or .bindTo() to change this.
 */
App.propCall = function() {
    var args = Array.prototype.slice.call(arguments);
    var propChain = args.shift();
    var propVal = App.propGet(this, propChain, null, true);
    if (typeof propVal === 'function') {
        var prop = propVal();
        return prop.fn.apply(prop.context, args);
    } else {
        return propVal;
    }
};

App.propByPath = function(propPath) {
    return App.propGet(window, propPath);
};

App.objByPath = function(propPath, typ) {
    if (typ === undefined) {
        typ = 'function';
    }
    var obj = App.propByPath(propPath);
    if (typeof obj !== typ) {
        throw sprintf('Invalid type "%s" (required "%s") for the propPath: "%s"', typeof obj, typ, propPath);
    }
    return obj;
};

// http://stackoverflow.com/questions/1606797/use-of-apply-with-new-operator-is-this-possible
App.newClassByPath = function(classPath, classPathArgs) {
    if (classPathArgs === undefined) {
        classPathArgs = [];
    }
    var cls = App.objByPath(classPath, 'function');
    var self = Object.create(cls.prototype);
    cls.apply(self, classPathArgs);
    return self
};

App.previousErrorHandler = window.onerror;
window.onerror = function(messageOrEvent, source, lineno, colno, error) {
    if (typeof App.previousErrorHandler === 'function') {
        App.previousErrorHandler(messageOrEvent, source, lineno, colno, error);
    }
    if (App.conf.jsErrorsAlert || App.conf.jsErrorsLogging) {
        var stack = App.propGet(error, 'stack', null);
        // Convert to strings for more reliability.
        var data = {
            'url': window.location + '',
            'message': messageOrEvent + '',
            'source': source + '',
            'lineno': lineno + '',
            'colno': colno + '',
            'error': error + '',
            'stack': stack + '',
        };
        if (App.conf.jsErrorsLogging) {
            data.csrfmiddlewaretoken = App.conf.csrfToken;
            $.post('/-djk-js-error-/',
                data,
                function(response) {
                    // Wrapped into try / catch to avoid nested window.onerror calls.
                    try {
                        if (App.conf.jsErrorsAlert) {
                            App.vmRouter.respond(response);
                        }
                    } catch (e) {
                        console.log(e);
                    }
                },
                'json'
            )
            .fail(App.showAjaxError);
        }
        if (App.conf.jsErrorsAlert) {
            var $message = $('<div>');
            for (var k in data) {
                if (k !== 'csrfmiddlewaretoken' && data.hasOwnProperty(k)) {
                    var $elem = $('<p>')
                        .append($('<b>').text(k))
                        .append($(k === 'stack' ? '<pre>' : '<div>').text(data[k]));
                    $message.append($elem);
                }
            }
            new App.Dialog({
                'title': 'Javascript error at: ' + data.url,
                'message': $message
            }).alertError();
        }
    }
};

App.globalIoc = {
    'App.Tpl': function(options) {
        return new App.Tpl(options);
    },
    'App.NestedList': function(options) {
        return new App.NestedList(options);
    },
};

if (typeof django === 'object' && typeof django.gettext === 'function') {
    App.trans = function() {
        if (arguments.length < 2) {
            return django.gettext(arguments[0]);
        } else {
            var args = Array.prototype.slice.call(arguments);
            args[0] = django.gettext(args[0]);
            return sprintf.apply(this, args);
        }
    }
} else if (typeof sprintf === 'function') {
    App.trans = sprintf;
    console.log('@note: No Django gettext is loaded, no localization, falling back to sprintf.js');
} else {
    throw "@error: Neither Django gettext nor sprintf.js is available.";
}


/**
 * Render nested Javascript structures as nested DOM nodes.
 */
App.NestedList = function(options) {
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
            this.blockTags = App.blockTags.list;
        } else if (_.isArray(options.blockTags)) {
            this.blockTags = options.blockTags;
        } else if (typeof options.blockTags === 'string') {
            this.blockTags = App.propByPath(options.blockTags);
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
        if (_.size(value) > 0) {
            var $ul = this.getListContainer(level);
            $.each(value, function(k, v) {
                fn = curr_fn;
                var isNested = false;
                if (v instanceof _.ODict) {
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

}(App.NestedList.prototype);


App.renderNestedList = function(element, value, options) {
    return App.globalIoc['App.NestedList'](options).render(element, value);
};

App.blockTags = {
    list: [
        {
            enclosureTag: '<ul>',
            enclosureClasses: 'list-group',
            itemTag: '<li>',
            itemClasses: 'condensed list-group-item preformatted',
            localKeyTag: '<div>',
            localKeyClasses: 'label label-info label-gray preformatted br-after',
        },
        {
            enclosureTag: '<ul>',
            enclosureClasses: 'list-group',
            itemTag: '<li>',
            itemClasses: 'condensed list-group-item list-group-item-warning preformatted',
            localKeyTag: '<div>',
            localKeyClasses: 'label label-info label-gray preformatted br-after',
        },
    ],
    badges: [
        {
            enclosureTag: '<div>',
            enclosureClasses: 'well well-condensed well-sm',
            itemTag: '<span>',
            itemClasses: 'badge preformatted',
            localKeyTag: '<div>',
            localKeyClasses: 'label label-info label-white preformatted',
        }
    ]
};


/**
 * Bootstrap tabs management class.
 */
App._TabPane = function (hash) {
    if (hash === undefined) {
        hash = window.location.hash;
    }
    this.cleanHash = hash.split(/^#/g).pop();
    this.targetElement = $.id(this.cleanHash);
    if (this.targetElement.length > 0) {
        this.pane = this.targetElement.closest('div.tab-pane');
        if (this.pane.length > 0 && this.cleanHash === this.pane.attr('id')) {
            this.anchor = $('a[href="#' + this.pane.attr('id') + '"]');
            this.tab = this.anchor.parents('li[role="presentation"]:first');
        }
    }
};

void function(_TabPane) {

    _TabPane.exists = function() {
        return App.propGet(this, 'anchor.length', 0) > 0;
    };

    _TabPane.isActive = function() {
        return this.exists() && this.tab.hasClass('active');
    };

    _TabPane.setLocation = function() {
        if (this.exists()) {
            window.location.hash = '#' + this.cleanHash;
        }
        return this;
    };

    _TabPane.loadTemplate = function() {
        var tabTemplate = this.tab.data('tabTemplate');
        if (tabTemplate !== undefined) {
            var templateHolder = this.pane.find('.template-holder');
            if (templateHolder.length > 0) {
                var tpl = App.globalIoc['App.Tpl']().domTemplate(tabTemplate);
                templateHolder.replaceWith(tpl);
                App.initClient(this.pane);
            }
        }
    };

    _TabPane.switchTo = function() {
        if (this.exists()) {
            this.loadTemplate();
            this.anchor.tab('show');
            var highlightClass = this.tab.data('highlightClass');
            if (highlightClass !== undefined) {
                this.tab.removeData('highlightClass');
                this.tab.removeClass(highlightClass);
            }
            // Commented out, because it causes jagged scrolling.
            // this.argetElement.get(0).scrollIntoView();
        }
        return this;
    };

    _TabPane.hide = function() {
        if (this.exists()) {
            this.tab.addClass('hidden');
            this.pane.addClass('hidden');
        }
        return this;
    };

    _TabPane.show = function() {
        if (this.exists()) {
            this.pane.removeClass('hidden');
            this.tab.removeClass('hidden');
        }
        return this;
    };

    _TabPane.highlight = function(bgClass, permanent) {
        if (this.exists()) {
            if (typeof bgClass !== 'string') {
                bgClass = 'bg-success';
            }
            this.tab.addClass(bgClass);
            if (permanent !== true) {
                this.tab.data('highlightClass', bgClass);
            }
        }
        return this;
    };

    _TabPane.load = function(route, data, options) {
        if (this.exists()) {
            data.clean_hash = this.cleanHash;
            App.post(route, data, options);
        }
        return this;
    };

}(App._TabPane.prototype);

App.TabPane = function(hash) {
    return new App._TabPane(hash);
};

App.TabList = function(options) {};

void function(TabList) {

    TabList.runComponent = function($selector) {
        this.$componentSelector = $selector;
        // Change hash upon pane activation
        this.$componentSelector.find('a[role="tab"]')
        .each(function() {
            var href = $(this).attr('href');
            var tabPane = App.TabPane(href);
            if (tabPane.isActive()) {
                tabPane.loadTemplate();
            }
        })
        .on('click', function() {
            var href = $(this).attr('href');
            if (href !== undefined && href.match(/^#/)) {
                window.location.hash = href;
            }
        });
    };

}(App.TabList.prototype);


// https://github.com/linuxfoundation/cii-best-practices-badge/issues/218
App.initTabPane = function() {
    App.TabPane().switchTo();
    $(window).on('hashchange', function() {
        App.TabPane().switchTo();
    });
};

/**
 * BootstrapDialog wrapper.
 */
App.Dialog = function(options) {
    this.create(options);
};

void function(Dialog) {

    Dialog.type = BootstrapDialog.TYPE_WARNING;
    Dialog.size = BootstrapDialog.SIZE_NORMAL;
    Dialog.template = undefined;
    // Make sure to set .isClosable = false in child class when implementing unconditional confirmation dialogs.
    Dialog.isClosable = true;
    Dialog.autoEmpty = true;
    Dialog.initClient = false;

    /**
     * Convert string / nested object to jQuery object.
     * Note that HTML string content is supported.
     * Be sure to encode 'title' / 'message' HTML at the server-side to prevent XSS.
     */
    Dialog.renderObject = function(obj) {
        if (obj instanceof jQuery) {
            return obj;
        } else {
            if (typeof obj === 'object') {
                var $content = $('<div>');
                return App.renderNestedList(
                    $content, obj, this.getNestedListOptions()
                );
            } else {
                return $.contents(obj);
            }
        }
    };


    Dialog.create = function(options) {
        var self = this;
        if (typeof options !== 'object') {
            options = {};
        }
        this.dialogOptions = {
            // BootstrapDialog.TYPE_DEFAULT
            // BootstrapDialog.TYPE_INFO
            // BootstrapDialog.TYPE_PRIMARY
            // BootstrapDialog.TYPE_SUCCESS
            // BootstrapDialog.TYPE_WARNING
            // BootstrapDialog.TYPE_DANGER
            type: this.type,
            animate: false,
            closable: this.isClosable,
            draggable: true,
            initClient: this.initClient,
            buttonLabel: App.trans('OK'),
            btnCancelLabel: App.trans('No'),
            btnOKLabel: App.trans('Yes'),
            // BootstrapDialog.SIZE_SMALL
            // BootstrapDialog.SIZE_WIDE
            // BootstrapDialog.SIZE_LARGE
            size: this.size,
            onshow: function(bdialog) {
                self.bdialog = bdialog;
                bdialog._owner = self;
                self.onShow();
            },
            onshown: function(bdialog) {
                self.onShown();
            },
            onhide: function(bdialog) {
                self.onHide();
            },
            onhidden: function(bdialog) {
                self.onHidden();
            },
        };
        this.dialogOptions = $.extend(this.dialogOptions, this.getOptions(), options);
        this.initClient = this.dialogOptions.initClient;
        delete this.dialogOptions.initClient;
        if (typeof this.dialogOptions.buttons === 'undefined') {
            this.dialogOptions.buttons = this.getButtons();
            if (!_.isArray(this.dialogOptions.buttons)) {
                delete this.dialogOptions.buttons;
            }
        }
        if (typeof this.dialogOptions.title === 'undefined') {
            this.dialogOptions.title = this.getDialogTitle();
        } else {
            this.dialogOptions.title = this.renderObject(this.dialogOptions.title);
        }
        // Do not forget to escape from XSS.
        if (typeof this.dialogOptions.message === 'undefined') {
            this.dialogOptions.message = this.createDialogContent();
        } else {
            this.dialogOptions.message = this.renderObject(this.dialogOptions.message);
        }
        if (typeof this.dialogOptions.method !== 'undefined') {
            this.showMethod = this.dialogOptions.method;
            delete this.dialogOptions.method;
        }
        // Remove unused properties possibly extended from options.
        delete this.dialogOptions.view;
        switch (typeof this.dialogOptions.callback) {
        case 'object':
            // App viewmodel.
            var cbViewModel = this.dialogOptions.callback;
            this.dialogOptions.callback = function(result) {
                // @note: Do not use alert view as callback, it will cause stack overflow.
                if (result) {
                    App.vmRouter.respond(cbViewModel);
                } else if (typeof self.dialogOptions.cb_cancel === 'object') {
                    App.vmRouter.respond(self.dialogOptions.cb_cancel);
                }
            };
            break;
        case 'function':
            // Function callback.
            break;
        default:
            // Default action.
            this.dialogOptions.callback = function(result) {
                if (result) {
                    self.dialogAction();
                } else {
                    self.dialogCancel();
                }
            }
        }
    };

    Dialog.runComponent = function($selector) {
        this.show();
    };

    Dialog.show = function() {
        if (typeof this.showMethod !== 'undefined') {
            this[this.showMethod](this.dialogOptions);
        } else {
            this.bdialog = BootstrapDialog.show(this.dialogOptions);
        }
    };

    Dialog.onShow = function() {
        this.bdialog.setSize(this.dialogOptions.size);
        if (this.initClient) {
            App.initClient(this.bdialog.getModalBody());
        }
    };

    Dialog.onShown = function() {
        /* noop */
    };

    Dialog.onHide = function() {
        if (this.initClient) {
            App.initClient(this.bdialog.getModalBody(), 'dispose');
        }
        if (this.autoEmpty) {
            this.bdialog.getModal().remove();
        }
    };

    Dialog.onHidden = function() {
        /* noop */
    };

    Dialog.alert = function() {
        if (typeof BootstrapDialog === 'undefined') {
            alert(this.dialogOptions.message);
            this.dialogOptions.callback(true);
            return;
        }
        this.bdialog = BootstrapDialog.alert(this.dialogOptions, this.dialogOptions.callback);
    };

    Dialog.alertError = function() {
        this.dialogOptions.type = BootstrapDialog.TYPE_DANGER;
        this.alert();
    };

    Dialog.confirm = function() {
        if (typeof BootstrapDialog === 'undefined') {
            this.dialogOptions.callback(confirm(this.dialogOptions.message));
            return;
        }
        this.bdialog = BootstrapDialog.confirm(this.dialogOptions);
    };

    Dialog.getDialogTitle = function() {
        return (typeof this.dialogOptions.title === 'undefined') ? $.contents(' ') : this.dialogOptions.title;
    };

    Dialog.recreateTitle = function() {
        this.bdialog.getModalHeader().empty().append(this.getDialogTitle());
    };

    Dialog.setTitle = function(title) {
        if (typeof title !== 'undefined') {
            this.dialogOptions.title = title;
        }
        if (typeof this.bdialog !== 'undefined') {
            this.bdialog.setTitle(this.dialogOptions.title);
        }
    };

    Dialog.iocTemplateProcessor = function(options) {
        var _options = $.extend({'meta_is_dialog': true}, options);
        return App.globalIoc['App.Tpl'](_options);
    };

    Dialog.createDialogContent = function() {
        var template = App.propGet(this.dialogOptions, 'template');
        if (template === undefined) {
            template = App.propGet(this, 'template');
        }
        if (template !== undefined) {
            return this.iocTemplateProcessor().domTemplate(template);
        } else {
            return $.contents('sample content');
        }
    };

    Dialog.recreateContent = function() {
        this.bdialog.getModalBody().empty().append(this.createDialogContent());
    };

    Dialog.getButtons = function() {
        return null;
    };

    Dialog.getOptions = function() {
        return {};
    };

    Dialog.getNestedListOptions = function() {
        var options = {blockTags: App.blockTags.badges};
        if (this.dialogOptions.nestedListOptions !== 'undefined') {
            options = $.extend(options, this.dialogOptions.nestedListOptions);
        }
        return options;
    };

    Dialog.isOpened = function() {
        return (typeof this.bdialog !== 'undefined') ? this.bdialog.isOpened() : false;
    };

    Dialog.dialogAction = function() {
        // alert('Sample action');
    };

    Dialog.dialogCancel = function() {
        // alert('Cancelled');
    };

    Dialog.close = function() {
        this.bdialog.close();
    };

}(App.Dialog.prototype);


/**
 * Client-side AJAX request / response viewmodel handler for server-side ActionsView.
 */
App.Actions = function(options) {
    this.init(options);
};

void function(Actions) {

    Actions.actionKwarg = 'action';
    Actions.viewModelName = 'action';

    Actions.init = function(options) {
        this.owner = App.propGet(options, 'owner');
        this.route = options.route;
        this.routeKwargs = options.routeKwargs;
        this.actions = (typeof options.actions === 'undefined') ? this.getActions() : options.actions;
    };

    Actions.getActions = function() {
        return {
            'delete': {'enabled': false},
        };
    };

    Actions.setActions = function(actions) {
        var self = this;
        _.each(actions, function(actions, actionType) {
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
        return typeof this.actions[action] !== 'undefined' && App.propGet(this.actions[action], 'enabled', true);
    };

    Actions.getUrl =  function(action) {
        if (typeof action === 'undefined') {
            action = '';
        } else {
            action = '/' + action;
        }
        var params = $.extend({}, this.routeKwargs);
        params[this.actionKwarg] = action;
        return App.routeUrl(this.route, params);
    };

    Actions.getLastActionUrl = function() {
        return this.getUrl(this.lastActionName);
    };

    Actions.getQueryArgs = function(action, options) {
        if (typeof options === 'undefined') {
            options = {};
        }
        var method = 'queryargs_' + action;
        if (typeof this[method] === 'function') {
            return this[method](options);
        } else {
            return options;
        }
    };

    Actions.getOurViewmodel = function(response) {
        var vms = App.vmRouter.filter(response, {
            view: this.viewModelName
        });
        // Assuming there is only one viewmodel with view: this.viewModelName, which is currently true.
        if (vms.length > 1) {
            throw "Bug check in App.Actions.getOurViewmodel(), vms.length: " + vms.length;
        }
        return (vms.length === 0) ? null : vms[0];
    };

    Actions.getCsrfToken = function() {
        return App.conf.csrfToken;
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
                self.respond(action, response, App.propGet(callback, 'context'));
                if (callback !== undefined) {
                    var vm = self.getOurViewmodel(response);
                    if (vm !== null) {
                        App.vmRouter.applyHandler(vm, callback);
                    }
                }
            },
            'json'
        )
        .fail(App.showAjaxError);
    };

    Actions.respond = function(action, response, bindContext) {
        var self = this;
        // Cannot use App.vmRouter.add(this.viewModelName, function(){}) because
        // this.viewModelName is dynamical (may vary) in child class.
        var responseOptions = {'after': {}};
        if (bindContext !== 'undefined') {
            responseOptions.context = bindContext;
        }
        responseOptions['after'][this.viewModelName] = function(viewModel) {
            // console.log('Actions.perform response: ' + JSON.stringify(viewModel));
            var method = 'callback_' + App.propGet(viewModel, 'callback_action', action);
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
            throw sprintf('Unimplemented %s()', method);
        };
        App.vmRouter.respond(response, responseOptions);
    };

    Actions.perform = function(action, actionOptions, ajaxCallback) {
        var queryArgs = this.getQueryArgs(action, actionOptions);
        var method = 'perform_' + action;
        if (typeof this[method] === 'function') {
            // Override default AJAX action. This can be used to create client-side actions.
            this[method](queryArgs, ajaxCallback);
        } else {
            // Call server-side ActionsView handler by default, which should return viewmodel response.
            this.ajax(action, queryArgs, ajaxCallback);
        }
    };

}(App.Actions.prototype);


/**
 * https://django-jinja-knockout.readthedocs.io/en/latest/viewmodels.html
 */
App.ViewModelRouter = function(viewHandlers) {
    this.handlers = [];
    this.executedViewModels = [];
    this.savedResponses = {};
    this.add(viewHandlers);
};

void function(ViewModelRouter) {

    /**
     * Require viewModel handlers with specified viewModel names to exists.
     */
    ViewModelRouter.req = function(names) {
        for (var i = 0; typeof names[i] !== 'undefined'; i++) {
            if (typeof this.handlers[names[i]] === 'undefined') {
                throw "Missing .handlers['" + names[i] + "']";
            }
        }
        return this;
    };

    /**
     * Add bound method: handler={'fn': methodName, 'context': classInstance}
     *   'fn' is not bound, and context is passed separately (re-binding is available)
     * Add classPath:    handler='App.MyClass'
     * Add function:     handler=fn (unbound function)
     *   one may pass bound function, in such case re-binding will be unavailable:
     *     https://stackoverflow.com/questions/20925138/bind-more-arguments-of-an-already-bound-function-in-javascript
     *     https://stackoverflow.com/questions/26545549/chaining-bind-calls-in-javascript-unexpected-result
     */
    ViewModelRouter.addHandler = function(viewName, handler) {
        if (typeof this.handlers[viewName] === 'undefined') {
            this.handlers[viewName] = handler;
        } else if (_.isArray(this.handlers[viewName])) {
            this.handlers[viewName].push(handler);
        } else {
            // Convert single handler to the array of handlers.
            this.handlers[viewName] = [
                this.handlers[viewName], handler
            ];
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

    ViewModelRouter.removeHandler = function(viewName, handler) {
        if (typeof this.handlers[viewName] !== 'undefined') {
            if (_.isArray(this.handlers[viewName])) {
                var k = -1;
                for (var i = 0; typeof this.handlers[viewName][i] !== 'undefined '; i++) {
                    if (_.isEqual(this.handlers[viewName][i], handler)) {
                        k = i;
                        break;
                    }
                }
                if (k !== -1) {
                    this.handlers[viewName].splice(k, 1);
                }
                if (this.handlers[viewName].length === 0) {
                    delete this.handlers[viewName];
                }
            } else {
                if (_.isEqual(this.handlers[viewName], handler)) {
                    delete this.handlers[viewName];
                };
            }
        }
        return this;
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
            fn.apply(bindContext, [viewModel, this]);
        } else {
            if (typeof fn === 'string') {
                App.newClassByPath(fn, [viewModel, this]);
            } else {
                fn(viewModel, this);
            }
        }
        return this;
    };

    /**
     * Allows to specify a different viewName, to override viewModel.view.
     */
    ViewModelRouter.exec = function(viewName, viewModel, bindContext) {
        if (typeof this.handlers[viewName] !== 'undefined') {
            var handler = this.handlers[viewName];
            if (_.isArray(handler)) {
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
     * Executes viewModel based on it's viewModel.view property which contanis viewModel name.
     */
    ViewModelRouter.showView = function(viewModel, bindContext) {
        if (typeof viewModel.view === 'undefined') {
            var viewModelStr = '';
            try {
                viewModelStr = JSON.stringify(viewModel);
            } catch (e) {
                console.log('@exception: ' + e);
            }
            new App.Dialog({
                'title': App.trans('AJAX response error'),
                'message': App.trans('Undefined viewModel.view %s', $.htmlEncode(viewModelStr)),
            }).alertError();
            throw 'ViewModelRouter.show() error';
        }
        var hasView;
        if (hasView = (typeof this.handlers[viewModel.view] !== 'undefined')) {
            this.exec(viewModel.view, viewModel, bindContext);
        }
        return hasView;
    };

    // Can be called static.
    ViewModelRouter.filter = function(response, props) {
        if (typeof props !== 'object') {
            throw "ViewModelRouter.filter 'props' arg must be an instance of object.";
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
        this.executedViewModels = _.filter(
            this.executedViewModels, filterFn
        );
    };

    ViewModelRouter.respond = function(response, options) {
        if (typeof options !== 'object') {
            options = {};
        }
        var bindContext = (typeof options.context ==='undefined') ? undefined : options.context;
        if (!_.isArray(response)) {
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

}(App.ViewModelRouter.prototype);

App.vmRouter = new App.ViewModelRouter({
    'redirect_to' : function(viewModel) {
        var href = viewModel.url;
        var hash = href.match('(#.*)$');
        if (hash !== null) {
            hash = hash.pop();
        }
        if (hash != window.location.hash) {
            // Hash changes are not refreshed automatically by default.
            $(window).on('hashchange', function() {
                window.location.reload();
            });
        }
        if (typeof viewModel.query !== 'undefined') {
            href += '?' + $.param(viewModel.query);
        }
        window.location.href = href;
    },
    'post': function(viewModel) {
        App.post(viewModel.route, viewModel.data, viewModel.options);
    },
    'alert' : function(viewModel) {
        new App.Dialog(viewModel).alert();
    },
    'alert_error' : function(viewModel) {
        if (typeof viewModel.title === 'undefined') {
            viewModel.title = App.trans('Error');
        }
        new App.Dialog(viewModel).alertError();
    },
    'confirm' : function(viewModel) {
        new App.Dialog(viewModel).confirm();
    },
    'trigger': function(viewModel) {
        $(viewModel.selector).trigger(viewModel.event);
    },
    'append': function(response) {
        var $html = $.contents(response.html);
        App.initClient($html);
        $(response.selector).append($html);
    },
    'prepend': function(response) {
        var $html = $.contents(response.html);
        App.initClient($html);
        $(response.selector).prepend($html);
    },
    'after': function(response) {
        var $html = $.contents(response.html);
        App.initClient($html);
        $(response.selector).after($html);
    },
    'before': function(response) {
        var $html = $.contents(response.html);
        App.initClient($html);
        $(response.selector).before($html);
    },
    'remove': function(response) {
        var $selector = $(response.selector);
        App.initClient($selector, 'dispose');
        $selector.remove();
    },
    'text': function(response) {
        var $selector = $.select(response.selector);
        var text = document.createTextNode(response.text);
        $selector.empty().append(text);
    },
    'html': function(response) {
        var $selector = $.select(response.selector);
        App.initClient($selector.find('*'), 'dispose');
        var $html = $.contents(response.html);
        App.initClient($html);
        $selector.empty().append($html);
    },
    'replaceWith': function(response) {
        var $selector = $.select(response.selector);
        var $parent = $selector.parent();
        App.initClientApply($selector, 'dispose');
        $selector.replaceWith(
            App.initClientMark(response.html)
        );
        App.initClientApply($parent);
    },
    // Can be used to resubmit the same forms with different urls.
    // Replaces 'data-url' attribute values globally.
    // To replace selectively, implement your own custom handler.
    'replace_data_url': function(response) {
        if (response.fromUrl === response.toUrl) {
            return;
        }
        var $submits = $(App.AjaxForms.prototype.formSubmitSelector);
        $submits.each(function(k, v) {
            var $submit = $(v);
            if ($submit.data('url') === response.fromUrl || $submit.prop('data-url') === response.fromUrl) {
                $submit.prop('data-url', response.toUrl);
                $submit.data('url', response.toUrl);
            }
        });
    }
});


App.disableInput = function(input) {
    var $input = $(input);
    for (var i = 0; typeof $input.data('formInputOriginalDisabled' + i) !== 'undefined'; i++);
    $input.data('formInputOriginalDisabled' + i, $input.prop('disabled'));
    $input.prop('disabled', true);
    if ($input.attr('type') === 'radio') {
        $input.trigger('refresh');
    }
};

App.enableInput = function(input) {
    var $input = $(input);
    for (var i = 0; typeof $input.data('formInputOriginalDisabled' + i) !== 'undefined'; i++);
    if (i === 0) {
        // Skipped already enabled input.
        return;
    }
    i--;
    $input.prop('disabled', $input.data('formInputOriginalDisabled' + i));
    $input.removeData('formInputOriginalDisabled' + i);
    if ($input.attr('type') === 'radio') {
        $input.trigger('refresh');
    }
};

App.disableInputs = function(parent) {
    $(parent).find(':input:visible').each(function(k, v) {
        App.disableInput(v);
    });
};

App.enableInputs = function(parent) {
    $(parent).find(':input:visible').each(function(k, v) {
        App.enableInput(v);
    });
};

App.clearInputs = function(parent) {
    var $parent = $(parent);
    $parent.find('input[type="text"]:visible, textarea:visible')
    .val('')
    .removeClass('error validation-error')
    // @note: data-original-title is boostrap3 standard attribute, do not change the name.
    .removeAttr('data-original-title')
    .autogrow('update')
    .collapsibleSubmit('update');
    $parent.find('.select2-container').remove();
};

App.showAjaxError = function(jqXHR, exception) {
    var message;
    if (jqXHR.status === 0) {
        message = 'Not connected.\n Verify Network.';
    } else if (jqXHR.status == 404) {
        message = 'Requested page not found. [404]';
    } else if (jqXHR.status == 500) {
        message = 'Internal Server Error [500].';
    } else if (exception === 'parsererror') {
        message = 'Requested JSON parse failed.';
    } else if (exception === 'timeout') {
        message = 'Time out error.';
    } else if (exception === 'abort') {
        message = 'Ajax request aborted.';
    } else {
        message = 'Uncaught Error.\n' + $.htmlEncode(jqXHR.responseText);
    }
    App.vmRouter.respond({
        'view': 'alert_error',
        'title': App.trans('Request error'),
        'message': message
    });
};

App.SelectMultipleAutoSize = function($selector) {
    $selector.findSelf('select[multiple]').each(function(k, v) {
        var $select = $(v);
        var size = $select.prop('size');
        var length = $select.find('option').length;
        if (size === 0 && length < 10) {
            $select.prop('size', length);
        }
    });
};

App.DatetimeWidget = function($parent) {
    this.create($parent);
};

void function(DatetimeWidget) {

    // Override moment.js Django-incompatible locales formatting used by bootstrap datetimepicker.
    // Locale 'ru' moment.js is compatible to Django thus does not require override, for example.
    DatetimeWidget.formatFixes = {
        'en-us': {
            'date': 'YYYY-MM-DD',
            'datetime': 'YYYY-MM-DD HH:mm:ss'
        }
    };

    DatetimeWidget.create = function($parent) {
        this.$parent = $parent;
    };

    DatetimeWidget.has = function() {
        if (typeof $.fn.datetimepicker === 'undefined') {
            console.log("@note: bootstrap.datetimepicker is disabled.");
            return false;
        }
        // Field wrapper with icon.
        this.$dateControls = this.$parent.find('.date-control, .datetime-control')
        return this.$dateControls.length > 0;
    };

    // @static method
    DatetimeWidget.open = function(ev) {
        var $target = $(ev.target);
        $target.closest('.input-group-addon')
        .prev('.date-control, .datetime-control')
        .trigger('click');
    };

    DatetimeWidget.init = function() {
        if (!this.has()) {
            return;
        }
        this.$dateControls.wrap('<div class="input-group date datetimepicker"></div>');
        this.$dateControls.after(
            '<span class="input-group-addon pointer"><span class="glyphicon glyphicon-calendar"></span></span>'
        );
        var formatFix = App.propGet(DatetimeWidget.formatFixes, App.conf.languageCode);
        // Date field widget.
        var options = {
            pickTime: false,
            language: App.conf.languageCode,
            icons: {
                date: 'calendar'
            }
        };
        if (formatFix !== undefined) {
            options.format = formatFix.date;
        }
        this.$parent.find('.date-control').datetimepicker(options);
        // Datetime field widget.
        options = {
            language: App.conf.languageCode,
            icons: {
                date: 'calendar'
            }
        };
        if (formatFix !== undefined) {
            options.format = formatFix.datetime;
        }
        this.$parent.find('.datetime-control').datetimepicker(options);
        // Picker window button help.
        this.$parent.find('.picker-switch').prop('title', App.trans('Choose year / decade.'));
        // Icon clicking.
        this.$dateControls.next('.input-group-addon').on('click', DatetimeWidget.open);
        return this;
    };

    // Does not restore DOM into original state, just prevents memory leaks.
    DatetimeWidget.destroy = function() {
        if (!this.has()) {
            return;
        }
        this.$dateControls.next('.input-group-addon').off('click', DatetimeWidget.open);
        // https://github.com/Eonasdan/bootstrap-datetimepicker/issues/573
        _.each(this.$parent.find('.datetime-control, .date-control'), function(v) {
            var dtp = $(v).data("DateTimePicker");
            // If $.datetimepicker() was added dynamically as empty_form of inline formset,
            // there is no related instance stored in html5 data.
            if (dtp !== undefined) {
                dtp.widget.remove();
            } else {
                /*
                $(v).datetimepicker({language: App.conf.languageCode});
                var dtp = $(v).data("DateTimePicker");
                dtp.widget.remove();
                */
            }
        });
    };

}(App.DatetimeWidget.prototype);

App.Ladder = function($selector) {
    var self = this;
    this.laddas = [];
    $selector.findSelf('button[type="submit"], button.submit, input[type="submit"]').each(function(k, v) {
        var l = Ladda.create(v);
        l.start();
        self.laddas.push(l);
    });
};

App.Ladder.prototype.remove = function() {
    $.each(this.laddas, function(k, v) {
        v.remove();
    });
};

App.getDataUrl = function($element) {
    var route = $element.data('route');
    if (route === undefined) {
        return $element.data('url');
    } else {
        return App.routeUrl(route, $element.data('routeKwargs'));
    }
};


App.AjaxButton = function($selector) {
    this.create($selector);
};

void function(AjaxButton) {

    AjaxButton.create = function($selector) {
        this.$ajaxButtons = $selector.findSelf('a[data-route], a[data-url], ' +
            'button[data-route][type!="submit"], button[data-url][type!="submit"]');
    };

    // @call static
    AjaxButton.onClick = function(ev) {
        var $target = $(ev.target);
        App.disableInput($target);
        var l = Ladda.create($target.get(0));
        l.start();
        var url = App.getDataUrl($target);
        if (url === undefined) {
            throw "Please define data-url or data-route attribute on the selected element.";
        }
        $.post(url,
            {
                csrfmiddlewaretoken: App.conf.csrfToken
            },
            function(response) {
                App.vmRouter.respond(response);
            },
            'json'
        )
        .always(function() {
            l.remove();
            App.enableInput($target);
        })
        .fail(App.showAjaxError);
        return false;
    };

    AjaxButton.init = function() {
        this.$ajaxButtons.on('click', AjaxButton.onClick);
    };

    AjaxButton.destroy = function() {
        this.$ajaxButtons.off('click', AjaxButton.onClick);
    };

}(App.AjaxButton.prototype);


/**
 * Set of ajax forms.
 * Please use form[data-route] attribute.
 * Do not define form[action], otherwise the form may be submitted twice.
 */
App.AjaxForms = function($selector) {
    this.create($selector);
};

void function(AjaxForms) {

    AjaxForms.formSelector = 'form.ajax-form';
    AjaxForms.submitSelector = 'button[type="submit"], input[type="submit"], input[type="image"]';
    AjaxForms.formSubmitSelector = AjaxForms.formSelector + ', ' + AjaxForms.submitSelector;

    AjaxForms.has = function() {
        var result = (typeof $.fn.ajaxForm !== 'undefined');
        if (!result) {
            console.log('@note: jQuery AJAX form plugin is disabled.');
        }
        return result;
    };

    AjaxForms.create = function($selector) {
        this.$forms = $selector.findSelf(this.formSelector);
        this.$cancelButtons = this.$forms.find('.btn-cancel-compose');
        this.$submitButtons = this.$forms.find(this.submitSelector);
    };

    // @call static
    AjaxForms.onCancelButtonClick = function(ev) {
        var $form = $(ev.target).closest('form');
        new App.AjaxForm($form).clearInputs();
    };

    // @call static
    AjaxForms.onSubmitButtonClick = function(ev) {
        ev.preventDefault();
        var $form = $(ev.target).closest('form');
        // Supposely clicked button. Each submit button may optionally have it's own route.
        // @note: forms may not have active button when submitted via keyboard or programmatically.
        // In such case do not forget to define form[data-route] value.
        /*
        var $btn = $(document.activeElement);
        if ($btn.length && $form.has($btn).length &&
                $btn.is(submitSelector)) {
            route = $btn.data('route');
        }
        */
        var $btn = $(ev.target);
        new App.AjaxForm($form).submit($btn);
    };

    AjaxForms.init = function() {
        if (!this.has()) {
            return;
        }
        this.$forms.ajaxForm();
        this.$cancelButtons.on('click', AjaxForms.onCancelButtonClick);
        // Do not use ajaxForm plugin submit event, otherwise form will be double-POSTed.
        this.$submitButtons.on('click', AjaxForms.onSubmitButtonClick);
        return this;
    };

    AjaxForms.destroy = function() {
        if (!this.has()) {
            return;
        }
        this.$submitButtons.off('click', AjaxForms.onSubmitButtonClick);
        this.$cancelButtons.off('click', AjaxForms.onCancelButtonClick);
        this.$forms.ajaxFormUnbind();
    };

}(App.AjaxForms.prototype);

/**
 * Single instance of submitted ajax form.
 */
App.AjaxForm = function($form) {
    this.init($form);
};

void function(AjaxForm) {

    AjaxForm.init = function($form) {
        this.$form = $form;
    };

    AjaxForm.checkFiles = function(maxSize) {
        if (window.File && window.FileReader && window.FileList && window.Blob) {
            var $formFiles = this.$form.find('input[type="file"]');
            for (var i = 0; i < $formFiles.length; i++) {
                var files = $formFiles[i].files;
                for (var j = 0; j < files.length; j++) {
                    var file = files[j];
                    if (file.size > App.conf.fileMaxSize) {
                        var message = App.trans('Too big file size=%s, max_size=%s', file.size, maxSize)
                        if (typeof $formFiles[i].id === 'string') {
                            App.vmRouter.showView({
                                'view': 'form_error',
                                'id': $formFiles[i].id,
                                'messages': [message]
                            });
                        } else {
                            new App.Dialog({
                                'title': file.name,
                                'message': message,
                                'type': BootstrapDialog.TYPE_DANGER,
                            }).alert();
                        }
                        return false;
                    }
                }
            }
        }
        return true;
    };

    AjaxForm.beforeSubmit = function() {
        App.disableInputs(this.$form);
        if (this.$form.has(this.$btn).length === 0) {
            App.disableInput(this.$btn);
        }
    };

    AjaxForm.always = function() {
        App.enableInputs(this.$form);
        if (this.$form.has(this.$btn).length === 0) {
            App.enableInput(this.$btn);
        }
        if (typeof this.options['uploadProgress'] !== 'undefined') {
            this.$progressBar.remove();
        }
        this._callbacks.always();
    };

    AjaxForm.getUrl = function() {
        var url = App.getDataUrl(this.$btn);
        if (url === undefined) {
            url = App.getDataUrl(this.$form);
        }
        if (url === undefined) {
            throw "Please define data-url or data-route attribute on form or on form submit button.";
        }
        return url;
    };

    AjaxForm.getOptions = function() {
        var self = this;
        return {
            'url': this.getUrl(),
            type: 'post',
            // IE9 poor fake workaround.
            data: {
                "HTTP_X_REQUESTED_WITH": "XMLHttpRequest"
            },
            dataType: 'json',
            beforeSubmit: function() {
                self.beforeSubmit();
            },
            error: function(jqXHR, exception) {
                self.always();
                App.showAjaxError(jqXHR, exception);
                self._callbacks.error(jqXHR, exception);
            },
            success: function(response) {
                self.always();
                // Add $form property for custom viewHandler.
                response.$form = self.$form;
                if (self._callbacks.success(response)) {
                    App.vmRouter.respond(response);
                }
            },
            complete: function() {
                self.ladder.remove();
            }
        };
    };

    AjaxForm.setupProgressBar = function() {
        var self = this;
        if (this.$form.find('input[type="file"]').length > 0) {
            this.$progressBar = $.contents(
                '<div class="default-padding">' +
                '<div class="progress active">' +
                '<div class="progress-bar progress-bar-striped" style="width: 0%;"></div>' +
                '</div>' +
                '</div>'
            );
            this.$progressBar.insertAfter(this.$btn);
            this.options['uploadProgress'] = function(event, position, total, percentComplete) {
                self.$progressBar.find('.progress-bar').css('width', percentComplete + '%');
            };
        }
    };

    AjaxForm.submit = function($btn, callbacks) {
        this.$btn = $btn;
        if (typeof App.conf.fileMaxSize !== 'undefined' && !this.checkFiles(App.conf.fileMaxSize)) {
            return;
        }
        if (typeof callbacks !== 'object') {
            callbacks = {};
        }
        this._callbacks = $.extend({
                always: function () {},
                error: function (jqXHR, exception) {},
                success: function (response) { return true; },
            },
            callbacks
        );
        this.options = this.getOptions();
        this.setupProgressBar();
        this.ladder = new App.Ladder(this.$btn);
        this.$form.ajaxSubmit(this.options);
        /**
         * Commented out because IE9 does not support .setRequestHeader() (due to iframe emulation?).
         * Patched in context middleware process_request() / process_view() at server-side instead.
         */
        // IE9 misses this header, causing django request.is_ajax() to fail.
        // var jqXHR = $form.data('jqxhr');
        // jqXHR.setRequestHeader("X_REQUESTED_WITH", "XMLHttpRequest");
        return false;
    };

}(App.AjaxForm.prototype);


// Cache for compiled templates.
App.bag._templates = {};

App.compileTemplate = function(tplId) {
    if (typeof App.bag._templates[tplId] === 'undefined') {
        var tpl = document.getElementById(tplId);
        if (tpl === null) {
            throw sprintf("Unknown underscore template id: %s", tplId);
        }
        // Local context variables will be passed to 'self' object variable in template text,
        // to speed-up template expansion and to inject helper functions.
        // http://underscorejs.org/#template
        App.bag._templates[tplId] = _.template(
            $(tpl).html(), {variable: 'self'}
        );
    }
    return App.bag._templates[tplId];
};


/**
 * Tags converter which is executed during App.initClient() content ready and for each expanded underscore.js template.
 * Converts <card-success id="panel1" class="my-panel"> to <div id="panel1" class="card text-white bg-success my-panel">
 * Note:
 *   Using custom tags with initial page content may produce flickering, because these are not native browser custom tags.
 *     To prevent such flickering, setup similar CSS rules for custom tags to the substituted ones.
 *   Using custom tags in templates is encouraged and produces no extra flickering.
 */
App.TransformTags = function() {
    this.init();
};

void function(TransformTags) {

    TransformTags.tagNameToClassName = function(elem, tagName) {
        return $(elem).replaceWithTag('div').addClass(tagName.toLowerCase());
    };

    TransformTags.init = function() {
        // Upper case keys only!
        this.tags = {
            // Shortcut attrs for underscore.js templates:
            // _* is converted to data-template-*
            'TPL': function(elem, tagName) {
                /**
                 * Removing the shortcut attrs is not necessary,
                 * because the tag will be replaced by template content anyway.
                 */
                for (var i = 0; i < elem.attributes.length; i++) {
                    var name = elem.attributes[i].name;
                    if (name.substr(0, 2) === 't-') {
                        elem.setAttribute(
                            'data-template-' + name.substr(2), elem.attributes[i].value
                        );
                    }
                }
                return $(elem);
            },
            'PANEL-HEADING': TransformTags.tagNameToClassName,
            'PANEL-BODY': TransformTags.tagNameToClassName,
            'PANEL-FOOTER': TransformTags.tagNameToClassName,
            'PANEL-TITLE': function(elem, tagName) {
                return $(elem).replaceWithTag('h3').addClass(tagName.toLowerCase());
            },
        };
    };

    TransformTags.add = function(tags) {
        for (var tagName in tags) {
            if (tags.hasOwnProperty(tagName)) {
                this.tags[tagName] = tags[tagName];
            }
        }
        return this;
    };

    TransformTags.convertTag = function(elem) {
        var tagName = $(elem).prop('tagName');
        if (tagName !== undefined) {
            var $result = this.tags[tagName].call(this, elem, tagName);
        };
        return $result;
    };

    TransformTags.applyTags = function(selector) {
        var self = this;
        var $selector = $(selector);
        var tagNames = _.keys(this.tags)
        var tagsSelector = tagNames.join(',');
        var nodes = [];
        // Transform the nested tags from the innermost to the outermost order.
        $selector.find(tagsSelector).each(function() {
            nodes.push({node: this, depth: -$(this).parents().length});
        });
        nodes = _.sortBy(nodes, 'depth');
        for (var i = 0; i < nodes.length; i++) {
            this.convertTag(nodes[i].node);
        }
        // Transform top tags.
        $.each($selector, function(k, v) {
            if (tagNames.indexOf($(v).prop('tagName')) !== -1) {
                var $result = self.convertTag(v);
                if ($(v).parents().length > 0) {
                    // Top tag belongs to the subtree.
                    $(v).replaceWith($result);
                } else {
                    // Top tag is the root of the subtree (template expansion).
                    $selector[k] = $result[0];
                }
            }
        });
        return $selector;
    };

}(App.TransformTags.prototype);


/**
 * underscore.js templates default processor (default class binding),
 * available in underscore templates as self.
 *
 * Currently used html5 data attributes:
 *
 * 'data-template-class' : optional Javascript classpath to template processor class ('App.Tpl' when omitted).
 * 'data-template-options' : optional options argument of template processor class constructor.
 * 'data-template-id' : DOM id of underscore.js template to expand recursively.
 * 'data-template-args' : optional data to be used to control the logic flow of current underscore.js template via
 *     App.Tpl.get() method available as self.get() in template source code.
 * 'data-template-args-nesting': set to false to disable inheritance of data-template-args attribute by inner templates.
 *
 * todo: Add .flatatt() to easily manipulate DOM attrs in templates.
 */
App.Tpl = function(options) {
    this.init(options);
};

void function(Tpl) {

    Tpl.parentProps = ['data', 'templates'];

    Tpl.init = function(options) {
        var defOptions = {}
        _.each(this.parentProps, function(propName) {
            defOptions[propName] = {};
        });
        var _options = $.extend(defOptions, options);
        // Set of data used to control current template logic via Tpl.get() method.
        this.data = _options.data;
        // Optionally substitutes templateId to another one to create custom layout.
        this.templates = _options.templates;
    };

    Tpl.inheritProcessor = function(elem, clone) {
        var $elem = $(elem);
        var child;
        // There is no instance supplied. Load from classPath.
        var classPath = $elem.data('templateClass');
        var templateOptions = $elem.data('templateOptions');
        if (classPath === undefined && templateOptions === undefined) {
            if (clone === true) {
                child = this.cloneProcessor();
            } else {
                child = this;
            }
        } else {
            var options = $.extend({}, templateOptions);
            if (classPath === undefined) {
                child = App.globalIoc['App.Tpl'](options);
            } else {
                child = App.newClassByPath(classPath, [options]);
            }
            child.inheritProps(this);
        }
        return child;
    };

    Tpl.cloneProcessor = function() {
        return $.extend(true, {}, this);
    };

    // Override for custom inheritance.
    Tpl.inheritProps = function(parent) {
        var child = this;
        _.each(this.parentProps, function(propName) {
            $.inheritProps(parent[propName], child[propName]);
        });
    };

    Tpl.extendData = function(data) {
        this.data = $.extend(this.data, data);
    };

    Tpl.getTemplateData = function(data) {
        return (typeof data === 'undefined') ? {} : data;
    };

    // Optionally substitutes templateId to another one to create custom layout.
    Tpl.getTemplateId = function(templateId) {
        return (typeof this.templates[templateId] === 'undefined') ? templateId : this.templates[templateId];
    };

    Tpl.get = function(varName, defaultValue) {
        if (typeof varName !== 'string') {
            throw 'varName must be string';
        }
        /*
        if (typeof defaultValue === 'undefined') {
            defaultValue = false;
        }
        */
        return (typeof this.data[varName] === 'undefined') ? defaultValue : this.data[varName];
    };

    /**
     * Expand underscore.js template to string.
     */
    Tpl.expandTemplate = function(tplId) {
        var compiled = App.compileTemplate(
            this.getTemplateId(tplId)
        );
        return compiled(this);
    };

    /**
     * Manually loads one template (by it's DOM id) and expands it with specified instance self into jQuery DOM nodes.
     * Template will be processed recursively.
     */
    Tpl.domTemplate = function(tplId) {
        var self = this;
        var contents = self.expandTemplate(tplId);
        var $result = $.contents(contents);
        $result = App.transformTags.applyTags($result);
        // Load recursive nested templates, if any.
        $result.each(function(k, v) {
            var $node = $(v);
            if ($node.prop('nodeType') === 1) {
                self.loadTemplates($node);
            }
        });
        return $result;
    };

    /**
     * Search for template args in parent templates.
     * Accumulate all ancestors template args from up to bottom.
     */
    Tpl.addSubArgs = function($ancestors) {
        for (var i = $ancestors.length - 1; i >= 0; i--) {
            var $ancestor = $ancestors.eq(i);
            var ancestorTplArgs = $ancestor.data('templateArgs');
            if (ancestorTplArgs !== undefined &&
                    $ancestor.data('templateArgsNesting') !== false) {
                this.extendData(ancestorTplArgs);
            }
        }
    };

    Tpl.renderSubTemplates = function() {
        var self = this;
        var $result = this.domTemplate(this.tplId);
        var topNodeCount = 0;
        var topNode = undefined;
        // Make sure that template contents has only one top tag, otherwise .contents().unwrap() may fail sometimes.
        $result.each(function(k, v) {
            if ($(v).prop('nodeType') === 1) {
                topNode = v;
                if (++topNodeCount > 1) {
                    throw "Template '" + self.tplId + "' expanded contents should contain the single top DOM tag.";
                }
            }
        });
        return {
            'nodes': $result,
            'topNode': topNode,
        };
    };

    Tpl.prependTemplates = function(target, $ancestors) {
        var $target = $(target);
        this.tplId = $target.attr('data-template-id');
        if (this.tplId === undefined) {
            console.log('skipped undefined data-template-id for $target: ' + $target.prop('outerHTML'));
            console.dir($target);
        } else {
            if ($target.data('templateArgsNesting') !== false) {
                this.addSubArgs($ancestors);
            }
            this.extendData(
                this.getTemplateData($target.data('templateArgs'))
            );
            var subTemplates = this.renderSubTemplates();
            /**
             * If there are any non 'data-template-*' attributes in target node, copy these to subTemplates top node.
             */
            if (subTemplates.topNode !== undefined) {
                for (var i = 0; i < target.attributes.length; i++) {
                    var name = target.attributes[i].name;
                    if (name === 'class') {
                        $(subTemplates.topNode).addClass(target.attributes[i].value);
                    } else if (name.substr(0, 14) !== 'data-template-' &&
                            name.substr(0, 2) !== 't-') {
                        subTemplates.topNode.setAttribute(
                            name, target.attributes[i].value
                        );
                    }
                }
            }
            $target.prepend(subTemplates.nodes);
        }
    };

    /**
     * Recursive underscore.js template autoloading.
     * Does not use html5 <template> tag because IE lower than Edge does not support it.
     * Make sure loaded template is properly closed XHTML, otherwise jQuery.html() will fail to load it completely.
     */
    Tpl.loadTemplates = function($selector) {
        var $targets = $selector.findSelf('[data-template-id]');
        // Build the list of parent templates for each template available.
        var $ancestors = [];
        $targets.each(function(k, currentTarget) {
            $ancestors[k] = $(currentTarget).parents('[data-template-id]');
            $ancestors[k]._targetKey = k;
        });
        // Sort the list of parent templates from outer to inner nodes of the tree.
        $ancestors = _.sortBy($ancestors, 'length');
        // Expand innermost templates first, outermost last.
        for (var k = $ancestors.length - 1; k >= 0; k--) {
            var target = $targets.get($ancestors[k]._targetKey);
            var ancestorTpl = this.inheritProcessor(target);
            ancestorTpl.prependTemplates(target, $ancestors[k]);
        };
        $targets.each(function() {
            $(this).contents().unwrap();
        });
    };

}(App.Tpl.prototype);


/**
 * Recursive underscore.js template autoloading with template self instance binding.
 */
App.bindTemplates = function($selector, tpl) {
    $selector.each(function() {
        if (typeof tpl === 'undefined') {
            tpl = App.globalIoc['App.Tpl']().inheritProcessor(this, false);
        }
        tpl.loadTemplates($(this));
    });
};

App.initClientHooks = [];

/**
 * @note: Do not forget to call method=='init' for newly loaded AJAX DOM.
 * Dispose is not supposed to restore DOM to original state, rather it is supposed to remove event handlers
 * and bootstrap widgets, to minimize memory leaks, before DOM nodes are emptied.
 */
App.initClient = function(selector, method, reverse) {

    var execHook = function($selector, hook, method) {
        if (typeof hook === 'function') {
            if (method === 'init') {
                // Non-disposable 'init'.
                hook($selector);
            }
        } else if (typeof hook === 'object') {
            if (typeof hook[method] === 'function') {
                // 'dispose' or custom action.
                hook[method]($selector);
            } else {
                throw sprintf("App.initClient hook must be a function or object with key '%s'", method);
            }
        }
    };

    if (typeof selector === 'undefined') {
        throw 'App.initClient requires valid selector as safety precaution.';
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
        for (var i = App.initClientHooks.length - 1; i >= 0; i--) {
            execHook($selector, App.initClientHooks[i], method);
        }
    } else {
        for (var i = 0; i < App.initClientHooks.length; i++) {
            execHook($selector, App.initClientHooks[i], method);
        }
    }
};

App.initClientMark = function(html) {
    return '<span class="init-client-begin"></span>' + html + '<span class="init-client-end"></span>';
};

App.initClientApply = function(selector, method) {
    var $selector = $(selector);
    if (typeof method === 'undefined') {
        method = 'init';
    }
    var markerBegin = method + '-client-begin';
    var markerEnd = method + '-client-end';
    if ($selector.findSelf('.' + markerBegin).length === 0) {
        $selector = $selector.parent();
        if ($selector.find('.' + markerBegin).length === 0) {
            return App.initClient(selector, method);
        }
    }
    $selector.findSelf('.' + markerBegin).each(function(k, v) {
        // todo: check unbalanced trees.
        App.initClient($(v).nextUntil('.' + markerEnd), method);
    });
    if (method === 'init') {
        $selector.findSelf('.' + markerBegin).removeClass(markerBegin).addClass('dispose-client-begin');
        $selector.find('.' + markerEnd).removeClass(markerEnd).addClass('dispose-client-end');
    } else if (method === 'dispose') {
        $selector.findSelf('.' + markerBegin).remove();
        $selector.find('.' + markerEnd).remove();
    }
};

App.routeUrl = function(route, kwargs) {
    if (typeof App.conf.url[route] === 'undefined') {
        throw sprintf("Undefined route: '%s'", route);
    }
    if (typeof kwargs === 'undefined') {
        return App.conf.url[route];
    } else {
        return sprintf(App.conf.url[route], kwargs);
    }
};

App.get = function(route, data, options) {
    if (typeof options === 'undefined') {
        options = {};
    }
    var url = (typeof options.kwargs === 'undefined') ?
        App.routeUrl(route) :
        App.routeUrl(route, options.kwargs);
    delete options.kwargs;
    return $.get(
        url,
        (typeof data === 'undefined') ? {} : data,
        function(response) {
            App.vmRouter.respond(response, options);
        },
        'json'
    ).fail(App.showAjaxError);
};

App.post = function(route, data, options) {
    if (typeof data === 'undefined') {
        data = {};
    }
    if (typeof options === 'undefined') {
        options = {};
    }
    var url = (typeof options.kwargs === 'undefined') ?
        App.routeUrl(route) :
        App.routeUrl(route, options.kwargs);
    delete options.kwargs;
    if (typeof data.csrfmiddlewaretoken === 'undefined') {
        data.csrfmiddlewaretoken = App.conf.csrfToken;
    }
    return $.post(
        url,
        data,
        function(response) {
            App.vmRouter.respond(response, options);
        },
        'json'
    ).fail(App.showAjaxError);
};

App.createInstances = function(readyInstances) {
    for (var instancePath in readyInstances) {
        if (readyInstances.hasOwnProperty(instancePath)) {
            var classDef = readyInstances[instancePath];
            for (var classPath in classDef) {
                if (classDef.hasOwnProperty(classPath)) {
                    var args = classDef[classPath];
                    if (!_.isArray(args)) {
                        args = [args];
                    }
                    var instance = App.newClassByPath(classPath, args);
                    App.propSet(null, instancePath, instance);
                }
            }
        }
    }
};

/**
 * Warning: does not parse the querystring, so the same script still could be included via the different querystring.
 */
App.assertUniqueScripts = function() {
    var scripts = {};
    $(document).find('script[src]').each(function(k, v) {
        var src = $(v).prop('src');
        if (typeof scripts[src] !== 'undefined') {
            throw new Error(sprintf('Multiple inclusion of the same script: "%s"', src));
        } else {
            scripts[src] = true;
        }
    });
};

// Late initialization allows to patch / replace classes in user scripts.
App.readyInstances = {
    'App.queryString': {'QueryString' : []},
    'App.components': {'App.Components': []},
};
App.documentReadyHooks = [function() {
    App.assertUniqueScripts();
    var m = moment();
    Cookies.set('local_tz', parseInt(m.zone() / 60));
    App.createInstances(App.readyInstances);
    App.initClient(document);
    App.initTabPane();
    $(window).on('hashchange', function() {
        $(document).highlightListUrl();
    });
    if (typeof App.clientData === 'undefined') {
        console.log('@note: client_data middleware is disabled at server side.')
    } else if (typeof App.clientData.onloadViewModels !== 'undefined') {
        // Execute server-side injected initial viewmodels, if any.
        App.vmRouter.respond(App.clientData.onloadViewModels);
    }
}];

$(document).ready(function() {
    for (var i = 0; i < App.documentReadyHooks.length; i++) {
        App.documentReadyHooks[i]();
    }
})
.on('formset:added', function(event, $row, formsetName) {
    App.initClient($row);
});


App.ko.Subscriber = function() {};

/**
 * Switches Knockout.js subscription to bound instance methods.
 * https://django-jinja-knockout.readthedocs.io/en/latest/quickstart.html#knockout-js-subscriber
 */
void function(Subscriber) {

    Subscriber.getPropSubscription = function(propChain, methodChain) {
        propChain = App.propChain(propChain);
        if (typeof methodChain === 'undefined') {
            var propHash = (typeof propChain === 'string') ? $.capitalize(propChain) : '_' + propChain.join('_');
            methodChain = 'on' + propHash;
        }
        var prop = App.propGet(this, propChain);
        if (typeof prop !== 'function' || !ko.isObservable(prop)) {
            var parent = App.propGetParent(this, propChain);
            if (typeof ko.es5 !== 'undefined' &&
                    $.isMapping(parent.obj) &&
                    ko.es5.isTracked(parent.obj, parent.childName)
            ) {
                var prop = ko.getObservable(parent.obj, parent.childName);
            } else {
                throw sprintf("%s is not observable", JSON.stringify(propChain));
            }
        }
        var method = App.propGet(this, methodChain);
        if (typeof method !== 'function') {
            throw sprintf("%s is not callable", JSON.stringify(methodChain));
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
     */
    Subscriber.subscribeToMethod = function(propChain, methodChain) {
        var result = this.getPropSubscription(propChain, methodChain);
        if (typeof this.koSubscriptions[result.hash] === 'undefined') {
            this.koSubscriptions[result.hash] = result.prop.subscribe(_.bind(result.method, this));
        }
    };

    Subscriber.disposeMethod = function(propChain, methodChain) {
        var result = this.getPropSubscription(propChain, methodChain);
        if (typeof this.koSubscriptions[result.hash] !== 'undefined') {
            this.koSubscriptions[result.hash].dispose();
            delete this.koSubscriptions[result.hash];
        }
    };

}(App.ko.Subscriber.prototype);


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
        } else {
            dst[k] = v;
        }
    });
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

// Use with care. Do not put custom bindings into App.documentReadyHooks,
// there are ko.bindingHandlers for that.
ko.bindingHandlers.initclient = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        App.initClient(element);
        ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
            App.initClient(element, 'dispose');
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


App.ComponentManager = function(options) {
    this.init(options);
};

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
void function(ComponentManager) {

    ComponentManager.init = function(options) {
        this.elem = options.elem;
        this.$nestedComponents = [];
    };

    ComponentManager.getSelector = function(elem) {
        this.$selector = $(elem);
        if (this.$selector.data('componentSelector') !== undefined) {
            // Sparse component that contains separate multiple DOM subtrees.
            this.$selector = $(this.$selector.data('componentSelector'));
        }
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

}(App.ComponentManager.prototype);

/**
 * Auto-instantiated Javascript classes bound to selected DOM elements.
 * Primarily used with Knockout.js bindings, although is not limited to.
 *     'data-component-class' html5 attribute used as Javascript class path;
 *     'data-component-options' html5 attribute used as an argument of class constructor;
 *     'data-component-selector' html5 attribute used to define sparse component selector;
 *     'data-event' html5 attribute optionally specifies DOM event used to instantiate class;
 *         otherwise, the class is instantiated when DOM is ready;
 */
App.Components = function() {
    this.init();
};

void function(Components) {

    Components.init = function() {
        this.list = [];
    };

    Components.create = function(elem) {
        var $elem = $(elem);
        if ($elem.data('componentIdx') !== undefined) {
            throw sprintf('Component already bound to DOM element with index %d', $elem.data('componentIdx'));
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
                throw 'Undefined data-component-class classPath.';
            }
            var cls = App.objByPath(classPath, 'function');
            var component = new cls(options);
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
        var cm = new App.ComponentManager({'elem': elem});
        var $selector = cm.getSelector(elem);
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
            throw 'Supplied element has no bound component.';
        }
        return this.list[componentIdx].component;
    };

    Components.getById = function(id) {
        var elem = document.getElementById(id);
        if (elem === null) {
            throw sprintf('Unknown id of component element: "%s"', id);
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
            component.removeComponent($selector);
            this.list[componentIdx] = null;
        }
        return desc;
    };

}(App.Components.prototype);

// Get array with all component instances by jQuery selector.
$.fn.components = function() {
    var components = [];
    this.each(function() {
        components.push(App.components.get(this));
    });
    return components;
};

// Get object with first component instance matching supplied jQuery selector.
$.fn.component = function() {
    var component = null;
    this.each(function() {
        component = App.components.get(this);
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


/**
 * Instantiation of bootstrap popover which optionally supports underscore.js templates.
 */
App.ContentPopover = function(k, v) {
    var $popover = $(v);
    $popover.popover({
        container: 'body',
        html : $(this).data('html'),
        placement: $(this).data('placement'),
        content: function() {
            var template = $(this).data("contentTemplate");
            if (template !== undefined) {
                var options = $(this).data("contentTemplateOptions");
                var processor = App.globalIoc['App.Tpl'](options);
                var $content = processor.domTemplate(template);
                App.initClient($content);
                return $content;
            } else {
                return $(this).data('content');
            }
        },
        title: function() {
            return $(this).attr('title');
        },
    }).on("hidden.bs.popover", function(e) {
        if ($popover.data("contentTemplate") !== undefined) {
            var $tip = App.propGet($popover.data('bs.popover'), '$tip');
            if ($tip !== undefined) {
                var $content = $tip.find('.popover-content');
                App.initClient($content, 'dispose');
                $tip.find('.popover-content').empty();
            }
        }
    });
};


App.initClientHooks.push({
    init: function($selector) {
        App.transformTags.applyTags($selector);
        App.bindTemplates($selector);
        $selector.findSelf('[data-toggle="popover"]').each(App.ContentPopover);
        $selector.findSelf('[data-toggle="tooltip"]').tooltip();
        $selector.dataHref();
        $selector.highlightListUrl();
        App.SelectMultipleAutoSize($selector);
        new App.DatetimeWidget($selector).init();
        new App.AjaxForms($selector).init();
        new App.AjaxButton($selector).init();
        $selector.prefillField('init');
        $selector.inputAsSelect('init');
        $selector.autogrow('init');
        $selector.optionalInput('init');
        $selector.collapsibleSubmit('init');
        $selector.findSelf('.link-preview').linkPreview('init');
    },
    dispose: function($selector) {
        $selector.findSelf('.link-preview').linkPreview('destroy');
        $selector.collapsibleSubmit('destroy');
        $selector.optionalInput('destroy');
        $selector.autogrow('destroy');
        $selector.inputAsSelect('destroy');
        $selector.prefillField('destroy');
        new App.AjaxButton($selector).destroy();
        new App.AjaxForms($selector).destroy();
        new App.DatetimeWidget($selector).destroy();
        $selector.findSelf('[data-toggle="popover"]').popover('destroy');
    }
});

/**
 * Automatic class instantiation by 'component' css class.
 * Mostly is used to instantinate App.ko classes, but is not limited to.
 *
 */
App.initClientHooks.push({
    init: function($selector) {
        $selector.findAttachedComponents().each(function() {
            var evt = $(this).data('event');
            App.components.add(this, evt);
        });
    },
    dispose: function($selector) {
        $selector.findRunningComponents().each(function() {
            var cm = new App.ComponentManager({'elem': this});
            var $componentSelector = cm.getSelector(this);
            // Note: sparse components can potentially unbind the DOM subtrees outside of dispose $selector.
            App.components.unbind($componentSelector);
        });
    }
});
