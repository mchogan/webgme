/*globals define, angular, alert*/


define( [
  'angular',

  './stringWidget',
  './compoundWidget'

], function ( ng ) {

  'use strict';

  var availableWidgets = {
    'string': 'string-widget',
    'compound': 'compound-widget'
  };

  angular.module(
      'isis.ui.valueWidgets',
      [
        'isis.ui.stringWidget',
        'isis.ui.compoundWidget'
      ]

    ).factory('$valueWidgets', function() {
      var getWidgetElementForType;

      getWidgetElementForType = function( type ) {

        var result = availableWidgets[ type ];
        
        if (!result) {
          result = 'string-widget';
        }
        
        return result;

      };

      return {
        getWidgetElementForType: getWidgetElementForType
      };
    });


} );