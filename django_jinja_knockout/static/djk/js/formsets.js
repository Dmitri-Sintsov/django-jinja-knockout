'use strict';

App.vue.Formset = function(serversideFormsCount, maxFormsCount) {
    var self = this;
    var formArray = [];
    /*
    // Fill out all optional forms.
    var clientsideFormsCount = maxFormsCount - serversideFormsCount;
    for (var i = 0; i < clientsideFormsCount; i++) {
        formArray[i] = i;
    }
    */
    this.vm = new Vue({
        data: {
            ctrl: this,
            forms: formArray,
            formsTotalCount: serversideFormsCount,
        },
        computed: {
            hasMoreForms: function() {
                return this.ctrl.getTotalFormsCount() < this.ctrl.maxFormsCount;
            }
        },
        methods: {
            getFormIndex: function(form_idx) {
                return form_idx + this.ctrl.serversideFormsCount;
            },
            addForm: function(event) {
                this.ctrl.addForm();
                event.preventDefault();
            },
            deleteForm: function(event, form_idx) {
                this.ctrl.deleteForm($(event.target), form_idx);
            },
        },
        mounted: function() {
            this.$nextTick(
                function() {
                    var $formset = $(this.$el).parents('.formset:first');
                    if ($formset.getInstance('App.vue.Formset') === undefined) {
                        $formset.addInstance('App.vue.Formset', this.ctrl);
                    }
                    App.initClient(this.$el);
                }
            )
        },
        beforeDestroy: function() {
            var $formset = $(this.$el).parents('.formset:first');
            var vueFormset = $formset.popInstance('App.vue.Formset');
            if (vueFormset !== undefined) {
                vueFormset.destroy();
            }
            App.initClient(this.$el, 'dispose');
        },
    });
    this.serversideFormsCount = serversideFormsCount;
    this.maxFormsCount = maxFormsCount;
};

void function(Formset) {

    Formset.getTotalFormsCount = function() {
        return this.serversideFormsCount + this.vm.forms.length;
    };

    Formset.addForm = function() {
        if (this.vm.hasMoreForms) {
            // Add new form Vue component.
            // Value does not matter because Vue template uses v-for index.
            this.vm.forms.push($.randomHash());
            // Update DOM node for forms total count, otherwise Django will not create extra model forms.
            this.vm.formsTotalCount = this.getTotalFormsCount();
        }
    };

    Formset.deleteForm = function($target, form_idx) {
        var self = this;
        var $panel = $target.parents('.panel:first');
        var formModelName = $panel.find('.panel-title:first').html();
        $panel.addClass('alert alert-danger');
        new App.Dialog({
            'title': App.trans('Delete "%s"', formModelName),
            'message': App.trans('Are you sure you want to delete "%s" ?', formModelName),
            'callback': function(result) {
                if (result) {
                    self.vm.forms.splice(form_idx, 1);
                    // Update DOM node for forms total count.
                    self.vm.formsTotalCount = self.getTotalFormsCount();
                } else {
                    $target.prop('checked', false);
                    $panel.removeClass('alert alert-danger');
                }
            }
        }).confirm();
    };

    Formset.destroy = function() {
        /**
         * Will be called automatically after .beforeDestroy.
         */
        // this.vm.$destroy();
    };

}(App.vue.Formset.prototype);

App.initClientHooks.push(
    function($selector) {
        $selector.findSelf('.vue-empty-form').each(function(k, v) {
            var scriptId = $(v).prop('id');
            if (scriptId.indexOf('empty-form-') === 0 &&
                    (typeof Vue.options.components[scriptId] === 'undefined')) {
                Vue.component(scriptId, {
                    template: '#' + scriptId,
                    props: ['form_idx'],
                    mounted: function() {
                        this.$nextTick(
                            function() {
                                App.initClient(this.$el);
                            }
                        )
                    },
                    beforeDestroy: function() {
                        App.initClient(this.$el, 'dispose');
                    },
                });
            }
        });
    }
);

App.initClientHooks.push({
    init: function($selector) {
        // https://github.com/vuejs/vue/issues/3587
        App.initClient($selector, 'unprotect');
        $selector.find('.formset').each(function(k, v) {
            var $formset = $(v);
            // Do not bind to display-only formsets.
            if ($formset.parent('.formsets.display-only').length == 0) {
                var serversideFormsCount;
                var maxFormsCount;
                $formset.find('.management-form :input').each(function(k, v) {
                    var $input = $(v);
                    if ($input.prop('id').match(/TOTAL_FORMS$/)) {
                        $input.attr({'v-bind:value': 'formsTotalCount'});
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
                var vueFormset = new App.vue.Formset(
                    serversideFormsCount,
                    maxFormsCount
                );
                vueFormset.vm.$mount(v);
            } else {
                App.initClient($formset, 'unprotect');
                App.initClient($formset);
            }
        });
    },
    dispose: function($selector) {
        $selector.findSelf('.formset').each(function(k, v) {
            var $formset = $(v);
            // Do not bind to display-only formsets.
            if ($formset.parent('.formsets.display-only').length == 0) {
                var vueFormset = $formset.popInstance('App.vue.Formset');
                if (vueFormset !== undefined) {
                    vueFormset.destroy();
                }
            }
        });
    }
});

App.initClientHooks.push(function($selector) {
    // Do not display delete input for required forms.
    var $requiredFormsDeleteFields = $selector.findSelf('.formset-form-wrap.form-required input[name$="-DELETE"]');
    $requiredFormsDeleteFields.parents('.field').empty().html(App.trans('Required'));
    // Display different label for optional previously saved forms loaded at server-side.
    var $optionalFormsDeleteFields = $selector.findSelf('.formset-form-wrap.form-optional input[name$="-DELETE"]');
    $optionalFormsDeleteFields.next('span').html(App.trans('Delete when saved'));
});
