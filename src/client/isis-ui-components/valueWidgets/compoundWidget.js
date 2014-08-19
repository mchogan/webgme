/*globals define, angular, alert*/


define( [
  'angular',
  'text!./templates/stringWidget.html',
  'css!./styles/stringWidget.css'

], function ( ng, template ) {

  'use strict';

  angular.module(
      'isis.ui.compoundWidget',
      [
      ]

    ).directive(
    'compoundWidget',
    function () {

      return {
        restrict: 'E',
        replace: true,
        template: template,
        scope: {
          mode: '=',
          value: '='
        }

      };
    } );


} );