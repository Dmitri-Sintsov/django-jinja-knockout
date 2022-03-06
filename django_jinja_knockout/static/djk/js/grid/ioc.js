import { ViewModelRouter } from './../vmrouter.js';

import { KoGridAction, GridRowsPerPageAction } from './actions.ko.js';

var gridActionIoc = new ViewModelRouter({
    'KoGridAction': function(options) {
        return new KoGridAction(options);
    },
    'GridRowsPerPageAction': function(options) {
        return new GridRowsPerPageAction(options);
    },
});

export { gridActionIoc };
