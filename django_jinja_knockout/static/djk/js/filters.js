import { propGet } from './prop.js';

function ListRangeFilter(options) {
    this.init(options);
};

void function(ListRangeFilter) {

    ListRangeFilter.init = function(options) {
        this.filterKey = propGet(options, 'filterKey' ,'list_filter');
        this.fromFieldLookup = propGet(options, 'fromFieldLookup', 'gte');
        this.toFieldLookup = propGet(options, 'toFieldLookup', 'lte');
        this.fieldName = options.fieldName;
    };

    ListRangeFilter.getFilterKeyValue = function(urlSearchParams) {
        var filterKeyStr = urlSearchParams.get(this.filterKey);
        if (typeof filterKeyStr !== 'string') {
            return {};
        }
        try {
            return JSON.parse(filterKeyStr);
        } catch (e) {
            return {};
        }
    };

    ListRangeFilter.resetFilterValue = function(fieldLookup) {
        var filterKeyValue = this.getFilterKeyValue(this.urlSearchParams);
        if (this.fieldName in filterKeyValue) {
            if (fieldLookup in filterKeyValue[this.fieldName]) {
                delete filterKeyValue[this.fieldName][fieldLookup];
            }
            if (_.size(filterKeyValue[this.fieldName]) === 0) {
                delete filterKeyValue[this.fieldName];
            }
            this.urlSearchParams.set(this.filterKey, JSON.stringify(filterKeyValue));
        }
    };

    ListRangeFilter.setFilterValue = function(val, fieldLookup) {
        var filterKeyValue = this.getFilterKeyValue(this.urlSearchParams);
        if (!(this.fieldName in filterKeyValue)) {
            filterKeyValue[this.fieldName] = {};
        }
        filterKeyValue[this.fieldName][fieldLookup] = val;
        this.urlSearchParams.set(this.filterKey, JSON.stringify(filterKeyValue));
    };

    ListRangeFilter.applyFilterValue = function(ev, fieldLookup) {
        var val = $(ev.target).val().trim();
        if (val === '') {
            this.resetFilterValue(fieldLookup);
        } else {
            this.setFilterValue(val, fieldLookup);
        }
        // Reset paginator page, if any.
        this.urlSearchParams.delete('page');
        var urlParts = this.$applyUrl.prop('href').split('?');
        urlParts[1] = this.urlSearchParams.toString();
        this.$applyUrl.prop('href', urlParts.join('?'));
    };

    ListRangeFilter.onChange = function(ev) {
        if ($(ev.target).hasClass('input-from')) {
            this.applyFilterValue(ev, this.fromFieldLookup);
        } else if ($(ev.target).hasClass('input-to')) {
            this.applyFilterValue(ev, this.toFieldLookup);
        }
        if (ev.type === 'error') {
            ev.stopPropagation();
            return false;
        }
    };

    ListRangeFilter.onSearch = function(ev) {
        this.$applyUrl.get(0).click();
    };

    ListRangeFilter.onShownBsCollapse = function(ev) {
        this.$titleListElement.addClass('active');
        this.$componentSelector
        .removeClass('display-inline')
        .addClass('display-block');
    };

    ListRangeFilter.onHiddenBsCollapse = function(ev) {
        // Next line fixes the collapse for Bootstrap 3:
        this.$collapsible.removeClass('show');
        this.$titleListElement.removeClass('active');
        this.$componentSelector
        .removeClass('display-block')
        .addClass('display-inline');
    };

    ListRangeFilter.onToggleClick = function(ev) {
        this.$collapsible.collapse('toggle');
        ev.stopPropagation();
        return false;
    };

    ListRangeFilter.runComponent = function($selector) {
        var self = this;
        var $toggle = $selector.find('.accordion-toggle');
        this.urlSearchParams = new URLSearchParams(location.search);
        this.$componentSelector = $selector;
        this.$collapsible = this.$componentSelector.find('.collapse');
        this.$applyUrl = $selector.find('.apply-url');
        this.$titleListElement = $toggle.parents('li:first');
        this.$titleListElement = $toggle.parents('li:first');
        $selector.find('.input-from')
        .on('change', this.onChange.bind(this))
        // TempusDominus Bootstrap 4 events:
        .on('change.datetimepicker error.datetimepicker', this.onChange.bind(this))
        .on('search', this.onSearch.bind(this));
        $selector.find('.input-to')
        .on('change', this.onChange.bind(this))
        // TempusDominus Bootstrap 4 events:
        .on('change.datetimepicker error.datetimepicker', this.onChange.bind(this))
        .on('search', this.onSearch.bind(this));
        if (this.$collapsible.hasClass('in')) {
            this.$titleListElement.addClass('active');
        } else {
            this.$titleListElement.removeClass('active');
        }
        this.$collapsible
        .on('shown.bs.collapse', this.onShownBsCollapse.bind(this))
        .on('hidden.bs.collapse', this.onHiddenBsCollapse.bind(this));
        $toggle.on('click', this.onToggleClick.bind(this));
    };

}(ListRangeFilter.prototype);

export { ListRangeFilter };
