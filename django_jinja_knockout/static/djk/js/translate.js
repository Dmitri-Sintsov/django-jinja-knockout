import { sprintf } from './lib/sprintf-esm.js';

var Trans;

if (typeof django === 'object' && typeof django.gettext === 'function') {
    Trans = function() {
        if (arguments.length < 2) {
            return django.gettext(arguments[0]);
        } else {
            var args = Array.prototype.slice.call(arguments);
            args[0] = django.gettext(args[0]);
            return sprintf.apply(this, args);
        }
    }
} else if (typeof sprintf === 'function') {
    Trans = sprintf;
    console.log('@note: No Django gettext is loaded, no localization, falling back to sprintf.js');
}

function localize($selector) {
    $selector.findSelf('.localize-text').each(function() {
        var $el = $(this);
        $el.removeClass('localize-text');
        $el.text(Trans($el.text()));
    });
}

export { Trans, localize };
