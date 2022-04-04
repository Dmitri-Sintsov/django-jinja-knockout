/**
 * Custom Elements v1 in es5 with IE11 polyfills.
 *
 *  https://javascript.info/custom-elements
 *  https://web.dev/custom-elements-v1/
 *  https://stackoverflow.com/questions/50295703/create-custom-elements-v1-in-es5-not-es6
 *  https://github.com/webcomponents/custom-elements/issues/94
 *  https://github.com/webcomponents/polyfills/issues/108
 *  https://github.com/webcomponents/webcomponentsjs/issues/809
 *
 */

// test re-attaching of the already attached element
function reattachElement(selector) {
    var $el = $(selector);
    $el.detach();
    $(document.body).append($el);
}

function Elements(options) {

    this.init(options);

} void function(Elements) {

    Elements.init = function(options) {
    };

    Elements.builtInProperties = [
        'adopted',
        'alwaysConnected',
        'ancestor',
        'attributeChanged',
        'classes',
        'connected',
        'disconnected',
        'extendsTagName',
        'observedAttributes',
        'properties',
        'name',
        'styles',
    ];

    Elements.getStyleList = function(styles) {
        var styleList = '';
        for (var k in styles) {
            if (styles.hasOwnProperty(k)) {
                styleList += CSS.escape(k) + ': ' + CSS.escape(styles[k]) + '; ';
            }
        }
        return styleList;
    };

    Elements.getNewElement = function(tagDef) {
        return function() {
            return Reflect.construct(tagDef.ancestor, [], this.constructor);
        };
    };

    Elements.getDisconnected = function(tagDef) {
        return function() {
            tagDef.disconnected.call(this);
        };
    };

    Elements.getAdopted = function(tagDef) {
        return function() {
            tagDef.adopted.call(this);
        }
    };

    Elements.getConnected = function(tagDef) {
        return function() {
            if (typeof this._isAlreadyInitialized === 'undefined') {
                if (Array.isArray(tagDef.classes)) {
                    for (var i = 0; i < tagDef.classes.length; i++) {
                        this.classList.add(tagDef.classes[i]);
                    }
                }
                if (typeof tagDef.connected === 'function') {
                    // Pass tagDef argument so one may analyze and store tagDef options in connected()
                    // in case one tagDef is used for multiple custom tags.
                    tagDef.connected.call(this);
                }
                this._isAlreadyInitialized = true;
            } else {
                if (typeof tagDef.alwaysConnected === 'function') {
                    tagDef.alwaysConnected.call(this);
                }
            }
        }
    }

    Elements.getObservedAttributes = function(tagDef, attributeChanged) {
        return function() {
            if (typeof tagDef.observedAttributes === 'function') {
                return tagDef.observedAttributes.call(this);
            }
            if (typeof attributeChanged === 'object') {
                var observedAttributes = [];
                for (var k in attributeChanged) {
                    if (attributeChanged.hasOwnProperty(k)) {
                        observedAttributes.push(k);
                    }
                }
                return observedAttributes;
            }
            if (Array.isArray(tagDef.observedAttributes)) {
                return tagDef.observedAttributes;
            }
        }
    };

    Elements.getAttributeChangedCb = function(attributeChanged) {
        return function(name, oldValue, newValue) {
            if (typeof attributeChanged === 'function') {
                attributeChanged.call(this, name, oldValue, newValue);
            } else if (typeof attributeChanged[name] === 'function') {
                attributeChanged[name].call(this, oldValue, newValue);
            }
        }
    };

    Elements.getAttributeChanged = function(tagDef) {
        var attributeChanged = {
            attributes: {},
            elProperties: {},
        };
        if (typeof tagDef.attributeChanged !== 'undefined') {
            if (typeof tagDef.attributeChanged !== 'undefined') {
                if (typeof tagDef.attributeChanged === 'object') {
                    // Clone and store attributeChanged to custom element instance so the existing listeners
                    // can be set / removed dynamically after the instance is already initialized.
                    for (var k in tagDef.attributeChanged) {
                        if (tagDef.attributeChanged.hasOwnProperty(k)) {
                            attributeChanged.attributes[k] = tagDef.attributeChanged[k];
                        }
                    }
                    /**
                     *  Modifying / removing existing DOM attribute handlers is supported.
                     *  Dynamically adding / removing observable attributes is tricky / has performance issues
                     *  is rarely needed and is not supported. See these links for more info:
                     *    https://andyogo.github.io/custom-element-reactions-diagram/
                     *    https://github.com/WICG/webcomponents/issues/565
                     *    https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
                     */
                    attributeChanged.elProperties['attributeChanged'] = {
                        value: attributeChanged.attributes
                    };
                } else if (typeof tagDef.attributeChanged === 'function') {
                    attributeChanged.attributes = tagDef.attributeChanged;
                }
            }
            attributeChanged.elProperties['attributeChangedCallback'] = {
                value: this.getAttributeChangedCb(attributeChanged.attributes)
            };
        }
        return attributeChanged;
    };

    Elements.create = function(tagDef) {

        if (typeof tagDef.ancestor === 'undefined') {
            tagDef.ancestor = HTMLElement;
        }

        if (typeof tagDef.styles === 'object') {
            document.head.insertAdjacentHTML(
                'afterbegin',
                '<style>' + CSS.escape(tagDef.name) + ' { ' + this.getStyleList(tagDef.styles) + ' }' + '</style>'
            );
        }

        var elProperties = {
            connectedCallback: {
                value: this.getConnected(tagDef)
            },
        };

        if (typeof tagDef.disconnected !== 'undefined') {
            elProperties['disconnectedCallback'] = {
                value: this.getDisconnected(tagDef)
            };
        }

        if (typeof tagDef.adopted !== 'undefined') {
            elProperties['adoptedCallback'] = {
                value: this.getAdopted(tagDef)
            };
        }

        var attributeChanged = this.getAttributeChanged(tagDef)
        $.extend(elProperties, attributeChanged.elProperties);

        for (var k in tagDef) {
            if (tagDef.hasOwnProperty(k) && this.builtInProperties.indexOf(k) === -1) {
                elProperties[k] = {
                    value: tagDef[k]
                }
            }
        }

        var el = this.getNewElement(tagDef);

        el.prototype = Object.create(tagDef.ancestor.prototype, elProperties);

        el.prototype.constructor = el;
        Object.setPrototypeOf(el, tagDef.ancestor);

        if (typeof tagDef.observedAttributes !== 'undefined' || typeof attributeChanged === 'object') {
            Object.defineProperty(el, 'observedAttributes', { get: this.getObservedAttributes(tagDef, attributeChanged.attributes) });
        }

        if (typeof tagDef.properties !== 'undefined') {
            for (var k in tagDef.properties) {
                if (tagDef.properties.hasOwnProperty(k)) {
                    Object.defineProperty(el, k, tagDef.properties[k]);
                }
            }
        }

        if (typeof tagDef.extendsTagName !== 'undefined') {
            customElements.define(tagDef.name, el, {extends: tagDef.extendsTagName});
        } else {
            customElements.define(tagDef.name, el);
        }

        return el;

    };

    Elements.createBlock = function(tagDef) {
        if (typeof tagDef.styles === 'undefined') {
            tagDef.styles = {};
        }
        tagDef.styles.display = 'block';
        return this.create(tagDef);
    };

    // Unused, because inherited custom elements fails both in Chrome / IE11 polyfill.
    Elements.createDiv = function(tagDef) {
        tagDef.ancestor = HTMLDivElement;
        tagDef.extendsTagName = 'div';
        return this.create(tagDef);
    };

    Elements.newCustomElements = function() {
        var args = Array.prototype.slice.call(arguments);
        args.forEach(this.create.bind(this));
        return this;
    };

    Elements.newBlockElements = function() {
        var args = Array.prototype.slice.call(arguments);
        args.forEach(this.createBlock.bind(this));
        return this;
    };

}(Elements.prototype);

var elements = new Elements();

export { Elements, elements, reattachElement };
