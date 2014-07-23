/*globals define, angular, alert*/

/**
 * @author lattmann / https://github.com/lattmann
 * @author nabana / https://github.com/nabana
 */

define([
    'angular',
    'text!./templates/TreeNavigator.html',
    'css!./styles/treeNavigator.css',

    './../HierarchicalDropDown/HierarchicalDropdown',
    './../Directives',
    'ng-context-menu'

], function(
    ng,
    template ){

    "use strict";

    angular.module(
        'isis.ui.treeNavigator',
        [
            'isis.ui.hierarchicalDropdown',
            'isis.ui.directives',
            'ng-context-menu'
        ]

    ).directive(
        'treeNavigator',
         function () {

             return {
                 scope: {
                     treeData: '=',
                     config: '=',
                     contextMenuData: '='
                 },
                 restrict: 'E',
                 replace: true,
                 template: template

             };
    });


});