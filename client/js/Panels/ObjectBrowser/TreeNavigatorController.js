/*globals define, console*/
/**
 * @author nabana / https://github.com/nabana
 * @author lattmann / https://github.com/lattmann
 */

define([], function (

) {
    "use strict";

    var TreeNavigatorController = function ($scope, gmeClient) {

        var self = this;

        self.$scope = $scope;
        self.gmeClient = gmeClient;

        // internal data representation for fast access to objects
  
        self.initialize();
    };

    TreeNavigatorController.prototype.update = function () {
        if (!this.$scope.$$phase) {
            this.$scope.$apply();
        }
    };

    TreeNavigatorController.prototype.initialize = function () {
        var self = this;

        // initialize model structure for view
        self.$scope.navigator = {
            items: [],
            separator: true
        };

       
        if (self.gmeClient) {
            self.initWithClient();
        } else {
            self.initTestData();
        }

        // only root is selected by default
        self.$scope.navigator = {
            items: [
                self.root
            ],
            separator: true
        };
    };

    TreeNavigatorController.prototype.initTestData = function () {
        var self = this;

        //self.dummyTreeDataGenerator('Project', 20);
    };

    TreeNavigatorController.prototype.initWithClient = function () {
        var self = this;

        // register all event listeners on gmeClient

        throw 'Not implemented';
        
    };
      

    TreeNavigatorController.prototype.dummyTreeDataGenerator = function (name, maxCount) {
        var self = this,
            i,
            id,
            count,
            rights;

        count = Math.max(Math.round(Math.random() * maxCount), 3);

        for (i = 0; i < count; i += 1) {
            id = name + '_' + i;
          

            self.addProject(id, rights);
        }
    };

    
    return TreeNavigatorController;
});
