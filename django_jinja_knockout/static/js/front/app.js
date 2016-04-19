// Requires plugins.js to be loaded before.

if (typeof console !== 'object') {
    console = {
        log: function() {}
    };
}

if (typeof window.App === 'undefined') {
    window.App = {};
};
App = window.App;

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

/**
 * BootstrapDialog wrapper.
 */
App.Dialog = function(options) {
    this.create(options);
};

(function(Dialog) {

    Dialog.create = function(options) {
        var self = this;
        if (typeof options !== 'object') {
            options = {};
        }
        this.dialogOptions = {
            // type: BootstrapDialog.TYPE_PRIMARY,
            type: BootstrapDialog.TYPE_WARNING,
            closable: false,
            draggable: true,
            buttonLabel: App.trans('OK'),
            btnCancelLabel: App.trans('No'),
            btnOKLabel: App.trans('Yes'),
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
            this.dialogOptions.message = $(this.dialogOptions.message);
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
        /* noop */
    };

    Dialog.onShown = function() {
        /* noop */
    };

    Dialog.onHide = function() {
        /* noop */
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
        return (typeof this.dialogOptions.title === 'undefined') ? $('') : this.dialogOptions.title;
    };

    Dialog.recreateTitle = function() {
        this.dialogOptions.title.replaceWith(this.getDialogTitle());
    }

    Dialog.setTitle = function(title) {
        this.dialogOptions.title = title;
        if (typeof this.bdialog !== 'undefined') {
            this.bdialog.setTitle(title);
        }
    };

    Dialog.getTemplateArgs = function() {
        return {};
    };

    Dialog.createDialogContent = function() {
        if (typeof this.dialogOptions.template !== 'undefined') {
            var compiled = App.compileTemplate(this.dialogOptions.template);
            return $(compiled(this.getTemplateArgs()));
        } else {
            return $('sample content');
        }
    };

    Dialog.recreateContent = function() {
        this.dialogOptions.message.replaceWith(this.createDialogContent());
    }

    Dialog.getOptions = function() {
        return {};
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

    Dialog.remove = function() {
        $(this.bdialog).remove();
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
        var hash = href.match('(#.*)$')
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
        $(response.selector).html(response.html);
    },
    'replaceWith': function(response) {
        $(response.selector).replaceWith(response.html);
    }
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

App.executedViewModels = [];

App.viewResponse = function(response, options) {
    if (typeof options !== 'object') {
        options = {};
    }
    bindContext = (typeof options.bindContext ==='undefined') ? this : options.bindContext;
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

App.datetimewidget = function($parent) {
    if (typeof $.fn.datetimepicker === 'undefined') {
        console.log("@note: bootstrap.datetimepicker is disabled.");
        return;
    }
    // Field wrapper with icon.
    var $dateControls = $parent.find('.date-control, .datetime-control')
    if ($dateControls.length === 0) {
        // There is no date / datetime fields in $parent.
        return;
    }
    $dateControls.wrap('<div class="input-group date datetimepicker"></div>')
    $dateControls.after('<span class="input-group-addon"><span class="glyphicon glyphicon-calendar"></span></span>');
    // Date field widget.
    $parent.find('.date-control').datetimepicker({
        pickTime: false,
        language: 'ru',
        icons: {
            date: 'calendar'
        }
    });
    // Datetime field widget.
    $parent.find('.datetime-control').datetimepicker({
        language: 'ru',
        icons: {
            date: 'calendar'
        }
    });
    // Picker window button help.
    $parent.find('.picker-switch').prop('title', App.trans('Choose year / decade.'));
    // Icon clicking.
    $dateControls.next('.input-group-addon').on('click', function(ev) {
        var $target = $(ev.target);
        $target.closest('.input-group-addon')
        .prev('.date-control, .datetime-control')
        .trigger('click');
    });
};

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
        return (typeof App.conf.url[route] === 'undefined') ? undefined : App.conf.url[route];
    }
};

App.ajaxButton = function($selector) {
    $selector.findSelf('a[data-route], a[data-url], ' +
            'button[data-route][type!="submit"], button[data-url][type!="submit"]')
    .on('click', function(ev) {
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
    });
};

// @note:
//     Please use form[data-route] attribute.
//     Do not define form[action], otherwise form may be submitted twice.
App.ajaxForm = function($selector) {
    var submitSelector = 'button[type="submit"], input[type="submit"], input[type="image"]';
    if (typeof $.fn.ajaxForm === 'undefined') {
        console.log('@note: jQuery AJAX form plugin is disabled.');
        return;
    }
    var $form = $selector.findSelf('form.ajax-form');
    $form.find('.btn-cancel-compose').on('click', function(ev) {
        var $form = $(ev.target).closest('form');
        App.clearInputs($form);
    });
    // Do not use ajaxForm plugin submit event, otherwise form will be double-POSTed.
    $form.ajaxForm()
    .find(submitSelector)
    .on('click', function(ev) {
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
        var url = App.getDataUrl($btn);
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
        };
        var options = {
            'url': url,
            type: 'post',
            dataType: 'json',
            beforeSubmit: function() {
                App.destroyTooltipErrors($form);
                App.disableInputs($form);
            },
            error: function(jqXHR, exception) {
                always();
                App.showAjaxError(jqXHR, exception);
            },
            success: function(response) {
                always();
                // Add $form property for custom viewHandler.
                response.$form = $form;
                App.viewResponse(response);
            },
            complete: function() {
                l.remove();
            }
        };
        if ($form.find('input[type="file"]').length > 0) {
            var $progressBar = $('<div class="default-padding"><div class="progress active"><div class="progress-bar progress-bar-striped" style="width: 0%;"></div></div></div>');
            $progressBar.insertAfter($btn);
            options['uploadProgress'] = function(event, position, total, percentComplete) {
                $progressBar.find('.progress-bar').css('width', percentComplete + '%');
            };
        }
        var l = new App.ladder($btn);
        $form.ajaxSubmit(options);
        return false;
    });
};

App.dialogButton = function($selector) {
    $.each($selector.findSelf('.dialog-button'), function(k, v) {
        var dialog = new App.Dialog($(v).data('options'));
        $(v).on('click', function(ev) {
            dialog.show();
        });
    });
};

// Cache for compiled templates.
App.bag._templates = {};

App.compileTemplate = function(tplId) {
    if (typeof App.bag._templates[tplId] === 'undefined') {
        var tpl = document.getElementById(tplId);
        if (tpl === null) {
            throw sprintf("Unknown underscore template id: %s", tplId);
        }
        App.bag._templates[tplId] = _.template(
            $(tpl).html()
        );
    }
    return App.bag._templates[tplId];
};

/**
 * Does not use html5 <template> tag because IE lower than Edge do not support it.
 * Make sure loaded template is properly closed XHTML, otherwise jQuery.html() will fail to load it completely.
 */
App.loadTemplates = function($selector) {
    $.each($selector.findSelf('[data-template-id]'), function(k, v) {
        var tpl = App.compileTemplate(
            $(v).attr('data-template-id')
        );
        var tplArgs = $(v).data('templateArgs');
        if (typeof tplArgs !== 'object') {
            tplArgs = {};
        }
        $(v).html(tpl(tplArgs));
    });
};

App.initClientHooks = [];

// @note: Do not forget to call this method for newly loaded AJAX DOM.
App.initClient = function(selector) {
    var $selector = App.getSelector(selector);
    App.loadTemplates($selector);
    $selector.findSelf('[data-toggle="popover"]').popover({container: 'body'});
    App.SelectMultipleAutoSize($selector);
    App.datetimewidget($selector);
    App.ajaxForm($selector);
    App.ajaxButton($selector);
    App.dialogButton($selector);
    $selector.autogrow('init');
    $selector.optionalInput('init');
    $selector.collapsibleSubmit('init');
    $selector.findSelf('.link-preview').linkPreview();
    for (var i = 0; i < App.initClientHooks.length; i++) {
        App.initClientHooks[i]($selector);
    }
};

App.initClientMark = function(html) {
    return '<span class="init-client-begin"></span>' + html + '<span class="init-client-end"></span>';
};

App.initClientApply = function(selector) {
    var $selector = App.getSelector(selector);
    $.each($selector.findSelf('.init-client-begin'), function(k, v) {
        // @todo: Check out whether removal of span is needed.
        App.initClient($(v).nextUntil('.init-client-end'));
    });
    $selector.findSelf('.init-client-begin').remove();
    $selector.find('.init-client-end').remove();
};

App.routeUrl = function(route) {
    if (typeof App.conf.url[route] === 'undefined') {
        throw sprintf("Undefined route: '%s'", route);
    }
    return App.conf.url[route];
};

App.get = function(route, data, options) {
    return $.get(
        App.routeUrl(route),
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
    data.csrfmiddlewaretoken = App.conf.csrfToken;
    return $.post(
        App.routeUrl(route),
        (typeof data === 'undefined') ? {} : data,
        function(response) {
            App.viewResponse(response, options);
        },
        'json'
    ).fail(App.showAjaxError);
};

/**
 * Usage:
 *   MyClass.prototype.propCall = App.propCall;
 *   ...
 *   this.propCall('prop1.prop2.fn', arg1, .. argn);
 */
App.propCall = function() {
    var args = Array.prototype.slice.call(arguments);
    var propChain = args.shift().split(/\./);
    var propMethod = propChain.pop();
    var prop = this;
    for (var i = 0; i < propChain.length; i++) {
        if (typeof prop[propChain[i]] !== 'object') {
            return null;
        }
        prop = prop[propChain[i]];
    }
    if (prop !== null && typeof prop[propMethod] === 'function') {
        return prop[propMethod].apply(prop, args);
    } else {
        return null;
    }
};

App.documentReadyHooks = [];

$(document)
.ready(function() {
    var m = moment();
    Cookies.set('local_tz', parseInt(m.zone() / 60));
    App.initClient();
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

ko.set_props = function(src, dst) {
    $.each(src, function(k, v) {
        if (typeof dst[k] === 'function') {
            dst[k](v);
        } else {
            dst[k] = v;
        }
    });
};

ko.from_virtual = function(element) {
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
    },
    update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
    },
};

// Usage: <textarea data-bind="autogrow: {rows: 4}"></textarea>
// @note: Currently is unused in script#messaging_dialog, due to dialog / messages vertical overflow issues.
ko.bindingHandlers.autogrow = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        $(element).addClass('autogrow').prop('rows', valueAccessor().rows).autogrow('init');
    }
};

// Usage: <div data-bind="html: text, linkPreview"></div>
ko.bindingHandlers.linkPreview = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        $(element).linkPreview();
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

/**
 * Automatic App.ko class instantiation by 'component' css class and 'data-component-options' html5 attribute.
 *
 */
App.initClientHooks.push(function() {
    $.each($('.component'), function(k, v) {
        var options = $(v).data('componentOptions');
        if (typeof options !== 'object') {
            console.log('Skipping .component with unset data-component-options');
            return;
        }
        if (typeof options.class === 'undefined') {
            throw 'Undefined data-component-options class.';
        }
        var componentClass = options.class;
        delete options.class;
        if (typeof App.ko[componentClass] !== 'function') {
            throw sprintf('Skipping unknown component: App.ko.%s', componentClass);
        }
        var component = new App.ko[componentClass](options);
        component.run(v);
    });
});
