import { propGet } from './prop.js';
import { AppConf } from './conf.js';
import { Trans } from './translate.js';
import { vmRouter } from './ioc.js';

function showAjaxError(jqXHR, exception) {
    var message;
    if (jqXHR.status === 0) {
        message = 'Not connected.\n Verify Network.';
    } else if (jqXHR.status == 404) {
        message = 'Requested page not found. [404]';
    } else if (jqXHR.status == 405) {
        message = 'Method not allowed. [405]';
    } else if (jqXHR.status == 500) {
        message = 'Internal Server Error [500].';
    } else if (exception === 'parsererror') {
        message = 'Requested JSON parse failed.';
    } else if (exception === 'timeout') {
        message = 'Time out error.';
    } else if (exception === 'abort') {
        message = 'Ajax request aborted.';
    } else {
        message = 'Uncaught Error.\n' + $.htmlEncode(jqXHR.status + ' ' + jqXHR.responseText);
    }
    vmRouter.respond({
        'view': 'alert_error',
        'title': Trans('Request error'),
        'message': message
    });
}

/**
 * Do not log googlebot errors, because it has flawed interpreter which constantly produces errors, unavailable in
 * Selenium tests.
 */
var jsErrorFilter = function(data) {
    return data.userAgent.search('Googlebot|YandexBot') === -1;
};

function setErrorFilter(fn) {
    jsErrorFilter = fn;
}

var previousErrorHandler = window.onerror;
window.onerror = function(messageOrEvent, source, lineno, colno, error) {
    if (typeof previousErrorHandler === 'function') {
        previousErrorHandler(messageOrEvent, source, lineno, colno, error);
    }
    if (AppConf('jsErrorsAlert') || AppConf('jsErrorsLogging')) {
        var stack = propGet(error, 'stack', null);
        // Convert to strings for more reliability.
        var data = {
            'url': propGet(window, 'location') + '',
            'referrer': propGet(document, 'referrer') + '',
            'userAgent': propGet(window, 'navigator.userAgent') + '',
            'message': messageOrEvent + '',
            'source': source + '',
            'lineno': lineno + '',
            'colno': colno + '',
            'error': error + '',
            'stack': stack + '',
        };
        data.filter = jsErrorFilter(data);
        if (AppConf('jsErrorsLogging') && data.filter) {
            data.filter = jsErrorFilter + ' -> ' + data.filter;
            data.csrfmiddlewaretoken = AppConf('csrfToken');
            $.post('/-djk-js-error-/',
                data,
                function(response) {
                    // Wrapped into try / catch to avoid nested window.onerror calls.
                    try {
                        if (AppConf('jsErrorsAlert')) {
                            vmRouter.respond(response);
                        }
                    } catch (e) {
                        console.log(e);
                    }
                },
                'json'
            )
            .fail(showAjaxError);
        }
        if (AppConf('jsErrorsAlert')) {
            var $message = $('<div>');
            for (var k in data) {
                if (k !== 'csrfmiddlewaretoken' && data.hasOwnProperty(k)) {
                    var $elem = $('<p>')
                        .append($('<b>').text(k))
                        .append($(k === 'stack' ? '<pre>' : '<div>').text(data[k]));
                    $message.append($elem);
                }
            }
            import('./dialog.js').then(function(module) {
                new module.Dialog({
                    'title': 'Javascript error at: ' + data.url,
                    'message': $message
                }).alertError();
            });
        }
    }
};

export { setErrorFilter, showAjaxError };
