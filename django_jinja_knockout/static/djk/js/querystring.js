function QueryString(locationSearch) {

    if (typeof locationSearch === 'undefined') {
        this.urlSearchParams = new URLSearchParams(location.search);
    } else {
        this.urlSearchParams = new URLSearchParams(locationSearch);
    }

} void function(QueryString) {

    QueryString.get = function(name, defVal) {
        var result = this.urlSearchParams.get(name);
        return (result === null) ? defVal : result;
    };

    QueryString.fromJSON = function(name, defVal) {
        try {
            return JSON.parse(this.get(name, defVal));
        } catch(e) {
            return defVal;
        }
    };

}(QueryString.prototype);

export { QueryString };
