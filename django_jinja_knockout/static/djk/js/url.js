import { sprintf } from './lib/sprintf-esm.js';

import { showAjaxError } from './errors.js';
import { AppConf } from './conf.js';
import { vmRouter } from './ioc.js';

function DataUrl($element) {
    var route = $element.data('route');
    if (route === undefined) {
        return $element.data('url');
    } else {
        return Url(route, $element.data('routeKwargs'));
    }
}

function Url(route, kwargs) {
    if (typeof AppConf(['url', route]) === 'undefined') {
        throw new Error(
            sprintf("Undefined route: '%s'", route)
        );
    }
    if (typeof kwargs === 'undefined') {
        return AppConf(['url', route]);
    } else {
        return sprintf(AppConf(['url', route]), kwargs);
    }
}

function AppGet(route, data, options) {
    if (typeof options === 'undefined') {
        options = {};
    }
    var url = (typeof options.kwargs === 'undefined') ?
        Url(route) :
        Url(route, options.kwargs);
    delete options.kwargs;
    return $.get(
        url,
        (typeof data === 'undefined') ? {} : data,
        function(response) {
            vmRouter.respond(response, options);
        },
        'json'
    ).fail(showAjaxError);
}

function AppPost(route, data, options) {
    if (typeof data === 'undefined') {
        data = {};
    }
    if (typeof options === 'undefined') {
        options = {};
    }
    var url = (typeof options.kwargs === 'undefined') ?
        Url(route) :
        Url(route, options.kwargs);
    delete options.kwargs;
    if (typeof data.csrfmiddlewaretoken === 'undefined') {
        data.csrfmiddlewaretoken = AppConf('csrfToken');
    }
    return $.post(
        url,
        data,
        function(response) {
            vmRouter.respond(response, options);
        },
        'json'
    ).fail(showAjaxError);
}

export { Url, DataUrl, AppGet, AppPost };
