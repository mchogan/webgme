/*globals define, console, WebGMEGlobal*/
/**
 * @author nabana / https://github.com/nabana
 * @author lattmann / https://github.com/lattmann
 */

define([
    'util/guid',
    'js/Utils/GMEConcepts',
    'logManager',
    'js/Constants'
], function (
    GUID,
    GMEConcepts,
    logManager,
    CONSTANTS
) {
    'use strict';

    var PropertyGridController = function ( $scope, gmeClient ) {
        var self = this;

        // this controller identifier
        self.guid = 'PropertyGridController_' + GUID();

        self.logger = logManager.create( self.guid );

        self.$scope = $scope;
        self.gmeClient = gmeClient;

        // gmeClient specific objects
        self.currentObjectId = null;
        self.territoryId = null;

        self.initialize();
    };

    PropertyGridController.prototype.update = function () {
        if ( !this.$scope.$$phase ) {
            this.$scope.$apply();
        }
    };

    PropertyGridController.prototype.initialize = function () {
        var self = this,
            onChange;

        // data model

        self.$scope.items = [];
        self.$scope.config = {};

        if ( self.gmeClient ) {
            // initialize with gmeClient
            self.$scope.items = [];
            self.$scope.config = {};

            // TODO: in destroy function WebGMEGlobal.State.off
            WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, self.stateActiveObjectChanged, self);

        } else {
            // initialize test with data

            onChange = function (item) {
                console.log('Item changed > ' + item.label, item);
            };

            self.$scope.config = {};

            self.$scope.items = [
                {
                    id      : 'Name',
                    label   : 'Name',
                    value   : 'This is my name',
                    onChange: onChange
                },
                {

                    id      : 'Position',
                    label   : 'Position',
                    cssClass: '',
                    value   : [
                        {
                            id   : 'Position_x',
                            label: 'X',
                            value: 10
                            //valueWidget: integerValueWidget,
                        },
                        {
                            id   : 'Position_y',
                            label: 'Y',
                            value: 30
                            //valueWidget: integerValueWidget,
                        }
                    ],
                    onChange: onChange
                },
                {
                    id         : 'is_happy',
                    label      : 'Happy or not?',
                    value      : true,
                    valueWidget: {
                        type: 'boolean'
                    }
                },
                {
                    id         : 'country',
                    label      : 'Country',
                    value      : 'usa',
                    valueWidget: {
                        type        : 'select',
                        defaultValue: 'pol',
                        multi       : false,
                        options     : [
                            {
                                label: 'U.S.A.',
                                value: 'usa'
                            },
                            {
                                label: 'Poland',
                                value: 'pol'
                            },
                            {
                                label: 'England',
                                value: 'eng'
                            }
                        ]
                    },
                    onChange   : onChange
                },
                {
                    id         : 'color',
                    label      : 'Color',
                    value      : '#ff0066',
                    valueWidget: {
                        type: 'colorPicker'
                    },
                    onChange   : onChange
                }
            ];

        }
    };

    PropertyGridController.prototype.setReadOnly = function (isReadOnly) {
        console.warn('TODO: change read only state to isReadOnly: ', isReadOnly);
    };

    PropertyGridController.prototype.stateActiveObjectChanged = function (model, activeObjectId) {
        var self = this,
            pattern;

        if (self.currentObjectId === activeObjectId) {
            return;
        }

        if (self.territoryId) {
            // TODO: clean up the territory
            self.gmeClient.removeUI(self.territoryId);
            self.territoryId = null;

            self.$scope.items = [];
            self.$scope.config = {};
        }

        self.currentObjectId = activeObjectId;

        if (self.currentObjectId || self.currentObjectId === CONSTANTS.PROJECT_ROOT_ID) {

            pattern = {};
            pattern[self.currentObjectId] = { "children": 0 };

            self.territoryId = self.gmeClient.addUI(self, function (events) {
                var event,
                    nodeObj,
                    i;

                if (events.length === 0) {
                    return;
                }

                event = events[0];

                if (event.etype === 'load' || event.etype === 'update') {
                    nodeObj = self.gmeClient.getNode(event.eid);


                    self.$scope.items.push({
                        id      : 'Name',
                        label   : 'Name',
                        value   : nodeObj.getAttribute('name'),
                        onChange: function () {}
                    });

                } else if (event.etype === 'unload') {
                    self.$scope.items = [];
                    self.$scope.config = {};

                    self.update();
                } else {
                    self.logger.error('Unhandled event type: ' + event.etype + ' (id) ' + event.eid);
                }

            }, self.guid);

            self.gmeClient.updateTerritory(self.territoryId, pattern);

        } else {
            self.logger.warning('No active object.');
        }
    };

    return PropertyGridController;
}
);