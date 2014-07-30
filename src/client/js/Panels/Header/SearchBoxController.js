/*globals define, console*/

define([], function (

    ) {
    "use strict";

    var SearchBoxController = function ($scope, gmeClient) {

        var self = this;

        self.$scope = $scope;
        self.gmeClient = gmeClient;

        // internal data representation for fast access to objects


        self.initialize();
    };

    SearchBoxController.prototype.update = function () {
        if (!this.$scope.$$phase) {
            this.$scope.$apply();
        }
    };

    SearchBoxController.prototype.initialize = function () {
        var self = this,
            defaultConfig = {};

        // initialize model structure for view
        self.$scope.handlers = [];
        self.$scope.config = defaultConfig;
    };


    return SearchBoxController;
});
