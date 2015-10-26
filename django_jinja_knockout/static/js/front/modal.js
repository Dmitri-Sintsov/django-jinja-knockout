// @Note: Currently is unused. BootstrapDialog is used instead of jinja2 generated modal.

App.$alertModal = null;

/**
 * Use App.htmlEncode() on html strings to avoid client-side XSS.
 */
App.showModal = function($modal, title, html, cssClass) {
	if ($modal === null) {
		alert(html);
	} else {
		var $modalContent = $modal.find('.modal-content');
		var oldExtraClass = $modalContent.data('extraClass');
		if (typeof oldExtraClass !== 'undefined' &&
		        oldExtraClass !== cssClass) {
			$modalContent.removeClass(oldExtraClass);
		}
		if (typeof title !== 'undefined') {
    		$modal.find('.modal-title').text(title);
        }
        if (typeof html !== 'undefined') {
    		$modal.find('.modal-body').html(html);
        }
		if (typeof cssClass !== 'undefined') {
			$modalContent
			.data('extraClass',cssClass)
			.addClass(cssClass);
		}
		$modal.modal('show');
	}
};


App.modal = function(selector, options) {
    var $selector = App.getSelector(selector);
    options = $.extend({backdrop: 'static', keyboard: true, show: false}, options);
    return ($selector.length > 0) ? $selector.modal(options) : null;
};

App.$alertModal = App.modal('#alert_modal');

App.documentReadyHooks.push(function() {
    App.$alertModal = App.modal('#alert_modal');
});
