'use strict';

ko.bindingHandlers.anonymous_template = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var $textarea = $(element)
        .parents(valueAccessor()['base-selector'])
        .find('.ko-template')
        .eq(valueAccessor()['template-index']);
        $(element).append($textarea.val());
        var cm = new App.ComponentManager({'elem': element});
        cm.detachNestedComponents();
        $(element).data({'componentManager': cm});
    }
};

App.ko.Formset = function($formsTotalCount, serversideFormsCount, maxFormsCount) {
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
        var result = typeof this.maxFormsCount === 'undefined' ||
            this.getTotalFormsCount() < this.maxFormsCount;
        return result;
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
        var $rootNode = $elements.filter('*').eq(0);
        var cm = $rootNode.data('componentManager');
        if (cm) {
            cm.reattachNestedComponents();
        }
        $rootNode.removeData('componentManager');
        App.initClient($elements);
        $rootNode.findRunningComponents().each(function() {
            var gridWidget = $(this).component();
            if (typeof gridWidget.formsetIndex === 'function') {
                gridWidget.formsetIndex(self.getTotalFormsCount() - 1);
            }
        });
        self.deleteFormHandler($elements);
    }
};

void function(Formset) {

    Formset.getTotalFormsCount = function() {
        return this.serversideFormsCount + this.forms().length;
    };

    Formset.deleteFormHandler = function($elements) {
        var self = this;
        var formModelName = App.ui.getCardTitle($elements).html();
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
                        // Update DOM node for forms total count.
                        self.$formsTotalCount.val(self.getTotalFormsCount());
                    } else {
                        $input.prop('checked', false);
                        $elements.removeClass('alert alert-danger');
                    }
                }
            }).confirm();
        });
    };

    Formset.destroy = function($formset) {
        $formset.findSelf('input[name$="-DELETE"]').unbind('change');
        ko.cleanNode($formset.get(0));
    };

}(App.ko.Formset.prototype);

App.initClientHooks.add({
    init: function($selector) {
        $selector.findSelf('.formset').each(function(k, v) {
            var $formset = $(v);
            // Do not bind to display-only formsets.
            if ($formset.parent('.formsets.display-only').length == 0) {
                var $formsTotalCount;
                var serversideFormsCount;
                var maxFormsCount;
                $formset.find('.management-form :input').each(function(k, v) {
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
                var koFormset = new App.ko.Formset(
                    $formsTotalCount,
                    serversideFormsCount,
                    maxFormsCount
                );
                $formset.addInstance('App.ko.Formset', koFormset);
                /**
                 * Prevent nested components, embedded in formset.empty_form to be incorrectly bound to App.ko.Formset
                 * instance.
                 * todo: rewrite App.ko.Formset as component.
                 */
                var cm = new App.ComponentManager({'elem': v});
                cm.detachNestedComponents();
                ko.applyBindings(koFormset, v);
                cm.reattachNestedComponents();
            }
        });
    },
    dispose: function($selector) {
        $selector.findSelf('.formset').each(function(k, v) {
            var $formset = $(v);
            // Do not bind to display-only formsets.
            if ($formset.parent('.formsets.display-only').length == 0) {
                var koFormset = $formset.popInstance('App.ko.Formset');
                koFormset.destroy($formset);
            }
        });
    }
});

App.initClientHooks.add(function($selector) {
    // Do not display delete input for required forms.
    var $requiredFormsDeleteFields = $selector.findSelf('.formset-form-wrap.form-required input[name$="-DELETE"]');
    $requiredFormsDeleteFields.parents('.field').empty().html(App.trans('Required'));
    // Display different label for optional previously saved forms loaded at server-side.
    var $optionalFormsDeleteFields = $selector.findSelf('.formset-form-wrap.form-optional input[name$="-DELETE"]');
    $optionalFormsDeleteFields.next('span').html(App.trans('Delete when saved'));
});
