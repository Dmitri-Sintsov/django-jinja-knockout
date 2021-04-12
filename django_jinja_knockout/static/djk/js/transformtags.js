import { keys, sortBy } from './lib/underscore-esm.js';

/**
 * Tags converter which is executed during initClient() content ready and for each expanded underscore.js template.
 * Converts <card-success id="panel1" class="my-panel"> to <div id="panel1" class="card text-white bg-success my-panel">
 * Note:
 *   Using custom tags with initial page content may produce flickering, because these are not native browser custom tags.
 *     To prevent such flickering, setup similar CSS rules for custom tags to the substituted ones.
 *   Using custom tags in templates is encouraged and produces no extra flickering.
 */
function TransformTags() {
    this.init();
};

void function(TransformTags) {

    TransformTags.toTag = function(elem, tag, cssClasses) {
        return $(elem).replaceWithTag(tag).addClass(cssClasses);
    };

    TransformTags.init = function() {
        // Upper case keys only!
        this.tags = {
            // Shortcut attrs for underscore.js templates:
            // _* is converted to data-template-*
            'TPL': function(elem, tagName) {
                /**
                 * Removing the shortcut attrs is not necessary,
                 * because the tag will be replaced by template content anyway.
                 */
                for (var i = 0; i < elem.attributes.length; i++) {
                    var name = elem.attributes[i].name;
                    if (name.substr(0, 2) === 't-') {
                        elem.setAttribute(
                            'data-template-' + name.substr(2), elem.attributes[i].value
                        );
                    }
                }
                return $(elem);
            },
        };
    };

    TransformTags.add = function(tags) {
        for (var tagName in tags) {
            if (tags.hasOwnProperty(tagName)) {
                this.tags[tagName] = tags[tagName];
            }
        }
        return this;
    };

    TransformTags.convertTag = function(elem) {
        var tagName = $(elem).prop('tagName');
        if (tagName !== undefined) {
            var $result = this.tags[tagName].call(this, elem, tagName);
        };
        return $result;
    };

    TransformTags.applyTags = function(selector) {
        var self = this;
        var $selector = $(selector);
        var tagNames = keys(this.tags)
        var tagsSelector = tagNames.join(',');
        var nodes = [];
        // Transform the nested tags from the innermost to the outermost order.
        $selector.find(tagsSelector).each(function() {
            nodes.push({node: this, depth: -$(this).parents().length});
        });
        nodes = sortBy(nodes, 'depth');
        for (var i = 0; i < nodes.length; i++) {
            this.convertTag(nodes[i].node);
        }
        // Transform top tags.
        $.each($selector, function(k, v) {
            if (tagNames.indexOf($(v).prop('tagName')) !== -1) {
                var $result = self.convertTag(v);
                if ($(v).parents().length > 0) {
                    // Top tag belongs to the subtree.
                    $(v).replaceWith($result);
                } else {
                    // Top tag is the root of the subtree (template expansion).
                    $selector[k] = $result[0];
                }
            }
        });
        return $selector;
    };

}(TransformTags.prototype);

export { TransformTags };
