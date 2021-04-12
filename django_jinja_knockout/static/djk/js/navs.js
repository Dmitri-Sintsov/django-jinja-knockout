import { highlightNav } from './ui.js';

function highlightListUrl($selector, location) {
    if (location === undefined) {
        var url = $(document.body).data('highlightUrl');
        if (url !== undefined) {
            location = $.parseUrl(url);
        } else {
            location = window.location;
        }
    }
    var $anchors = $selector.findSelf('ul.auto-highlight > li > a');
    var exactMatches = [];
    var searchMatches = [];
    var pathnameMatches = [];
    $anchors.each(function() {
        highlightNav(this, false);
    });
    $anchors.each(function(k, a) {
        var a_pathname = a.pathname;
        if (a_pathname === location.pathname &&
            a.port === location.port &&
            a.hostname === location.hostname &&
            // Ignore anchors which actually have no 'href' with pathname defined.
            !a.getAttribute('href').match(/^#/)
        ) {
            if (a.search === location.search) {
                if (a.hash === location.hash) {
                    exactMatches.push(a);
                } else {
                    searchMatches.push(a);
                }
            } else {
                pathnameMatches.push(a);
            }
        }
    });
    if (exactMatches.length > 0) {
        for (var i = 0; i < exactMatches.length; i++) {
            highlightNav(exactMatches[i], true);
        }
    } else if (searchMatches.length === 1) {
        highlightNav(searchMatches[0], true);
    } else if (pathnameMatches.length === 1) {
        highlightNav(pathnameMatches[0], true);
    }
};

export { highlightListUrl };
