/**
 * IE11 does not load script type="module" correctly, thus this script is required.
 * Todo: Remove when IE11 support will be dropped.
 */

if (window.navigator.userAgent.indexOf('Trident/') > -1) {
    var scripts = [];
    for (var i = 0; i < document.scripts.length; i++) {
        scripts[i] = document.scripts[i];
    }
    for (var i = 0; i < scripts.length; i++) {
        if (scripts[i].type === 'module') {
            console.log(scripts[i].src);
            var script = document.createElement('script');
            script.src = scripts[i].src;
            document.body.removeChild(scripts[i]);
            document.body.appendChild(script);
        }
    }
}
