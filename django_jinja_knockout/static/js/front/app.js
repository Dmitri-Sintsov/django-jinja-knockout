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
};
App = window.App;


App.globalIoc = {
    'App.Tpl': function(options) {
        return new App.Tpl(options);
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
    console.log('@note: No Django gettext is loaded, no localization, falling back to sprintf.js')
} else {
    throw "@error: Neither Django gettext nor sprintf.js is available."
}

App.queryString = new QueryString();

/**
 * Render scalar element as plain html or as nested list of specified block tags.
 */
App.renderNestedList = function(element, value, options) {
    var $element = $(element);
    if (typeof options !== 'object') {
        options = {};
    }
    var fn = (typeof options.fn === 'undefined') ? 'text' : options.fn; // 'html'
    if (typeof options.keyPath === 'undefined') {
        options.keyPath = [];
    }
    if (typeof options.keyPrefix === 'undefined') {
        options.keyPrefix = '';
    }
    if (typeof value !== 'object') {
        $element[fn](value);
        return;
    }
    var blockTags;
    if (typeof options.blockTags === 'undefined') {
        blockTags = [
            {
                enclosureTag: '<ul>',
                enclosureClasses: 'list-group',
                itemTag: '<li>',
                itemClasses: 'list-group-item preformatted'
            }
        ];
    } else if (_.isArray(options.blockTags)) {
        blockTags = options.blockTags;
    } else if (typeof options.blockTags === 'string') {
        blockTags = App.propByPath(options.blockTags);
    } else {
        console.log('Invalid type of options.blockTags: ' + typeof(options.blockTags));
    }
    var level = (typeof options.level === 'undefined') ? 0 : options.level;
    if (_.size(value) > 0) {
        var $ul = $(blockTags[level].enclosureTag)
            .addClass(blockTags[level].enclosureClasses);
        $.each(value, function(k, v) {
            var localKey;
            if (typeof k === 'string') {
                options.keyPath.push(k);
            }
            if (typeof v === 'object') {
                var nextLevel = (level < blockTags.length - 1) ? level + 1 : level;
                App.renderNestedList($ul, v, {
                    fn: fn,
                    blockTags: blockTags,
                    level: nextLevel,
                    showKeys: options.showKeys,
                    i18n: options.i18n,
                    keyPath: options.keyPath,
                    keyPrefix: options.keyPrefix,
                });
            } else {
                if (typeof k === 'string' && options.showKeys) {
                    if (typeof options.i18n === 'object') {
                        var localPath = options.keyPath.join('›');
                        if (typeof options.i18n[localPath] !== 'undefined') {
                            localKey = options.i18n[localPath];
                        } else if (options.keyPrefix !== '' &&
                                typeof options.i18n[options.keyPrefix + '›' + localPath] !== 'undefined') {
                            localKey = options.i18n[options.keyPrefix + '›' + localPath];
                        } else if (localPath !== k && typeof options.i18n[k] !== 'undefined') {
                            localKey = options.i18n[k];
                        } else {
                            localKey = k;
                        }
                    } else {
                        localKey = k;
                    }
                    v = localKey + ': ' + v;
                }
                var $li = $(blockTags[level].itemTag)
                    .addClass(blockTags[level].itemClasses)
                    [fn](v);
                $ul.append($li);
            }
            if (typeof k === 'string') {
                options.keyPath.pop();
            }
        });
        $element.append($ul);
    }
    return $element;
};

App.blockTags = {
    list: [
        {
            enclosureTag: '<ul>',
            enclosureClasses: 'list-group',
            itemTag: '<li>',
            itemClasses: 'condensed list-group-item preformatted'
        },
        {
            enclosureTag: '<ul>',
            enclosureClasses: 'list-group',
            itemTag: '<li>',
            itemClasses: 'condensed list-group-item list-group-item-warning preformatted'
        },
    ],
    badges: [
        {
            enclosureTag: '<div>',
            enclosureClasses: 'well well-condensed well-sm',
            itemTag: '<span>',
                itemClasses: 'badge preformatted'
        }
    ]
};


/**
 * Static class with nested factory which manages bootstrap tabs.
 */
App.TabPane = {};

(function(TabPane) {

    function Paner(hash) {
        if (typeof hash === 'undefined') {
            hash = window.location.hash;
        }
        this.cleanHash = hash.split(/^#/g).pop();
        this.targetElement = $(document.getElementById(this.cleanHash));
        if (this.targetElement.length > 0) {
            this.pane = this.targetElement.closest('div.tab-pane');
            if (this.pane.length > 0 && this.cleanHash === this.pane.attr('id')) {
                this.anchor = $('a[href="#' + this.pane.attr('id') + '"]');
                this.tab = this.anchor.parents('li[role="presentation"]:first');
            }
        }
    };

    (function(Paner) {

        Paner.exists = function() {
            return App.propGet(this, ['anchor', 'length'], 0) > 0;
        };

        Paner.switchTo = function() {
            if (this.exists()) {
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

        Paner.hide = function() {
            if (this.exists()) {
                this.tab.addClass('hidden');
                this.pane.addClass('hidden');
            }
            return this;
        };

        Paner.show = function() {
            if (this.exists()) {
                this.pane.removeClass('hidden');
                this.tab.removeClass('hidden');
            }
            return this;
        };

        Paner.highlight = function(bgClass, permanent) {
            if (typeof bgClass !== 'string') {
                bgClass = 'bg-success';
            }
            if (this.exists()) {
                this.tab.addClass(bgClass);
                if (permanent !== true) {
                    this.tab.data('highlightClass', bgClass);
                }
            }
            return this;
        };

        Paner.load = function(route, data, options) {
            data.clean_hash = this.cleanHash;
            App.post(route, data, options);
            return this;
        };

    })(Paner.prototype);


    TabPane.switchTo = function() {
        var paner = new Paner();
        if (paner.exists()) {
            return paner.switchTo();
        }
    };

    TabPane.show = function(hash) {
        var paner = new Paner(hash);
        if (paner.exists()) {
            return paner.show();
        }
    };

    TabPane.hide = function(hash) {
        var paner = new Paner(hash);
        if (paner.exists()) {
            return paner.hide();
        }
    };

    TabPane.highlight = function(hash, bgClass, permanent) {
        var paner = new Paner(hash);
        if (paner.exists()) {
            return paner.highlight(bgClass, permanent);
        }
    };

    TabPane.load = function(hash, route, data, options) {
        var paner = new Paner(hash);
        if (paner.exists()) {
            return paner.load(route, data, options);
        }
    };

})(App.TabPane);


// https://github.com/linuxfoundation/cii-best-practices-badge/issues/218
App.initTabPane = function() {
    App.TabPane.switchTo();
    $(window).on('hashchange', App.TabPane.switchTo);
    // Change hash upon pane activation
    $('a[role="tab"]').on('click', function() {
        var href = $(this).attr('href');
        if (typeof href !== 'undefined' && href.match(/^#/)) {
            window.location.hash = href;
        }
    });
}


/**
 * BootstrapDialog wrapper.
 */
App.Dialog = function(options) {
    this.create(options);
};

(function(Dialog) {

    Dialog.type = BootstrapDialog.TYPE_WARNING;
    Dialog.size = BootstrapDialog.SIZE_NORMAL;
    Dialog.template = undefined;
    Dialog.isClosable = false;
    Dialog.autoEmpty = true;
    Dialog.initClient = false;

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
            buttonLabel: App.trans('OK'),
            btnCancelLabel: App.trans('No'),
            btnOKLabel: App.trans('Yes'),
            // BootstrapDialog.SIZE_SMALL
            // BootstrapDialog.SIZE_WIDE
            // BootstrapDialog.SIZE_LARGE
            size: this.size,
            onshow: function(bdialog) {
                self.bdialog = bdialog;
                self.onShow();
            },
            onshown: function(bdialog) {
                self.bdialog = bdialog;
                self.onShown();
            },
            onhide: function(bdialog) {
                self.bdialog = bdialog;
                self.onHide();
            },
            onhidden: function(bdialog) {
                self.bdialog = bdialog;
                self.onHidden();
            },
        };
        this.dialogOptions = $.extend(this.dialogOptions, this.getOptions(), options);
        if (typeof this.dialogOptions.title === 'undefined') {
            this.dialogOptions.title = this.getDialogTitle();
        }
        // Do not forget to escape from XSS.
        if (typeof this.dialogOptions.message === 'undefined') {
            this.dialogOptions.message = this.createDialogContent();
        } else if (!(this.dialogOptions.message instanceof jQuery)) {
            if (typeof this.dialogOptions.message === 'object') {
                var $content = $('<div>');
                this.dialogOptions.message = App.renderNestedList(
                    $content, this.dialogOptions.message, this.getNestedListOptions()
                );
            }
            this.dialogOptions.message = $.contents(this.dialogOptions.message);
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
                    App.viewResponse(cbViewModel);
                } else if (typeof self.dialogOptions.cb_cancel === 'object') {
                    App.viewResponse(self.dialogOptions.cb_cancel);
                }
            }
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

    // @todo: check correctness for messaging.js.
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

})(App.Dialog.prototype);

// Runtime script shared objects.
App.bag = {};

// Knockout,js bindings.
App.ko = {};

App.getSelector = function(selector) {
    return (typeof selector === 'undefined') ?
        $(document) :
        $(selector);
};

App.viewHandlers = {
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
        new App.Dialog(viewModel).alertError();
    },
    'confirm' : function(viewModel) {
        new App.Dialog(viewModel).confirm();
    },
    'append': function(response) {
        $(response.selector).append(response.html);
    },
    'prepend': function(response) {
        $(response.selector).prepend(response.html);
    },
    'after': function(response) {
        $(response.selector).after(response.html);
    },
    'before': function(response) {
        $(response.selector).before(response.html);
    },
    'remove': function(response) {
        $(response.selector).remove();
    },
    'html': function(response) {
        var $selector = $(response.selector);
        if ($selector.length === 0) {
            console.log(
                sprintf('html viewmodel selector not found: "%s"', response.selector)
            );
        }
        App.initClient($selector.find('*'), 'dispose');
        var $html = $.contents(response.html);
        App.initClient($html);
        $selector.empty().append($html);
    },
    'replaceWith': function(response) {
        var $selector = $(response.selector);
        var $parent = $selector.parent();
        if ($selector.length === 0) {
            console.log(
                sprintf('replaceWith viewmodel selector not found: "%s"', response.selector)
            );
        }
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
        var $submits = $(App.AjaxForm.prototype.formSubmitSelector);
        $.each($submits, function(k, v) {
            var $submit = $(v);
            if ($submit.data('url') === response.fromUrl || $submit.prop('data-url') === response.fromUrl) {
                $submit.prop('data-url', response.toUrl);
                $submit.data('url', response.toUrl);
            }
        });
    },
};


App.requireViewHandlers = function(list) {
    for (var i = 0; typeof list[i] !== 'undefined'; i++) {
        if (typeof App.viewHandlers[list[i]] === 'undefined') {
            throw "Missing App.viewHandlers['" + list[i] + "']";
        }
    }
};

App.addViewHandler = function(viewname, fn) {
    var handlerType = typeof App.viewHandlers[viewname];
    if (handlerType === 'undefined') {
        App.viewHandlers[viewname] = fn;
    } else if (handlerType === 'function') {
        App.viewHandlers[viewname] = [
            App.viewHandlers[viewname], fn
        ];
    } else if (_.isArray(App.viewHandlers[viewname])) {
        App.viewHandlers[viewname].push(fn);
    } else {
        throw sprintf(
            "Invalid value of viewhandler '%s': %s",
            viewname,
            JSON.stringify(App.viewHandlers[viewname])
        );
    }
};

App.execViewHandler = function(viewModel, bindContext) {
    var handler = App.viewHandlers[viewModel.view];
    if (typeof handler === 'function') {
        handler(viewModel, bindContext);
    } else if (_.isArray(handler)) {
        for (var i = 0; i < handler.length; i++) {
            handler[i](viewModel, bindContext);
        }
    } else {
        throw sprintf(
            "Invalid previous value of viewhandler '%s': %s",
            viewname,
            JSON.stringify(App.viewHandlers[viewname])
        );
    }
};

App.showView = function(viewModel, bindContext) {
    if (typeof viewModel.view === 'undefined') {
        var viewModelStr = '';
        if (JSON.stringify) {
            try {
                viewModelStr = JSON.stringify(viewModel);
            } catch (e) {
                console.log('@exception: ' + e);
            }
        }
        new App.Dialog({
            'title': App.trans('AJAX request error'),
            'message': App.trans('Undefined response view %s', $.htmlEncode(viewModelStr)),
        }).alertError();
        throw "App.showView() error";
    }
    var hasView;
    if (hasView = (typeof App.viewHandlers[viewModel.view] !== 'undefined')) {
        App.execViewHandler(viewModel, bindContext);
    }
    return hasView;
};

App.filterViewModels = function(response, props) {
    if (typeof props !== 'object') {
        throw "App.filterViewModels props arg must be an instanceof object.";
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

App.executedViewModels = [];

App.viewResponse = function(response, options) {
    if (typeof options !== 'object') {
        options = {};
    }
    var bindContext = (typeof options.bindContext ==='undefined') ? this : options.bindContext;
    if (!_.isArray(response)) {
        response = [response];
    }
    options = $.extend({before: {}, after: {}}, options);
    // @note: Do not replace with response.length; because
    // response may have extra non-integer properties and object
    // has no length property in such case.
    for (var i = 0; typeof response[i] !== 'undefined'; i++) {
        var hasView;
        // Execute custom 'before' handler, when available.
        if (hasView = (typeof options.before[response[i].view] === 'function')) {
            options.before[response[i].view](response[i], bindContext);
        }
        // Execute registered handler.
        var hasView = App.showView(response[i], bindContext) || hasView;
        // Execute custom 'after' handler, when available.
        if (typeof options.after[response[i].view] === 'function') {
            options.after[response[i].view](response[i], bindContext);
            hasView = true;
        }
        if (hasView) {
            App.executedViewModels.push(response[i]);
        } else {
            var viewModelStr = response[i].view;
            if (JSON.stringify) {
                try {
                    viewModelStr = JSON.stringify(response[i]);
                } catch (e) {
                    console.log('@exception: ' + e);
                }
            }
            console.log('Warning: skipped unknown view: ' + viewModelStr);
        }
    }
};

App.savedResponses = {};

App.saveResponse = function(name, response) {
    App.savedResponses[name] = response;
};

App.loadResponse = function(name) {
    if (typeof App.savedResponses[name] !== 'undefined') {
        App.viewResponse(App.savedResponses[name]);
        delete App.savedResponses[name];
    }
};

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
    $.each( $(parent).find(':input:visible'), function(k, v) {
        App.disableInput(v);
    });
};

App.enableInputs = function(parent) {
    $.each( $(parent).find(':input:visible'), function(k, v) {
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

/**
 * @note: has optional support for viewModel.instance.destroy()
 * @todo: destroy tooltip errors only for the form specified
 */
App.destroyTooltipErrors = function(form) {
    App.executedViewModels = _.filter(
        App.executedViewModels,
        function(viewModel) {
            if (viewModel.view === 'tooltip_error' &&
                    typeof viewModel.instance !== 'undefined') {
                viewModel.instance.destroy();
                return false;
            }
            return true;
        }
    );
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
    App.viewResponse({
        'view': 'alert_error',
        'title': App.trans('Request error'),
        'message': message
    });
};

App.SelectMultipleAutoSize = function($selector) {
    $.each($selector.findSelf('select[multiple]'), function(k, v) {
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

(function(DatetimeWidget) {

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

})(App.DatetimeWidget.prototype);

App.ladder = function($selector) {
    var self = this;
    this.laddas = [];
    $.each($selector.findSelf('button[type="submit"], input[type="submit"]'), function(k, v) {
        var l = Ladda.create(v);
        l.start();
        self.laddas.push(l);
    });
};

App.ladder.prototype.remove = function() {
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

(function(AjaxButton) {

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
        $.post(url, {csrfmiddlewaretoken: App.conf.csrfToken}, App.viewResponse, 'json')
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

})(App.AjaxButton.prototype);

/**
 * Please use form[data-route] attribute.
 * Do not define form[action], otherwise form may be submitted twice.
 */
App.AjaxForm = function($selector) {
    this.create($selector);
};

(function(AjaxForm) {

    AjaxForm.formSelector = 'form.ajax-form';
    AjaxForm.submitSelector = 'button[type="submit"], input[type="submit"], input[type="image"]';
    AjaxForm.formSubmitSelector = AjaxForm.formSelector + ', ' + AjaxForm.submitSelector;

    AjaxForm.has = function() {
        var result = (typeof $.fn.ajaxForm !== 'undefined');
        if (!result) {
            console.log('@note: jQuery AJAX form plugin is disabled.');
        }
        return result;
    };

    AjaxForm.create = function($selector) {
        this.$forms = $selector.findSelf(AjaxForm.formSelector);
        this.$cancelButtons = this.$forms.find('.btn-cancel-compose');
        this.$submitButtons = this.$forms.find(AjaxForm.submitSelector);
    };

    // @call static
    AjaxForm.onCancelButtonClick = function(ev) {
        var $form = $(ev.target).closest('form');
        App.clearInputs($form);
    };

    // @call static
    AjaxForm.onSubmitButtonClick = function(ev) {
        var $form = $(ev.target).closest('form');
        ev.preventDefault();
        // Supposely clicked button. Each submit button may optionally have it's own route.
        // @note: forms may not have active button when submitted via keyboard or programmatically.
        // In such case do not forget to define form[data-route] value.
        /*
        var $btn = $(document.activeElement);
        if ($btn.length && $form.has($btn) &&
                $btn.is(submitSelector)) {
            route = $btn.data('route');
        }
        */
        var $btn = $(ev.target);
        return AjaxForm.submit($form, $btn);
    };

    AjaxForm.init = function() {
        if (!this.has()) {
            return;
        }
        this.$forms.ajaxForm();
        this.$cancelButtons.on('click', AjaxForm.onCancelButtonClick);
        // Do not use ajaxForm plugin submit event, otherwise form will be double-POSTed.
        this.$submitButtons.on('click', AjaxForm.onSubmitButtonClick);
        return this;
    };

    AjaxForm.destroy = function() {
        if (!this.has()) {
            return;
        }
        this.$submitButtons.off('click', AjaxForm.onSubmitButtonClick);
        this.$cancelButtons.off('click', AjaxForm.onCancelButtonClick);
        this.$forms.ajaxFormUnbind();
    };

    AjaxForm.checkFiles = function($form, maxSize) {
        if (window.File && window.FileReader && window.FileList && window.Blob) {
            var $formFiles = $form.find('input[type="file"]');
            for (var i = 0; i < $formFiles.length; i++) {
                var files = $formFiles[i].files;
                for (var j = 0; j < files.length; j++) {
                    var file = files[j];
                    if (file.size > App.conf.fileMaxSize) {
                        var message = App.trans('Too big file size=%s, max_size=%s', file.size, maxSize)
                        if (typeof $formFiles[i].id === 'string') {
                            App.showView({
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

    // @call static
    AjaxForm.submit = function($form, $btn, callbacks) {
        if (typeof App.conf.fileMaxSize !== 'undefined' &&
                !AjaxForm.checkFiles($form, App.conf.fileMaxSize)) {
            return;
        }
        var url = App.getDataUrl($btn);
        if (typeof callbacks !== 'object') {
            callbacks = {};
        }
        var _callbacks = $.extend({
                always: function () {},
                error: function (jqXHR, exception) {},
                success: function (response) { return true; },
            },
            callbacks
        );
        if (url === undefined) {
            url = App.getDataUrl($form);
        }
        if (url === undefined) {
            throw "Please define data-url or data-route attribute on form or on form submit button.";
        }
        var always = function() {
            App.enableInputs($form);
            if (typeof options['uploadProgress'] !== 'undefined') {
                $progressBar.remove();
            }
            _callbacks.always();
        };
        var options = {
            'url': url,
            type: 'post',
            // IE9 poor fake workaround.
            data: {
                "HTTP_X_REQUESTED_WITH": "XMLHttpRequest"
            },
            dataType: 'json',
            beforeSubmit: function() {
                App.destroyTooltipErrors($form);
                App.disableInputs($form);
            },
            error: function(jqXHR, exception) {
                always();
                App.showAjaxError(jqXHR, exception);
                _callbacks.error(jqXHR, exception);
            },
            success: function(response) {
                always();
                // Add $form property for custom viewHandler.
                response.$form = $form;
                if (_callbacks.success(response)) {
                    App.viewResponse(response);
                }
            },
            complete: function() {
                l.remove();
            }
        };
        if ($form.find('input[type="file"]').length > 0) {
            var $progressBar = $.contents(
                '<div class="default-padding"><div class="progress active"><div class="progress-bar progress-bar-striped" style="width: 0%;"></div></div></div>'
            );
            $progressBar.insertAfter($btn);
            options['uploadProgress'] = function(event, position, total, percentComplete) {
                $progressBar.find('.progress-bar').css('width', percentComplete + '%');
            };
        }
        var l = new App.ladder($btn);
        $form.ajaxSubmit(options);
        /**
         * Commented out because IE9 does not support .setRequestHeader() (due to iframe emulation?).
         * Patched in context middleware process_request() / process_view() at server-side instead.
         */
        // IE9 misses this header, causing django request.is_ajax() to fail.
        // var jqXHR = $form.data('jqxhr');
        // jqXHR.setRequestHeader("X_REQUESTED_WITH", "XMLHttpRequest");
        return false;
    };

})(App.AjaxForm.prototype);

App.DialogButton = function($selector) {
    this.create($selector);
};

(function(DialogButton) {

    DialogButton.create = function($selector) {
        this.$dialogButtons = $selector.findSelf('.dialog-button');
    };

    DialogButton.onClick = function(ev) {
        var $target = $(ev.target);
        var dialog = $target.data('DialogButton').instance;
        dialog.show();
    };

    DialogButton.init = function() {
        $.each(this.$dialogButtons, function(k, v) {
            var dialog = new App.Dialog($(v).data('options'));
            $(v).data('DialogButton', {instance: dialog});
            $(v).on('click', DialogButton.onClick);
        });
        return this;
    };

    DialogButton.destroy = function() {
        $.each(this.$dialogButtons, function(k, v) {
            var dialog = $(v).data('DialogButton').instance;
            // Assumes BootstrapDialog.autodestroy == true;
            dialog.close();
            $(v).off('click', DialogButton.onClick);
            $(v).removeData('DialogButton');
        });
        return this;
    };

})(App.DialogButton.prototype);

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
 *
 * todo: Add .flatatt() to easily manipulate DOM attrs in templates.
 */
App.Tpl = function(options) {
    this.init(options);
};

(function(Tpl) {

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

    Tpl.inheritProcessor = function($selector, clone) {
        var child;
        // There is no instance supplied. Load from classPath.
        var classPath = $selector.data('templateClass');
        var templateOptions = $selector.data('templateOptions');
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
                child = App.newClassFromPath(classPath, [options]);
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
        // Load recursive nested templates, if any.
        $.each($result, function(k, v) {
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
        var $result = this.domTemplate(this.tplId);
        var topNodeCount = 0;
        // Make sure that template contents has only one top tag, otherwise .contents().unwrap() may fail sometimes.
        $.each($result, function(k, v) {
            if ($(v).prop('nodeType') === 1) {
                if (++topNodeCount > 1) {
                    throw "Template '" + this.tplId + "' expanded contents should have only one top DOM tag.";
                }
            }
        });
        return $result;
    };

    Tpl.prependTemplates = function($target, $ancestors) {
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
            var $subTemplates = this.renderSubTemplates();
            $target.prepend($subTemplates);
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
        $.each($targets, function(k, currentTarget) {
            $ancestors[k] = $(currentTarget).parents('[data-template-id]');
            $ancestors[k]._targetKey = k;
        });
        // Sort the list of parent templates from outer to inner nodes of the tree.
        $ancestors = _.sortBy($ancestors, 'length');
        // Expand innermost templates first, outermost last.
        for (var k = $ancestors.length - 1; k >= 0; k--) {
            var $target = $targets.eq($ancestors[k]._targetKey);
            var ancestorTpl = this.inheritProcessor($target);
            ancestorTpl.prependTemplates($target, $ancestors[k]);
        };
        $.each($targets, function(k, currentTarget) {
            $(currentTarget).contents().unwrap();
        });
    };

})(App.Tpl.prototype);

/**
 * Recursive underscore.js template autoloading with template self instance binding.
 */
App.bindTemplates = function($selector, tpl) {
    if (typeof tpl === 'undefined') {
        tpl = App.globalIoc['App.Tpl']().inheritProcessor($selector, false);
    }
    tpl.loadTemplates($selector);
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
    var $selector = App.getSelector(selector);
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
    $.each($selector.findSelf('.' + markerBegin), function(k, v) {
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
            App.viewResponse(response, options);
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
    data.csrfmiddlewaretoken = App.conf.csrfToken;
    return $.post(
        url,
        (typeof data === 'undefined') ? {} : data,
        function(response) {
            App.viewResponse(response, options);
        },
        'json'
    ).fail(App.showAjaxError);
};

/**
 * Usage:
 *   App.propGet(this, 'propName');
 *   ...
 *   App.propGet(someInstance, ['propName1', 'propName2', 'propNameN'], 'defaultValue');
 */
App.propGet = function(self, propChain, defVal, get_context) {
    var propName;
    var prop = self;
    if (_.isArray(propChain)) {
        propName = propChain.pop();
        for (var i = 0; i < propChain.length; i++) {
            if (typeof prop[propChain[i]] !== 'object') {
                return defVal;
            }
            prop = prop[propChain[i]];
        }
    } else {
        propName = propChain;
    }
    if (prop !== null) {
        var propType = typeof prop[propName];
        if (propType !== 'undefined') {
            if (propType === 'function' && typeof get_context !== 'undefined') {
                /**
                 * Javascript cannot .apply() to bound function without implicitly specifying context,
                 * thus next code is commented out:
                 */
                // return _.bind(prop[propName], prop);
                return function() { return {'context': prop, 'fn': prop[propName]} };
            }
            return prop[propName];
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
    var propChain = args.shift().split(/\./);
    var propVal = App.propGet(this, propChain, null, true);
    if (typeof propVal === 'function') {
        var prop = propVal();
        return prop.fn.apply(prop.context, args);
    } else {
        return propVal;
    }
};

App.documentReadyHooks = [];

$(document)
.ready(function() {
    var m = moment();
    Cookies.set('local_tz', parseInt(m.zone() / 60));
    App.initClient(document);
    App.initTabPane();
    $(window).on('hashchange', function() {
        $(document).highlightListUrl(window.location);
    });
    if (typeof App.clientData === 'undefined') {
        console.log('@note: client_data middleware is disabled at server side.')
    } else if (typeof App.clientData.onloadViewModels !== 'undefined') {
        // Execute server-side injected initial viewmodels, if any.
        App.viewResponse(App.clientData.onloadViewModels);
    }
    for (var i = 0; i < App.documentReadyHooks.length; i++) {
        App.documentReadyHooks[i]();
    }
})
.on('formset:added', function(event, $row, formsetName) {
    App.initClient($row);
});

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
        var realElement = ko.from_virtual(element);
        ...
    }
 */
ko.from_virtual = function(element) {
    var realElement = ko.virtualElements.firstChild(element);
    while (realElement !== null && realElement.nodeType !== 1) {
        realElement = ko.virtualElements.nextSibling(realElement);
    }
    return realElement;
};

/**
 * Subscribe / unsubscribe observables for Knockout.js easily.
 * Binds subscriptions to instanse method with prefix 'on*' by default.
 */
ko.switchSubscription = function(self, propName, turnOn, method) {
    if (typeof self.koSubscriptions === 'undefined') {
        self.koSubscriptions = {};
    }
    if (typeof method === 'undefined') {
        method = 'on' + $.capitalize(propName);
    }
    if (typeof self[propName] !== 'function') {
        throw sprintf("%s is not observable", propName);
    }
    if (typeof self[method] !== 'function') {
        throw sprintf("%s is not callable", method);
    }
    if (typeof turnOn === 'undefined' || turnOn) {
        if (typeof self.koSubscriptions[propName] === 'undefined') {
            self.koSubscriptions[propName] = self[propName].subscribe(_.bind(self[method], self));
        } else {
            console.log(sprintf('warning: %s is already subscribed', propName));
        }
    } else {
        if (typeof self.koSubscriptions[propName] !== 'undefined') {
            self.koSubscriptions[propName].dispose();
            delete self.koSubscriptions[propName];
        } else {
            console.log(sprintf('warning: %s is already disposed', propName));
        }
    }
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


App.propByPath = function(path) {
    var pathArr = path.split(/\./g);
    var obj = window;
    for (var i = 0; i < pathArr.length - 1; i++) {
        if (typeof obj[pathArr[i]] !== 'object') {
            throw sprintf('Skipping unknown property path: %s', path);
        }
        obj = obj[pathArr[i]];
    }
    obj = obj[pathArr[i]];
    return obj;
};

App.getClassFromPath = function(classPath) {
    var cls = App.propByPath(classPath);
    if (typeof cls !== 'function') {
        throw sprintf('Skipping unknown classPath: %s', classPath);
    }
    return cls;
};

// http://stackoverflow.com/questions/1606797/use-of-apply-with-new-operator-is-this-possible
App.newClassFromPath = function(classPath, classPathArgs) {
    var cls = App.getClassFromPath(classPath);
    var self = Object.create(cls.prototype);
    cls.apply(self, classPathArgs);
    return self
};

/**
 * Auto-instantiated Javascript classes bound to selected DOM elements.
 * Primarily used with Knockout.js bindings, although is not limited to.
 * 'data-component-options' html5 attribute is used as an argument of class constructor.
 */
App.Components = function() {
    this.init();
};

(function(Components) {

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
            var cls = App.getClassFromPath(classPath);
            var component = new cls(options);
            return component;
        }
    };

    Components.bind = function(desc, elem) {
        var freeIdx = this.list.indexOf(null);
        if (freeIdx  === -1) {
            freeIdx = this.list.length;
        }
        $(elem).data('componentIdx', freeIdx);
        this.list[freeIdx] = desc;
        return freeIdx;
    };

    Components.add = function(elem, evt) {
        var self = this;
        var desc;
        if (typeof evt === 'undefined') {
            desc = {'component': this.create(elem)};
            if (desc.component !== null) {
                this.bind(desc, elem)
                desc.component.runComponent(elem);
            }
        } else {
            desc = {'event': evt};
            desc.handler = function() {
                try {
                    // Re-use already bound component, if any.
                    var component = self.get(elem);
                    component.runComponent(elem);
                } catch (e) {
                    desc.component = self.create(elem);
                    if (desc.component !== null) {
                        self.bind(desc, elem)
                        desc.component.runComponent(elem);
                    }
                }
            };
            if (desc.component !== null) {
                $(elem).on(desc.event, desc.handler);
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

    Components.unbind = function(elem) {
        var component = this.get(elem);
        var componentIdx = $(elem).data('componentIdx');
        component.removeComponent(elem);
        var desc = this.list[componentIdx];
        if (typeof desc.event !== 'undefined') {
            $(elem).unbind(desc.event, desc.handler);
        }
        this.list[componentIdx] = null;
        $(elem).removeData('componentIdx');
        return desc;
    };

})(App.Components.prototype);

App.components = new App.Components();

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

App.initClientHooks.push({
    init: function($selector) {
        App.bindTemplates($selector);
        $selector.findSelf('[data-toggle="popover"]').popover({container: 'body'});
        $selector.findSelf('[data-toggle="tooltip"]').tooltip();
        $selector.highlightListUrl(window.location);
        App.SelectMultipleAutoSize($selector);
        new App.DatetimeWidget($selector).init();
        new App.AjaxForm($selector).init();
        new App.AjaxButton($selector).init();
        new App.DialogButton($selector).init();
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
        new App.DialogButton($selector).destroy();
        new App.AjaxButton($selector).destroy();
        new App.AjaxForm($selector).destroy();
        new App.DatetimeWidget($selector).destroy();
        $selector.findSelf('[data-toggle="popover"]').popover('destroy');
    }
});

/**
 * Automatic App.ko class instantiation by 'component' css class.
 *
 */
App.initClientHooks.push(function($selector) {
    _.each($selector.findSelf('.component'), function(v) {
        if ($(v).hasClass('component')) {
            var evt = $(v).data('event');
            App.components.add(v, evt);
        }
    });
});
