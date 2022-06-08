/**
 * Custom Elements v1 in es5 with IE11 polyfills.
 *
 *  https://javascript.info/custom-elements
 *  https://web.dev/custom-elements-v1/
 *  https://stackoverflow.com/questions/50295703/create-custom-elements-v1-in-es5-not-es6
 *  https://github.com/webcomponents/custom-elements/issues/94
 *  https://github.com/webcomponents/polyfills/issues/108
 *  https://github.com/webcomponents/webcomponentsjs/issues/809
 *  https://stackoverflow.com/questions/39196503/how-to-wait-for-custom-element-reference-to-be-upgraded
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

    Elements.DOMProperties = [
        'innerHTML',
        'innerText',
        'outerHTML',
    ];

    Elements.builtInProperties = [
        // callback
        'adopted',
        // callback
        'alwaysConnected',
        // DOM ancestor class like HTMLAnchorElement, HTMLFormElement
        'ancestor',
        // callback or object with keys element attribute names / values callbacks for each attribute
        'attributeChanged',
        // initially set DOM attributes
        'attrs',
        // initlally set DOM classes
        'classes',
        // callback
        'connected',
        // initially set DOM attributes in case the tag has no such attribute set already
        'defaultAttrs',
        // callback
        'disconnected',
        // original DOM element name when the 'ancestor' is specified
        'extendsTagName',
        // optional list / callback to get observedAttributes,
        // generated dynamically from 'attributeChanged' object keys, when available
        'observedAttributes',
        // custom Javascript class properties to set
        'properties',
        // custom tag name
        'name',
        // initial element styles, converted to dynamically generated stylesheet
        'styles',
    ];

    // https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet/insertRule
    Elements.createStyles = function(selector, rules) {
        var styleElem = document.createElement('style');
        document.head.appendChild(styleElem);
        var styleSheet = styleElem.sheet;
        var ruleStr = '{';
        for (var i = 0; i < rules.length; i++) {
            var rule = rules[i];
            for (var k in rule) {
                if (rule.hasOwnProperty(k)) {
                    ruleStr += k + ': ' + rule[k] + ';\n';
                }
            }
        }
        if (ruleStr !== '{') {
            styleSheet.insertRule(selector + ' ' + ruleStr + '}', styleSheet.cssRules.length);
        }
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

    Elements.setAttrs = function(attrs, isDefault) {
        for (var k in attrs) {
            if (attrs.hasOwnProperty(k) && (!isDefault || !this.hasAttribute(k))) {
                this.setAttribute(k, attrs[k]);
            }
        }
    };

    Elements.getConnected = function(tagDef) {
        var self = this;
        return function() {
            if (typeof this._isAlreadyInitialized === 'undefined') {
                if (typeof tagDef.defaultAttrs === 'object') {
                    self.setAttrs.call(this, tagDef.defaultAttrs, true);
                }
                if (typeof tagDef.attrs === 'object') {
                    self.setAttrs.call(this, tagDef.attrs, false);
                }
                if (Array.isArray(tagDef.classes)) {
                    for (var i = 0; i < tagDef.classes.length; i++) {
                        this.classList.add(tagDef.classes[i]);
                    }
                }
                for (var i = 0; i < self.DOMProperties.length; i++) {
                    var propName = self.DOMProperties[i];
                    // Set tagDef default .innerText / .innerHTML only when this DOM element .innerText / .innerHTML
                    // is an empty one.
                    if (typeof tagDef[propName] !== 'undefined' &&
                            (typeof this[propName] !== 'string' || this[propName].trim() === '')) {
                        this[propName] = tagDef[propName];
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

        if (Array.isArray(tagDef.styles)) {
            var selector = tagDef.name;
            if (typeof tagDef.extendsTagName !== 'undefined') {
                selector = tagDef.extendsTagName + '[is=' + selector + ']';
            }
            this.createStyles(selector, tagDef.styles);
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

        var attributeChanged = this.getAttributeChanged(tagDef);
        $.extend(elProperties, attributeChanged.elProperties);

        var skippedProperties = this.builtInProperties.concat(this.DOMProperties);

        for (var k in tagDef) {
            if (tagDef.hasOwnProperty(k) && skippedProperties.indexOf(k) === -1) {
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
            tagDef.styles = [];
        }
        tagDef.styles.push({'display': 'block'});
        return this.create(tagDef);
    };

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
