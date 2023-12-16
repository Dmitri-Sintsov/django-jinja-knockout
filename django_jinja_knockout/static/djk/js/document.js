import moment from './lib/moment.js';
import { sprintf } from './lib/sprintf-esm.js';
import Cookies from './lib/js.cookie.js';

/**
 * Note: datetime.js is not the part of django-jinja-knockout.
 * It should be created in project static directory, so the Moment.js locales can be customized.
 * See djk-sample datetime.js for example:
 * https://github.com/Dmitri-Sintsov/djk-sample/blob/master/djk_sample/static/djk/js/datetime.js
 */
import './datetime.js';
import './lib/bootstrap-datetimepicker.min.js';

import { inherit } from './dash.js';
import { AppClientData } from './conf.js';
import { localize } from './translate.js';
import { initClient, initClientHooks } from './initclient.js';
import { elements } from './elements.js';
import { ComponentManager, components } from './components.js';
import { transformTags, UiPopover, UiTooltip, UiDatetimeWidget } from './ui.js';
import { bindTemplates } from './tpl.js';
import { vmRouter } from './ioc.js';
import { ContentPopover } from './popover.js';
import { SelectMultipleAutoSize } from './inputs.js';
import { initTabPane } from './tabpane.js';
import { useTooltips } from './tooltips.js';
import { useFormsets } from './formsets.js';
import { useKo } from './ko.js';
import { highlightListUrl } from './navs.js';
import { AjaxButton, AjaxForms } from './ajaxform.js';

// Requires plugins.js to be loaded before.

// bootstrap-datetimepicker compatibility.
window.moment = moment;

if (typeof console !== 'object') {
    console = {
        log: function() {}
    };
}

if (typeof console.dir !== 'function') {
    console.dir = function(s) { console.log(s) };
}

elements.newCustomElements(
    {
        name: 'tab-list',
        defaultAttrs: {
            'data-component-class': 'TabList',
        }
    },
    {
        name: 'list-range-filter',
        defaultAttrs: {
            'data-component-class': 'ListRangeFilter',
        }
    },
    {
        name: 'ko-grid',
        defaultAttrs: {
            'data-component-class': 'Grid',
            'data-template-id': 'ko_grid_body',
        }
    },
    {
        name: 'fk-grid-widget',
        defaultAttrs: {
            'data-component-class': 'FkGridWidget',
            'data-template-id': 'ko_fk_grid_widget',
        }
    }
);


function DatetimeWidget($selector) {

    inherit(UiDatetimeWidget.prototype, this);
    this.create($selector);

} void function(DatetimeWidget) {

    // Override moment.js Django-incompatible locales formatting used by bootstrap datetimepicker.
    // Locale 'ru' moment.js is compatible to Django thus does not require override, for example.
    DatetimeWidget.formatFixes = {
        'en-us': {
            'date': 'YYYY-MM-DD',
            'datetime': 'YYYY-MM-DD HH:mm:ss'
        }
    };

    DatetimeWidget.create = function($selector) {
        this.$selector = $selector;
    };

    DatetimeWidget.has = function() {
        if (typeof $.fn.datetimepicker === 'undefined') {
            console.log("@note: bootstrap.datetimepicker is disabled.");
            return false;
        }
        // Field wrapper with icon.
        this.$dateControls = this.$selector.find('.date-control, .datetime-control');
        return this.$dateControls.length > 0;
    };

    // @static method
    DatetimeWidget.open = function(ev) {
        var $target = $(ev.target);
        $target.closest('.input-group-append')
        .prev('.date-control, .datetime-control')
        .trigger('click');
    };

}(DatetimeWidget.prototype);


initClientHooks.add({
    init: function($selector) {
        transformTags.apply($selector);
        bindTemplates($selector);
        localize($selector);
        $selector.findSelf('[bs-toggle="popover"]').each(ContentPopover);
        $selector.findSelf('[bs-toggle="tooltip"]').each(function() {
            new UiTooltip(this).create({html: false});
        });
        $selector.dataHref();
        highlightListUrl($selector);
        SelectMultipleAutoSize($selector);
        new DatetimeWidget($selector).init();
        new AjaxForms($selector).init();
        new AjaxButton($selector).init();
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
        new AjaxButton($selector).destroy();
        new AjaxForms($selector).destroy();
        new DatetimeWidget($selector).destroy();
        $selector.findSelf('[bs-toggle="popover"]').each(function() {
            new UiPopover(this).dispose();
        });
        $selector.findSelf('[bs-toggle="tooltip"]').each(function() {
            new UiTooltip(this).dispose();
        });
    }
});

/**
 * Automatic class instantiation by 'component' css class.
 * Mostly is used to instantinate Dialog / Grid classes, but is not limited to.
 *
 */
initClientHooks.add({
    init: function($selector) {
        $selector.findAttachedComponents().each(function() {
            var evt = $(this).data('event');
            components.add(this, evt);
        });
    },
    dispose: function($selector) {
        $selector.findRunningComponents().each(function() {
            var cm = new ComponentManager({'elem': this});
            var $componentSelector = cm.getSelector();
            // Note: sparse components can potentially unbind the DOM subtrees outside of dispose $selector.
            components.unbind($componentSelector);
        });
    },
    // Please do not add new hooks with higher or equal weight, as the components has to be initialized at the last time.
    weight: 9999,
});

/**
 * Warning: does not parse the querystring, so the same script still could be included via the different querystring.
 */
function assertUniqueScripts() {
    var scripts = {};
    $(document).find('script[src]').each(function(k, v) {
        var src = $(v).prop('src');
        if (typeof scripts[src] !== 'undefined') {
            throw new Error(
                sprintf('Multiple inclusion of the same script: "%s"', src)
            );
        } else {
            scripts[src] = true;
        }
    });
}

var documentReadyHooks = [function() {
    assertUniqueScripts();
    var m = moment();
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite
    Cookies.set('local_tz', parseInt(-m.utcOffset() / 60), {sameSite: 'Lax'});
    initClient(document);
    initTabPane();
    $(window).on('hashchange', function() {
        highlightListUrl($(document));
    });
    var onloadViewModels = AppClientData('onloadViewModels');
    if (typeof onloadViewModels !== 'undefined') {
        // Execute server-side injected initial viewmodels, if any.
        vmRouter.respond(onloadViewModels);
    }
}];

function startApp($selector) {
    if (!startApp.isInitialized) {
        startApp.isInitialized = true;
        if ($selector === undefined) {
            $selector = $(document);
        }
        $(document).ready(function() {
            for (var i = 0; i < documentReadyHooks.length; i++) {
                documentReadyHooks[i]();
            }
        })
        .on('formset:added', function(event, $row, formsetName) {
            initClient($row);
        });
    } else {
        console.log('startApp() should run only once.');
    }
}

startApp.isInitialized = false;

// Required to display form errors:
useTooltips();

// Required for ForeignKeyGridWidget to work:
useFormsets(ko);

// Required for ko utils / custom bindings to work:
useKo(ko);

export { documentReadyHooks, startApp };
