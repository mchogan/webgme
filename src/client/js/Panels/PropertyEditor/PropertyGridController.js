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
            onChange,

            attributes,
            visualizationProperties,
            propertyGroup1,
            propertyGroup2,
            propertyGroups;

        // initialize default configuration
        self.config = {
            propertyLabelPostfix: ':',
            mode: 'display'
        };

        // data model
        self.$scope.grid = {};

        if ( self.gmeClient ) {
            // initialize with gmeClient
            self.$scope.grid = {};

            // TODO: in destroy function WebGMEGlobal.State.off
            WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, self.stateActiveObjectChanged, self);

        } else {
            // initialize test with data

            onChange = function (item) {
                console.log('Item changed > ' + item.label, item);
            };

            attributes = [
                {
                    id: 'Name',
                    label: 'Name',
                    values: [
                        {
                            value: 'This is my name'
                        }
                    ],
                    onChange: onChange
                },
                {

                    id: 'compound',
                    label: 'Compound something',
                    cssClass: '',
                    values: [
                        {
                            value: [
                                {
                                    id: 'Position_x',
                                    label: 'X',
                                    values:[
                                        {
                                            value: 10
                                        }
                                    ]
                                    //valueWidget: integerValueWidget,
                                },
                                {
                                    id: 'Position_y',
                                    label: 'Y',
                                    values: [
                                        {
                                            value: 30
                                        }
                                    ]
                                    //valueWidget: integerValueWidget,
                                },
                                {
                                    id: 'Dabrack',
                                    label: 'Dabrack',
                                    values: [
                                        {
                                            value: 'This is my name'
                                        }
                                    ],
                                    onChange: onChange
                                }
                            ],
                            getDisplayValue: function ( value ) {
                                var coordinates = value.value;

                                return coordinates[0].values[0].value + ', ' + coordinates[1].values[0].value;
                            },
                            widget: {
                                type: 'compound'
                            }
                        }
                    ],
                    onChange: onChange
                },
                {
                    id: 'is_happy',
                    label: 'Happy or not?',
                    values: [
                        { value: true }
                    ]
                },
                {
                    id: 'is_rich',
                    label: 'Rich or not?',
                    values: [
                        { value: false }
                    ]
                },
                {
                    id: 'country',
                    label: 'Country',
                    values: [
                        {
                            value: 'usa',
                            widget: {
                                type: 'select',
                                defaultValue: 'pol',
                                config: {
                                    multi: false,
                                    options: [
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
                                }
                            }

                        }
                    ],
                    onChange: onChange
                }
            ];
            visualizationProperties = [
                {
                    id: 'color',
                    label: 'Color',
                    values: [
                        {
                            value: '#ff0066',
                            widget: {
                                type: 'colorPicker'
                            }
                        }
                    ],
                    onChange: onChange
                },

                {

                    id: 'Position',
                    label: 'Position',
                    cssClass: '',
                    values: [

                        {
                            id: 'Position_x',
                            label: 'X',
                            value: 10
                            //valueWidget: integerValueWidget,
                        },
                        {
                            id: 'Position_y',
                            label: 'Y',
                            value: 30
                            //valueWidget: integerValueWidget,
                        }
                    ],
                    onChange: onChange
                }

            ];


            propertyGroup1 = {
                label: 'Attributes',
                expanded: true,
                items: attributes
            };
            propertyGroup2 = {
                label: 'Visualization properties',
                expanded: true,
                items: visualizationProperties
            };
            propertyGroups = [ propertyGroup1, propertyGroup2 ];

            self.$scope.grid = {
                propertyGroups: propertyGroups,
                config: self.config,
                id: 'propertyGrid1'
            };
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

            self.$scope.grid = {};
        }

        self.currentObjectId = activeObjectId;

        if (self.currentObjectId || self.currentObjectId === CONSTANTS.PROJECT_ROOT_ID) {

            pattern = {};
            pattern[self.currentObjectId] = { "children": 0 };

            self.territoryId = self.gmeClient.addUI(self, function (events) {
                var event;

                if (events.length === 0) {
                    return;
                }

                event = events[0];

                if (event.etype === 'load' || event.etype === 'update') {
                    self.updateProperties(event.eid);

                } else if (event.etype === 'unload') {
                    self.$scope.grid = {};

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

    PropertyGridController.prototype.updateProperties = function (nodeId) {
        var self = this,
            nodeObj = self.gmeClient.getNode(nodeId),
            i,

            attributes,
            attributeNames,
            registry,
            registryNames,
            pointers,
            pointerNames,

            propertyGroupGeneral,
            propertyGroupAttributes,
            propertyGroupRegistry,
            propertyGroupPointers,

            propertyGroups,

            onChange;

        onChange = function () {
            self.logger.warning('TODO: handle property change event: ' + JSON.stringify(arguments));
        };


        // general properties
        propertyGroupGeneral = {
            label   : 'General',
            expanded: true,
            items   : []
        };

        // TODO: this is read-only
        propertyGroupGeneral.items.push(
            self.createPropertyEntry(
                'GUID',
                nodeObj.getGuid()
            )
        );

        // TODO: this should be a link, when we copy the value
        propertyGroupGeneral.items.push(
            self.createPropertyEntry(
                'ID',
                nodeObj.getId()
            )
        );


        // attributes
        propertyGroupAttributes = {
            label   : 'Attributes',
            expanded: true,
            items   : []
        };

        attributeNames = nodeObj.getAttributeNames();

        attributeNames.sort(function (a, b) {
            return a.toLowerCase().localeCompare(b.toLowerCase());
        });

        for (i = 0; i < attributeNames.length; i += 1) {
            // TODO: handle types and complex values

            propertyGroupAttributes.items.push(
                self.createPropertyEntry(
                    attributeNames[i],
                    nodeObj.getAttribute( attributeNames[i] )
                )
            );
        }

        // pointers
        propertyGroupPointers = {
            label   : 'Pointers',
            expended: false,
            items   : []
        };

        pointerNames = nodeObj.getPointerNames();

        pointerNames.sort(function (a, b) {
            return a.toLowerCase().localeCompare(b.toLowerCase());
        });

        for (i = 0; i < pointerNames.length; i += 1) {
            // TODO: handle types and complex values
            propertyGroupPointers.items.push(
                self.createPropertyEntry(
                    pointerNames[i],
                    nodeObj.getPointer( pointerNames[i] )
                )
            );
        }

        // registry
        propertyGroupRegistry = {
            label   : 'Registry',
            expended: false,
            items   : []
        };

        registryNames = nodeObj.getRegistryNames();

        registryNames.sort(function (a, b) {
            return a.toLowerCase().localeCompare(b.toLowerCase());
        });

        for (i = 0; i < registryNames.length; i += 1) {
            // TODO: handle types and complex values
            propertyGroupRegistry.items.push(
                self.createPropertyEntry(
                    registryNames[i],
                    nodeObj.getRegistry(registryNames[i])
                )
            );
        }


        propertyGroups = [
            propertyGroupGeneral,
            propertyGroupAttributes,
            propertyGroupPointers,
            propertyGroupRegistry
        ];

        self.$scope.grid = {
            propertyGroups: propertyGroups,
            config: self.config,
            id: self.guid
        };

        self.update();
    };

    PropertyGridController.prototype.createPropertyEntry = function (name, value) {
        var self = this,
            type = typeof value,
            typeString,
            i,
            property = {
                id: name,
                label: name,
                values: []
            },
            key,
            compound = {
                value: [],
                widget: {
                    type: 'compound'
                },
                getDisplayValue: function ( value ) {
                    // TODO: implement this function properly
                    return '';
                }
            };

        if (type === 'object') {
            // Note: toString is really slow
            typeString = ({}).toString.call(value);

            if (typeString === '[object Object]') {
                for ( key in value ) {
                    if ( value.hasOwnProperty( key ) ) {
                        compound.value.push( self.createPropertyEntry( key, value[key] ) );
                    }
                }

                property.values.push( compound );

            } else if (typeString === '[object Array]') {

                for (i = 0; i < value.length; i += 1) {
                    compound.value.push( self.createPropertyEntry( i, value[i] ) );
                }

                property.values.push( compound );

            } else {
                self.logger.error('Type is not supported: "' + typeString + '" value: ' + JSON.stringify(value));
            }

        } else if (type === 'string' || type === 'boolean' || type === 'number') {
            property.values.push({value: value});

        } else {
            self.logger.error('Type is not supported: "' + type + '" value: ' + JSON.stringify(value));
        }

        return property;
    };

    return PropertyGridController;
}
);