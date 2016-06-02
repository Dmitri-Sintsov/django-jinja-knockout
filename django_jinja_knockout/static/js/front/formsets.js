'use strict';

ko.bindingHandlers.anonymous_template = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var $textarea = $(element)
        .parents(valueAccessor()['base-selector'])
        .find('.ko-template')
        .eq(valueAccessor()['template-index']);
        $(element).append($textarea.val());
    }
};

App.ko.formset = function($formsTotalCount, serversideFormsCount, maxFormsCount) {
    var self = this;
    var formArray = [];
    /*
    // Fill out all optional forms.
    clientsideFormsCount = maxFormsCount - serversideFormsCount;
    for (var i = 0; i < clientsideFormsCount; i++) {
        formArray[i] = i;
    }
    */
    this.forms = ko.observableArray(formArray);
    this.$formsTotalCount = $formsTotalCount;
    this.serversideFormsCount = serversideFormsCount;
    this.maxFormsCount = maxFormsCount;
    this.hasMoreForms = ko.pureComputed(function () {
        return typeof this.maxFormsCount === 'undefined' ||
            this.getTotalFormsCount() < this.maxFormsCount;
    }, this);
    this.addForm = function(data, event) {
        var formsCount = this.getTotalFormsCount();
        if (this.hasMoreForms()) {
            // Add new knockout template form.
            // Value does not matter because ko template uses foreach $index().
            this.forms.push($.randomHash());
            // Update DOM node for forms total count, otherwise Django will not create extra model forms.
            this.$formsTotalCount.val(this.getTotalFormsCount());
        }
    };
    this.afterFormRendered = function(elements, data) {
        var $elements = $(elements);
        App.initClient($elements);
        self.deleteFormHandler($elements);
    }
};

(function(ko_formset) {

    ko_formset.getTotalFormsCount = function() {
        return this.serversideFormsCount + this.forms().length;
    };

    ko_formset.deleteFormHandler = function($elements) {
        var self = this;
        var formModelName = $elements.find('.panel-title:first').html();
        // Attach event handler to newly added form delete input.
        $elements.findSelf('input[name$="-DELETE"]')
        .on('change', function(ev) {
            if (!this.checked) {
                return;
            }
            var $input = $(this);
            // Get form index in formset client-side generated form list.
            var match = $input.prop('name').match(/-(\d+)-DELETE/);
            if (match === null) {
                throw "Unable to match form index: " + $formsDeleteFields.prop('name');
            }
            var koFormIndex = parseInt(match.pop()) - self.serversideFormsCount;
            $elements.addClass('alert alert-danger');
            new App.Dialog({
                'title': App.trans('Delete "%s"', formModelName),
                'message': App.trans('Are you sure you want to delete "%s" ?', formModelName),
                'callback': function(result) {
                    if (result) {
                        self.forms.splice(koFormIndex, 1);
                    } else {
                        $input.prop('checked', false);
                        $elements.removeClass('alert alert-danger');
                    }
                }
            }).confirm();
        });
    };

    ko_formset.destroy = function($formset) {
        $formset.findSelf('input[name$="-DELETE"]').unbind('change');
        ko.cleanNode($formset.get(0));
    };

})(App.ko.formset.prototype);

App.initClientHooks.push({
    init: function($selector) {
        $.each($selector.findSelf('.formset'), function(k, v) {
            var $formset = $(v);
            var $formsTotalCount;
            var serversideFormsCount;
            var maxFormsCount;
            $.each($formset.find('.management-form :input'), function(k, v) {
                var $input = $(v);
                if ($input.prop('id').match(/TOTAL_FORMS$/)) {
                    $formsTotalCount = $input;
                    serversideFormsCount = parseInt($input.val());
                }
                if ($input.prop('id').match(/MAX_NUM_FORMS$/)) {
                    maxFormsCount = parseInt($input.val());
                }
            });
            if (typeof serversideFormsCount === 'undefined' ||
                    typeof maxFormsCount === 'undefined') {
                return;
            }
            var ko_formset = new App.ko.formset(
                $formsTotalCount,
                serversideFormsCount,
                maxFormsCount
            );
            $formset.addInstance('App.ko.formset', ko_formset);
            ko.applyBindings(ko_formset, v);
        });
    },
    dispose: function($selector) {
        $.each($selector.findSelf('.formset'), function(k, v) {
            var $formset = $(v);
            var ko_formset = $formset.popInstance('App.ko.formset');
            ko_formset.destroy($formset);
        });
    }
});

App.initClientHooks.push(function($selector) {
    // Do not display delete input for required forms.
    var $requiredFormsDeleteFields = $selector.findSelf('.formset-form-wrap.form-required input[name$="-DELETE"]');
    $requiredFormsDeleteFields.parents('.field').empty().html(App.trans('Required'));
    // Display different label for optional previously saved forms loaded at server-side.
    var $optionalFormsDeleteFields = $selector.findSelf('.formset-form-wrap.form-optional input[name$="-DELETE"]');
    $optionalFormsDeleteFields.next('span').html(App.trans('Delete when saved'))
});
