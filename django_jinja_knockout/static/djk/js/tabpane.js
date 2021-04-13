import { propGet } from './prop.js';
import { initClient } from './initclient.js';
import { globalIoc } from './ioc.js';
import { AppPost } from './url.js';

/**
 * Bootstrap tabs management class.
 */
function TabPaneManager(hash) {

    if (hash === undefined) {
        hash = window.location.hash;
    }
    this.cleanHash = hash.split(/^#/g).pop();
    this.targetElement = $.id(this.cleanHash);
    if (this.targetElement.length > 0) {
        this.pane = this.targetElement.closest('div.tab-pane');
        if (this.pane.length > 0 && this.cleanHash === this.pane.attr('id')) {
            this.anchor = $('a[href="#' + this.pane.attr('id') + '"]');
            this.tab = this.anchor.parents('li[role="presentation"]:first');
        }
    }

} void function(TabPaneManager) {

    TabPaneManager.exists = function() {
        return propGet(this, 'anchor.length', 0) > 0;
    };

    TabPaneManager.isActive = function() {
        return this.exists() && this.tab.hasClass('active');
    };

    TabPaneManager.setLocation = function() {
        if (this.exists()) {
            window.location.hash = '#' + this.cleanHash;
        }
        return this;
    };

    TabPaneManager.loadTemplate = function() {
        if (this.exists()) {
            var tabTemplate = this.tab.data('tabTemplate');
            if (tabTemplate !== undefined) {
                var templateHolder = this.pane.find('.template-holder');
                if (templateHolder.length > 0) {
                    var tpl = globalIoc.factory('Tpl').domTemplate(tabTemplate);
                    templateHolder.replaceWith(tpl);
                    initClient(this.pane);
                }
            }
        }
    };

    TabPaneManager.switchTo = function() {
        if (this.exists()) {
            this.loadTemplate();
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

    TabPaneManager.hide = function() {
        if (this.exists()) {
            this.tab.addClass('hidden');
            this.pane.addClass('hidden');
        }
        return this;
    };

    TabPaneManager.show = function() {
        if (this.exists()) {
            this.pane.removeClass('hidden');
            this.tab.removeClass('hidden');
        }
        return this;
    };

    TabPaneManager.highlight = function(bgClass, permanent) {
        if (this.exists()) {
            if (typeof bgClass !== 'string') {
                bgClass = 'bg-success';
            }
            this.tab.addClass(bgClass);
            if (permanent !== true) {
                this.tab.data('highlightClass', bgClass);
            }
        }
        return this;
    };

    TabPaneManager.load = function(route, data, options) {
        if (this.exists()) {
            data.clean_hash = this.cleanHash;
            AppPost(route, data, options);
        }
        return this;
    };

}(TabPaneManager.prototype);

function TabPane(hash) {
    return new TabPaneManager(hash);
}

function TabList(options) {

} void function(TabList) {

    TabList.onClickTab = function() {
        var href = $(this).attr('href');
        if (href !== undefined && href.match(/^#/)) {
            window.location.hash = href;
        }
    };

    TabList.runComponent = function($selector) {
        this.$componentSelector = $selector;
        // Change hash upon pane activation
        this.$componentSelector.find('a[role="tab"]')
        .each(function() {
            var href = $(this).attr('href');
            var tabPane = TabPane(href);
            if (tabPane.isActive()) {
                tabPane.loadTemplate();
            }
        })
        .on('click', this.onClickTab);
    };

    TabList.removeComponent = function($selector) {
        this.$componentSelector.find('a[role="tab"]')
        .off('click', this.onClickTab);
    };

}(TabList.prototype);


// https://github.com/linuxfoundation/cii-best-practices-badge/issues/218
function initTabPane() {
    TabPane().switchTo();
    $(window).on('hashchange', function() {
        TabPane().switchTo();
    });
}

export { TabPane, TabList, initTabPane };
