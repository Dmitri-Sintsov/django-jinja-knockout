import { showAjaxError } from './errors.js';
import { Trans } from './translate.js';
import { disableInput, enableInput, disableInputs, enableInputs, clearInputs, Ladder } from './inputs.js';
import { AppConf } from './conf.js';
import { Dialog } from './dialog.js';
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
        var l = Ladda.create($target.get(0));
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
                            new Dialog({
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
        disableInputs(this.$form);
        if (this.$form.has(this.$btn).length === 0) {
            disableInput(this.$btn);
        }
    };

    AjaxForm.always = function() {
        enableInputs(this.$form);
        if (this.$form.has(this.$btn).length === 0) {
            enableInput(this.$btn);
        }
        if (typeof this.options['uploadProgress'] !== 'undefined') {
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
        return {
            'url': this.getUrl(),
            type: 'post',
            dataType: 'json',
            beforeSubmit: function() {
                self.beforeSubmit();
            },
            error: function(jqXHR, exception) {
                self.always();
                showAjaxError(jqXHR, exception);
                self._callbacks.error(jqXHR, exception);
            },
            success: function(response) {
                self.always();
                if (self._callbacks.success(response)) {
                    /**
                     * Set current AjaxForm bindContext for response viewmodel handler,
                     * to read this.$form in the handler body.
                     */
                    vmRouter.respond(response, {context: self});
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
                '<div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: 0%;"></div>' +
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
        if (typeof AppConf('fileMaxSize') !== 'undefined' && !this.checkFiles(AppConf('fileMaxSize'))) {
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
        this.ladder = new Ladder(this.$btn);
        this.$form.ajaxSubmit(this.options);
        var jqXHR = this.$form.data('jqxhr');
        jqXHR.setRequestHeader('X_REQUESTED_WITH', 'XMLHttpRequest');
        return false;
    };

}(AjaxForm.prototype);

export { AjaxButton, AjaxForms, AjaxForm };
