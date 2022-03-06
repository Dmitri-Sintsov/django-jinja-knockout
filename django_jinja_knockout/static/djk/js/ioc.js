import { Trans } from  './translate.js';
import { initClient, initClientApply, initClientMark } from './initclient.js';
import { ViewModelRouter } from './vmrouter.js';
import { NestedList } from './nestedlist.js';
import { Tpl } from './tpl.js';
import { TabList } from './tabpane.js';

import { AjaxForms } from './ajaxform.js';

var globalIoc = new ViewModelRouter({
    'Tpl': function(options) {
        return new Tpl(options);
    },
    'NestedList': function(options) {
        return new NestedList(options);
    },
});

var componentIoc = new ViewModelRouter({
    'Dialog': function(options) {
        return import('./dialog.js').then(function(module) {
            return new module.Dialog(options);
        });
    },
    'TabList': function(options) {
        return new TabList(options);
    },
    'ListRangeFilter': function(options) {
        return import('./filters.js').then(function(module) {
            return new module.ListRangeFilter(options);
        });
    },
    'EditForm': function(options) {
        return import('./modelform.js').then(function(module) {
            return new module.EditForm(options);
        });
    },
    'EditInline': function(options) {
        return import('./modelform.js').then(function(module) {
            return new module.EditInline(options);
        });
    },
    'Grid': function(options) {
        return import('./grid.js').then(function(module) {
            return new module.Grid(options);
        });
    },
    'GridDialog': function(options) {
        return import('./grid/dialogs.js').then(function(module) {
            return new module.GridDialog(options);
        });
    },
    'FkGridWidget': function(options) {
        return import('./grid/widget.js').then(function(module) {
            return new module.FkGridWidget(options);
        });
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
        return import('./dialog.js').then(function(module) {
            new module.Dialog(viewModel).alert();
        });
    },
    'alert_error' : function(viewModel) {
        if (typeof viewModel.title === 'undefined') {
            viewModel.title = Trans('Error');
        }
        return import('./dialog.js').then(function(module) {
            new module.Dialog(viewModel).alertError();
        });
    },
    'confirm' : function(viewModel) {
        return import('./dialog.js').then(function(module) {
            new module.Dialog(viewModel).confirm();
        });
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

export { vmRouter, globalIoc, componentIoc };
