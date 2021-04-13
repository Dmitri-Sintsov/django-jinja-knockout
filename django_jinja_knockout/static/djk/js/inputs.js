function disableInput(input) {
    var $input = $(input);
    var i;
    for (i = 0; typeof $input.data('formInputOriginalDisabled' + i) !== 'undefined'; i++);
    $input.data('formInputOriginalDisabled' + i, $input.prop('disabled'));
    $input.prop('disabled', true);
    if ($input.attr('type') === 'radio') {
        $input.trigger('refresh');
    }
};

function enableInput(input) {
    var $input = $(input);
    var i;
    for (i = 0; typeof $input.data('formInputOriginalDisabled' + i) !== 'undefined'; i++);
    if (i === 0) {
        // Skipped already enabled input.
        return;
    }
    i--;
    $input.prop('disabled', $input.data('formInputOriginalDisabled' + i));
    $input.removeData('formInputOriginalDisabled' + i);
    if ($input.attr('type') === 'radio') {
        $input.trigger('refresh');
    }
};

function disableInputs(parent) {
    $(parent).find(':input:visible').each(function(k, v) {
        disableInput(v);
    });
};

function enableInputs(parent) {
    $(parent).find(':input:visible').each(function(k, v) {
        enableInput(v);
    });
};

function clearInputs(parent) {
    var $parent = $(parent);
    $parent.find('input[type="text"]:visible, textarea:visible')
    .val('')
    .removeClass('error validation-error')
    // @note: data-original-title is boostrap3 standard attribute, do not change the name.
    .removeAttr('data-original-title')
    .autogrow('update')
    .collapsibleSubmit('update');
    $parent.find('.select2-container').remove();
};

function SelectMultipleAutoSize($selector) {
    $selector.findSelf('select[multiple]').each(function(k, v) {
        var $select = $(v);
        var size = $select.prop('size');
        var length = $select.find('option').length;
        if (size === 0 && length < 10) {
            $select.prop('size', length);
        }
    });
};

function Ladder($selector) {
    var self = this;
    this.laddas = [];
    $selector.findSelf('button[type="submit"], button.submit, input[type="submit"]').each(function(k, v) {
        var l = Ladda.create(v);
        l.start();
        self.laddas.push(l);
    });
};

Ladder.prototype.remove = function() {
    $.each(this.laddas, function(k, v) {
        v.remove();
    });
};

export { disableInput, enableInput, disableInputs, enableInputs, clearInputs, SelectMultipleAutoSize, Ladder };
