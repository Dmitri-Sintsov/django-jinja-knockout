import { Trans } from  './translate.js';
import { initClient, initClientApply, initClientMark } from './initclient.js';
import { ViewModelRouter } from './vmrouter.js';
import { NestedList } from './nestedlist.js';
import { Tpl } from './tpl.js';
import { TabList } from './tabpane.js';
import { Dialog } from './dialog.js';

import { ListRangeFilter } from './filters.js';
import { AjaxForms } from './ajaxform.js';
import { EditForm, EditInline } from './modelform.js';

import { GridDialog } from './grid/dialogs.js';
import { FkGridWidget } from './grid/widget.js';
import { KoGridAction, GridRowsPerPageAction } from './grid/actions.ko.js';

// todo: dynamic import for new classes.
var globalIoc = new ViewModelRouter({
    'Dialog.baseOnShow' : function() {
        // Close opened popovers otherwise they may overlap opened dialog.
        $(document.body).closeVisiblePopovers();
        // Ensure dialog size is set.
        this.bdialog.setSize(this.dialogOptions.size);
    },
    'Tpl': function(options) {
        return new Tpl(options);
    },
    'NestedList': function(options) {
        return new NestedList(options);
    },
    'Dialog': function(options) {
        return new Dialog(options);
    },
    'TabList': function(options) {
        return new TabList(options);
    },
    'ListRangeFilter': function(options) {
        return new ListRangeFilter(options);
    },
    'EditForm': function(options) {
        return new EditForm(options);
    },
    'EditInline': function(options) {
        return new EditInline(options);
    },
    'Grid': function(options) {
        return import('./grid.js').then(function(module) {
            return new module.Grid(options);
        });
    },
    'GridDialog': function(options) {
        return new GridDialog(options);
    },
    'FkGridWidget': function(options) {
        return new FkGridWidget(options);
    },
    'KoGridAction': function(options) {
        return new KoGridAction(options);
    },
    'GridRowsPerPageAction': function(options) {
        return new GridRowsPerPageAction(options);
    },
});

var vmRouter = new ViewModelRouter({
    'redirect_to' : function(viewModel) {
        var href = viewModel.url;
        var hash = href.match('(#.*)$');
        if (hash !== null) {
            hash = hash.pop();
        }
        if (hash != window.location.hash) {
            // Hash changes are not refreshed automatically by default.
            $(window).on('hashchange', function() {
                window.location.reload(true);
            });
        }
        if (typeof viewModel.query !== 'undefined') {
            href += '?' + $.param(viewModel.query);
        }
        if (window.location.href.indexOf(href) === window.location.href.length - href.length) {
            window.location.reload(true);
        } else {
            window.location.href = href;
        }
    },
    'post': function(viewModel) {
        DjangoPost(viewModel.route, viewModel.data, viewModel.options);
    },
    'alert' : function(viewModel) {
        new Dialog(viewModel).alert();
    },
    'alert_error' : function(viewModel) {
        if (typeof viewModel.title === 'undefined') {
            viewModel.title = Trans('Error');
        }
        new Dialog(viewModel).alertError();
    },
    'confirm' : function(viewModel) {
        new Dialog(viewModel).confirm();
    },
    'trigger': function(viewModel) {
        $(viewModel.selector).trigger(viewModel.event);
    },
    'append': function(response) {
        var $html = $.contents(response.html);
        initClient($html);
        $(response.selector).append($html);
    },
    'prepend': function(response) {
        var $html = $.contents(response.html);
        initClient($html);
        $(response.selector).prepend($html);
    },
    'after': function(response) {
        var $html = $.contents(response.html);
        initClient($html);
        $(response.selector).after($html);
    },
    'before': function(response) {
        var $html = $.contents(response.html);
        initClient($html);
        $(response.selector).before($html);
    },
    'remove': function(response) {
        var $selector = $(response.selector);
        initClient($selector, 'dispose');
        $selector.remove();
    },
    'text': function(response) {
        var $selector = $.select(response.selector);
        var text = document.createTextNode(response.text);
        $selector.empty().append(text);
    },
    'html': function(response) {
        var $selector = $.select(response.selector);
        initClient($selector.find('*'), 'dispose');
        var $html = $.contents(response.html);
        initClient($html);
        $selector.empty().append($html);
    },
    'replaceWith': function(response) {
        var $selector = $.select(response.selector);
        var $parent = $selector.parent();
        initClientApply($selector, 'dispose');
        $selector.replaceWith(
            initClientMark(response.html)
        );
        initClientApply($parent);
    },
    // Can be used to resubmit the same forms with different urls.
    // Replaces 'data-url' attribute values globally.
    // To replace selectively, implement your own custom handler.
    'replace_data_url': function(response) {
        if (response.fromUrl === response.toUrl) {
            return;
        }
        var $submits = $(AjaxForms.prototype.formSubmitSelector);
        $submits.each(function(k, v) {
            var $submit = $(v);
            if ($submit.data('url') === response.fromUrl || $submit.prop('data-url') === response.fromUrl) {
                $submit.prop('data-url', response.toUrl);
                $submit.data('url', response.toUrl);
            }
        });
    }
});

export { vmRouter, globalIoc };
