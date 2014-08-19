/*globals define, angular, alert*/


define( [
  'angular',
  'text!./templates/propertyValue.html',
  'css!./styles/propertyValue.css',

  '../valueWidgets/valueWidgets'

], function ( ng, defaultTemplate ) {

  'use strict';

  angular.module(
      'isis.ui.propertyValue',
      [
        'isis.ui.valueWidgets'
      ]

    ).directive(
    'propertyValue',
    ['$log', '$compile', '$valueWidgets',
    function ($log, $compile, $valueWidgets) {

      return {
        restrict: 'E',
        replace: true,

        compile: function($elm, $attrs) {
          return {
            pre: function ($scope, $elm, $attrs, controllers) {

              var template = angular.element(defaultTemplate ),
                widgetType,
                widgetElement;

              $elm.append($compile(template)($scope));

              if (angular.isObject($scope.value) && angular.isObject($scope.value.widget)) {
                widgetType = $scope.value.widget.type;
              }

              widgetElement = $valueWidgets.getWidgetElementForType(widgetType);

              $log.log(widgetElement);

            },
            post: function($scope, $elm, $attrs) {


            }
          };
        }


      };
    }] );


} );