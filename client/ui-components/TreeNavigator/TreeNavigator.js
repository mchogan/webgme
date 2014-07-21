/*globals define, angular, alert*/

/**
 * @author lattmann / https://github.com/lattmann
 * @author nabana / https://github.com/nabana
 */

define([
    'angular',
    'text!./templates/TreeNavigator.html',
    'css!./styles/treeNavigator.css'
], function(
    ng,
    template ){

    "use strict";

    angular.module(
        'isis.ui.treeNavigator', []
    ).directive(
        'treeNavigator',
         function () {

             return {
                 scope: { treeData: '=' },
                 restrict: 'E',
                 replace: true,
                 template: template

             };
    });


});