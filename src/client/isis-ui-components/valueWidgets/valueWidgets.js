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

    ).factory( '$valueWidgets', function () {
      var getWidgetElementForType;

      getWidgetElementForType = function ( type ) {

        var result = availableWidgets[ type ];

        if ( !result ) {
          result = 'string-widget';
        }

        return result;

      };

      return {
        getWidgetElementForType: getWidgetElementForType
      };
    } )
    .directive( 'valueWidget',
      [ '$log', '$compile', '$valueWidgets',
        function ( $log, $compile, $valueWidgets ) {

          return {
            restrict: 'E',
            replace: true,
            scope: {
              mode: '=',
              value: '='
            },

            compile: function ( $elm, $attrs ) {
              return {
                pre: function ( $scope, $elm, $attrs, controllers ) {

                  if (!$scope.mode) {
                    $scope.mode = 'edit';
                  }

                },
                post: function ( $scope, $elm, $attrs ) {

                  var
                    templateStr,
                    template,
                    widgetType,
                    widgetElement;

                  if ( angular.isObject( $scope.value ) && angular.isObject( $scope.value.widget ) ) {
                    widgetType = $scope.value.widget.type;
                  }

                  widgetElement = $valueWidgets.getWidgetElementForType( widgetType );

                  templateStr = '<' + widgetElement + ' value="value" mode="mode">' + '</' + widgetElement + '>';

                  $log.log(templateStr);

                  template = angular.element(templateStr);

                  $elm.append( $compile( template )( $scope ) );

                }
              };
            }
          };

        }] );


} );