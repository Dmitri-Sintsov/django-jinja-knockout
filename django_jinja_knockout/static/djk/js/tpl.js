import { template, each, sortBy } from './lib/underscore-esm.js';
import { inheritProps } from './dash.js';
import { propGet } from './prop.js';
import { globalIoc } from './ioc.js';
import { transformTags } from './ui.js';

// Cache for compiled templates.
var _templates = {};

function compileTemplate(tplId) {
    if (typeof _templates[tplId] === 'undefined') {
        var tpl = document.getElementById(tplId);
        if (tpl === null) {
            throw new Error(
                sprintf("Unknown underscore template id: %s", tplId)
            );
        }
        // Local context variables will be passed to 'self' object variable in template text,
        // to speed-up template expansion and to inject helper functions.
        // http://underscorejs.org/#template
        _templates[tplId] = template(
            $(tpl).html(), {variable: 'self'}
        );
    }
    return _templates[tplId];
};

/**
 * underscore.js templates default processor (default class binding),
 * available in underscore templates as self.
 *
 * Currently used html5 data attributes:
 *
 * 'data-template-class' : optional Javascript classpath to template processor class ('Tpl' when omitted).
 * 'data-template-options' : optional options argument of template processor class constructor.
 * 'data-template-id' : DOM id of underscore.js template to expand recursively.
 * 'data-template-args' : optional data to be used to control the logic flow of current underscore.js template via
 *     Tpl.get() method available as self.get() in template source code.
 * 'data-template-args-nesting': set to false to disable inheritance of data-template-args attribute by inner templates.
 *
 * todo: Add .flatatt() to easily manipulate DOM attrs in templates.
 */
function Tpl(options) {
    this.init(options);
};

void function(Tpl) {

    Tpl.parentProps = ['data', 'templates'];

    Tpl.init = function(options) {
        var defOptions = {}
        each(this.parentProps, function(propName) {
            defOptions[propName] = {};
        });
        var _options = $.extend(defOptions, options);
        // Set of data used to control current template logic via Tpl.get() method.
        this.data = _options.data;
        // Optionally substitutes templateId to another one to create custom layout.
        this.templates = _options.templates;
    };

    Tpl.inheritProcessor = function(elem, clone) {
        var $elem = $(elem);
        var child;
        // There is no instance supplied. Load from classPath.
        var classPath = $elem.data('templateClass');
        var templateOptions = $elem.data('templateOptions');
        if (classPath === undefined && templateOptions === undefined) {
            if (clone === true) {
                child = this.cloneProcessor();
            } else {
                child = this;
            }
        } else {
            var options = $.extend({}, templateOptions);
            if (classPath === undefined) {
                classPath = 'Tpl';
            }
            child = globalIoc.factory('Tpl', options);
            child.inheritProps(this);
        }
        return child;
    };

    Tpl.cloneProcessor = function() {
        return $.extend(true, {}, this);
    };

    // Override for custom inheritance.
    Tpl.inheritProps = function(parent) {
        var child = this;
        each(this.parentProps, function(propName) {
            inheritProps(parent[propName], child[propName]);
        });
    };

    Tpl.extendData = function(data) {
        this.data = $.extend(this.data, data);
    };

    Tpl.getTemplateData = function(data) {
        return (typeof data === 'undefined') ? {} : data;
    };

    // Optionally substitutes templateId to another one to create custom layout.
    Tpl.getTemplateId = function(templateId) {
        return (typeof this.templates[templateId] === 'undefined') ? templateId : this.templates[templateId];
    };

    Tpl.get = function(varName, defaultValue) {
        if (typeof varName !== 'string') {
            throw new Error('varName must be string');
        }
        return (typeof this.data[varName] === 'undefined') ? defaultValue : this.data[varName];
    };

    Tpl.padLeft = function(varName, l) {
        var val = this.get(varName);
        if (val === undefined) {
            return '';
        } else {
            if (l === undefined) {
                l = ' ';
            }
            return l + val;
        }
    };

    /**
     * Expand underscore.js template to string.
     */
    Tpl.expandTemplate = function(tplId) {
        var compiled = compileTemplate(
            this.getTemplateId(tplId)
        );
        return compiled(this);
    };

    /**
     * Recursively expand the jQuery contents with nested underscore templates.
     */
    Tpl.expandContents = function($contents) {
        var self = this;
        $contents = transformTags.applyTags($contents);
        // Load recursive nested templates, if any.
        $contents.each(function(k, v) {
            var $node = $(v);
            if ($node.prop('nodeType') === 1) {
                self.loadTemplates($node);
            }
        });
        return $contents;
    };

    /**
     * Manually loads one template (by it's DOM id) and expands it with specified instance self into jQuery DOM nodes.
     * Template will be processed recursively.
     */
    Tpl.domTemplate = function(tplId) {
        var contents = this.expandTemplate(tplId);
        var $contents = $.contents(contents);
        $contents = this.expandContents($contents);
        return $contents;
    };

    /**
     * Search for template args in parent templates.
     * Accumulate all ancestors template args from up to bottom.
     */
    Tpl.addSubArgs = function($ancestors) {
        for (var i = $ancestors.length - 1; i >= 0; i--) {
            var $ancestor = $ancestors.eq(i);
            var ancestorTplArgs = $ancestor.data('templateArgs');
            if (ancestorTplArgs !== undefined &&
                    $ancestor.data('templateArgsNesting') !== false) {
                this.extendData(ancestorTplArgs);
            }
        }
    };

    Tpl.getTopNode = function($contents) {
        var self = this;
        var topNode = undefined;
        var topNodeCount = 0;
        // Make sure that template contents has only one top tag, otherwise .contents().unwrap() may fail sometimes.
        $contents.each(function(k, v) {
            if ($(v).prop('nodeType') === 1) {
                topNode = v;
                if (++topNodeCount > 1) {
                    throw new Error(
                        "Template '" + self.tplId + "' expanded contents should contain the single top DOM tag."
                    );
                }
            }
        });
        return topNode;
    };

    Tpl.renderSubTemplates = function() {
        var $contents = this.domTemplate(this.tplId);
        return {
            'nodes': $contents,
            'topNode': this.getTopNode($contents),
        };
    };

    Tpl.prependTemplates = function(target, $ancestors) {
        var $target = $(target);
        this.tplId = $target.attr('data-template-id');
        if (this.tplId === undefined) {
            console.log('skipped undefined data-template-id for $target: ' + $target.prop('outerHTML'));
            console.dir($target);
        } else {
            if ($target.data('templateArgsNesting') !== false) {
                this.addSubArgs($ancestors);
            }
            this.extendData(
                this.getTemplateData($target.data('templateArgs'))
            );
            var subTemplates = this.renderSubTemplates();
            /**
             * If there are any non 'data-template-*' attributes in target node, copy these to subTemplates top node.
             */
            if (subTemplates.topNode !== undefined) {
                for (var i = 0; i < target.attributes.length; i++) {
                    var name = target.attributes[i].name;
                    if (name === 'class') {
                        $(subTemplates.topNode).addClass(target.attributes[i].value);
                    } else if (name.substr(0, 14) !== 'data-template-' &&
                            name.substr(0, 2) !== 't-') {
                        subTemplates.topNode.setAttribute(
                            name, target.attributes[i].value
                        );
                    }
                }
            }
            /**
             * Some components, such as Grid need to know which templates were substituted via $target node
             * data-template-options attribute, so we store them into the another data attribute of top expanded node.
             */
            var substitutions = propGet($target.data('templateOptions'), 'templates');
            if (typeof substitutions === 'object') {
                $(subTemplates.topNode).data('templateSubstitutions', substitutions);
            }
            $target.prepend(subTemplates.nodes);
        }
    };

    /**
     * Recursive underscore.js template autoloading.
     * Does not use html5 <template> tag because IE lower than Edge does not support it.
     * Make sure loaded template is properly closed XHTML, otherwise jQuery.html() will fail to load it completely.
     */
    Tpl.loadTemplates = function($selector) {
        var $targets = $selector.findSelf('[data-template-id]');
        // Build the list of parent templates for each template available.
        var $ancestors = [];
        $targets.each(function(k, currentTarget) {
            $ancestors[k] = $(currentTarget).parents('[data-template-id]');
            $ancestors[k]._targetKey = k;
        });
        // Sort the list of parent templates from outer to inner nodes of the tree.
        $ancestors = sortBy($ancestors, 'length');
        // Expand innermost templates first, outermost last.
        for (var k = $ancestors.length - 1; k >= 0; k--) {
            var target = $targets.get($ancestors[k]._targetKey);
            var ancestorTpl = this.inheritProcessor(target);
            ancestorTpl.prependTemplates(target, $ancestors[k]);
        };
        $targets.each(function() {
            $(this).contents().unwrap();
        });
    };

}(Tpl.prototype);

/**
 * Recursive underscore.js template autoloading with template self instance binding.
 */
function bindTemplates($selector, tpl) {
    $selector.each(function() {
        if (typeof tpl === 'undefined') {
            tpl = globalIoc.factory('Tpl').inheritProcessor(this, false);
        }
        tpl.loadTemplates($(this));
    });
};

function getTemplateSubstitution($element, templateName) {
    if ($element) {
        var substitutions = $element.data('templateSubstitutions');
        return propGet(substitutions, templateName, templateName);
    } else {
        return templateName;
    }
};

export { Tpl, bindTemplates, getTemplateSubstitution };
