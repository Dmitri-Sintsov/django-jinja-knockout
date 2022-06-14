import { propGet } from './prop.js';

function getJsonScript(cls) {
    var elem = document.querySelector("script." + CSS.escape(cls));
    return (elem === null) ? {} : JSON.parse(elem.textContent);
}

var appConf = getJsonScript('app-conf');
var appClientData = getJsonScript('app-client-data');

function AppConf(propChain, defVal) {
    return propGet(appConf, propChain, defVal);
}

function AppClientData(propChain, defVal) {
    return propGet(appClientData, propChain, defVal);
}

export { AppConf, AppClientData };
