/*globals define, angular, alert*/


define([
    'angular',
    'text!./templates/propertyGrid.html',
    'css!./styles/propertyGrid.css'

], function(
    ng,
    template ){

    "use strict";

    angular.module(
        'isis.ui.propertyGrid',
        [
        ]

    ).directive(
        'propertyGrid',
         function () {

             return {
                 scope: {
                     items: '=',
                     config: '='
                 },
                 restrict: 'E',
                 replace: true,
                 template: template

             };
    });


});