import { default as axios } from './lib/axios.js';
import { create as laddaCreate } from './lib/ladda.js';

import { showAjaxError } from './errors.js';
import { Trans } from './translate.js';
import { disableInput, enableInput, disableInputs, enableInputs, clearInputs, Ladder } from './inputs.js';
import { AppConf } from './conf.js';
import { DataUrl } from './url.js';
import { vmRouter } from './ioc.js';

function AjaxButton($selector) {

    this.create($selector);

} void function(AjaxButton) {

    AjaxButton.create = function($selector) {
        this.$ajaxButtons = $selector.findSelf('a[data-route], a[data-url], ' +
            'button[data-route][type!="submit"], button[data-url][type!="submit"]');
    };

    // @call static
    AjaxButton.onClick = function(ev) {
        var $target = $(ev.target);
        disableInput($target);
        var l = laddaCreate($target.get(0));
        l.start();
        var url = DataUrl($target);
        if (url === undefined) {
            throw new Error("Please define data-url or data-route attribute on the selected element.");
        }
        $.post(url,
            {
                csrfmiddlewaretoken: AppConf('csrfToken')
            },
            function(response) {
                vmRouter.respond(response);
            },
            'json'
        )
        .always(function() {
            l.remove();
            enableInput($target);
        })
        .fail(showAjaxError);
        return false;
    };

    AjaxButton.init = function() {
        this.$ajaxButtons.on('click', AjaxButton.onClick);
    };

    AjaxButton.destroy = function() {
        this.$ajaxButtons.off('click', AjaxButton.onClick);
    };

}(AjaxButton.prototype);


/**
 * Set of ajax forms.
 * Please use form[data-route] attribute.
 * Do not define form[action], otherwise the form may be submitted twice.
 */
function AjaxForms($selector) {

    this.create($selector);

} void function(AjaxForms) {

    AjaxForms.formSelector = 'form.ajax-form';
    AjaxForms.submitSelector = 'button[type="submit"], input[type="submit"], input[type="image"]';
    AjaxForms.formSubmitSelector = AjaxForms.formSelector + ', ' + AjaxForms.submitSelector;

    AjaxForms.create = function($selector) {
        this.$forms = $selector.findSelf(this.formSelector);
        this.$cancelButtons = this.$forms.find('.btn-cancel-compose');
        this.$submitButtons = this.$forms.find(this.submitSelector);
    };

    // @call static
    AjaxForms.onCancelButtonClick = function(ev) {
        var $form = $(ev.target).closest('form');
        new AjaxForm($form).clearInputs();
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
        new AjaxForm($form).submit($btn);
    };

    AjaxForms.init = function() {
        this.$cancelButtons.on('click', AjaxForms.onCancelButtonClick);
        // Do not use ajaxForm plugin submit event, otherwise form will be double-POSTed.
        this.$submitButtons.on('click', AjaxForms.onSubmitButtonClick);
        return this;
    };

    AjaxForms.destroy = function() {
        this.$submitButtons.off('click', AjaxForms.onSubmitButtonClick);
        this.$cancelButtons.off('click', AjaxForms.onCancelButtonClick);
    };

}(AjaxForms.prototype);

/**
 * Single instance of submitted ajax form.
 */
function AjaxForm($form) {

    this.init($form);

} void function(AjaxForm) {

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
                    if (file.size > AppConf('fileMaxSize')) {
                        var message = Trans('Too big file size=%s, max_size=%s', file.size, maxSize);
                        if (typeof $formFiles[i].id === 'string') {
                            vmRouter.showView({
                                'view': 'form_error',
                                'id': $formFiles[i].id,
                                'messages': [message]
                            });
                        } else {
                            import('./dialog.js').then(function(module) {
                                new module.Dialog({
                                    'title': file.name,
                                    message,
                                    'type': BootstrapDialog.TYPE_DANGER,
                                }).alert();
                            });
                        }
                        return false;
                    }
                }
            }
        }
        return true;
    };

    AjaxForm.beforeSubmit = function() {
        disableInputs(this.$form);
        if (this.$form.has(this.$btn).length === 0) {
            disableInput(this.$btn);
        }
    };

    AjaxForm.always = function() {
        this.hasAlways = true;
        enableInputs(this.$form);
        if (this.$form.has(this.$btn).length === 0) {
            enableInput(this.$btn);
        }
        // the order of calling is important - Ladda should be removed only after the inputs are enabled.
        this.ladder.remove();
        if (this.$progressBar !== null) {
            this.$progressBar.remove();
        }
        this._callbacks.always();
    };

    AjaxForm.getUrl = function() {
        var url = DataUrl(this.$btn);
        if (url === undefined) {
            url = DataUrl(this.$form);
        }
        if (url === undefined) {
            throw new Error("Please define data-url or data-route attribute on form or on form submit button.");
        }
        return url;
    };

    AjaxForm.getOptions = function() {
        var self = this;
        var options = {
            headers: {
                // https://github.com/axios/axios/issues/1322#issuecomment-526580627
                // 'HTTP_X_REQUESTED_WITH': 'XMLHttpRequest',
                'Content-Type': 'multipart/form-data',
                'Accept': 'application/json, text/javascript',
            },
        };
        if (this.$progressBar !== null) {
            options.onUploadProgress = function (progressEvent) {
                var percentComplete = (progressEvent.loaded / progressEvent.total) * 100;
                self.$progressBar.find('.progress-bar').css('width', percentComplete + '%');
            }
        }
        return options;
    };

    AjaxForm.setupProgressBar = function() {
        var self = this;
        this.$progressBar = null;
        if (this.$form.find('input[type="file"]').length > 0) {
            this.$progressBar = $.contents(
                '<div class="default-padding">' +
                '<div class="progress active">' +
                '<div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: 0%;"></div>' +
                '</div>' +
                '</div>'
            );
            this.$progressBar.insertAfter(this.$btn);
        }
    };

    AjaxForm.submit = function($btn, callbacks) {
        var self = this;
        this.$btn = $btn;
        if (typeof AppConf('fileMaxSize') !== 'undefined' && !this.checkFiles(AppConf('fileMaxSize'))) {
            return;
        }
        if (typeof callbacks !== 'object') {
            callbacks = {};
        }
        this._callbacks = $.extend({
                always: function () {},
                error: function (request, exception) {},
                success: function (response) { return true; },
            },
            callbacks
        );
        this.setupProgressBar();
        this.ladder = new Ladder(this.$btn);
        this.hasAlways = false;
        var formData = new FormData(this.$form.get(0));
        this.beforeSubmit();
        axios.post(
            this.getUrl(),
            formData,
            this.getOptions()
        ).then(function (axiosResponse) {
            self.always();
            self.hasAlways = true;
            if (self._callbacks.success(axiosResponse.data)) {
                /**
                 * Set current AjaxForm bindContext for response viewmodel handler,
                 * to read this.$form in the handler body.
                 */
                vmRouter.respond(axiosResponse.data, {context: self});
            }
        }).catch(function (axiosError) {
            if (!self.hasAlways) {
                self.always();
            }
            if (typeof axiosError.request !== 'undefined') {
                showAjaxError(axiosError.request, axiosError.message);
                self._callbacks.error(axiosError.request, axiosError.message);
            } else {
                // Most probably an vmRouter error:
                console.log(axiosError);
            }
        });
        return false;
    };

}(AjaxForm.prototype);

export { AjaxButton, AjaxForms, AjaxForm };
