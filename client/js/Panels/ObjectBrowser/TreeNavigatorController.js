/*globals define, console*/
/**
 * @author nabana / https://github.com/nabana
 * @author lattmann / https://github.com/lattmann
 */

define(
    [], function (
        ) {
        "use strict";

        var TreeNavigatorController,
            defaultConfig;


        defaultConfig = {
            scopeSelector: {
                hidden: true,
                items: [
                    {
                        id: 'project',
                        label: 'Project',
                        action: function (
                            ) {
                            console.log(
                                'Show projects'
                            );
                        },
                        menu: [
                            {
                                items: [
                                    {
                                        id: 'preferences 1',
                                        label: 'Preferences 1'
                                    },
                                    {
                                        id: 'preferences 2',
                                        label: 'Preferences 2'
                                    },
                                    {
                                        id: 'preferences 3',
                                        label: 'Preferences 3',
                                        menu: [
                                            {
                                                items: [
                                                    {
                                                        id: 'sub_preferences 1',
                                                        label: 'Sub preferences 1'
                                                    },
                                                    {
                                                        id: 'sub_preferences 2',
                                                        label: 'Sub preferences 2'
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        id: 'composition',
                        label: 'Composition',
                        action: function (
                            ) {
                            console.log(
                                'Show composition'
                            );
                        }
                    }
                ]
            }
        };

        TreeNavigatorController = function (
            $scope,
            gmeClient
            ) {

            var self = this;

            self.$scope = $scope;
            self.gmeClient = gmeClient;

            // internal data representation for fast access to objects

            self.initialize(
            );
        };

        TreeNavigatorController.prototype.update = function (
            ) {
            if (!this.$scope.$$phase) {
                this.$scope.$apply(
                );
            }
        };

        TreeNavigatorController.prototype.initialize = function (
            ) {
            var self = this;

            // initialize model structure for view
            self.$scope.treeData = {
                id: 'ROOT',
                label: 'ROOT',
                children: []
            };

            self.$scope.config = defaultConfig;

            if (self.gmeClient) {
                self.initWithClient(
                );
            } else {
                self.initTestData(
                );
            }

            console.log(
                self.$scope.treeData
            );
        };

        TreeNavigatorController.prototype.initTestData = function (
            ) {
            var self = this;

            self.dummyTreeDataGenerator(
                self.$scope.treeData, 'Node item ', 5, 3
            );
        };

        TreeNavigatorController.prototype.initWithClient = function (
            ) {
            var self = this;

            // register all event listeners on gmeClient

            throw 'Not implemented';

        };

        TreeNavigatorController.prototype.addNode = function (
            treeNode,
            id
            ) {
            var self = this,
                newTreeNode;

            newTreeNode = {
                id: id,
                label: id,
                children: []
            };

            treeNode.children.push(
                newTreeNode
            );

            return newTreeNode;
        };

        TreeNavigatorController.prototype.dummyTreeDataGenerator = function (
            treeNode,
            name,
            maxCount,
            levels
            ) {
            var self = this,
                i,
                id,
                count,
                childNode;

            levels = levels || 0;

            count = Math.round(
                Math.random(
                ) * maxCount
            ) + 1;

            for (i = 0; i < count; i += 1) {
                id = name + i;

                childNode = self.addNode(
                    treeNode, id
                );

                if (levels > 0) {
                    self.dummyTreeDataGenerator(
                        childNode, id + '.', maxCount, levels - 1
                    );
                }
            }
        };

        return TreeNavigatorController;
    }
);
