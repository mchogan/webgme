/*globals define, angular, alert*/

/**
 * @author lattmann / https://github.com/lattmann
 * @author nabana / https://github.com/nabana
 */

define([
    'angular'

], function(
    ng,
    template ){

    "use strict";

    angular.module(

        'isis.ui.directives',
        []

    ).directive('ngRightClick', function($parse) {

        return function ( scope, element, attrs ) {

            var fn = $parse(
                attrs.ngRightClick
            );

            element.bind(
                'contextmenu', function (
                        event
                    ) {
                    scope.$apply(
                        function (
                            ) {
                            event.preventDefault(
                            );
                            fn(
                                scope, {$event: event}
                            );
                        }
                    );
                }
            );
        };
                    }
    );


});