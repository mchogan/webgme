/*globals define, angular, alert*/

define([
  'angular',
  'text!./templates/hierarchicalMenu.html',
  'css!./styles/hierarchicalMenu.css'
], function (ng, template) {

  "use strict";

  angular.module(
      'isis.ui.hierarchicalMenu', []
    ).directive(
      'hierarchicalMenu', ['$document',
        function ($document) {

          return {
            scope: {
              menu: '=',
              config: '='
            },
            restrict: 'E',
            replace: true,
            template: template,

            link: function ($scope, element) {

              var whichSideToDropSubs,
                doc = $document[0].documentElement;

              whichSideToDropSubs = function () {

                var docLeft = ( window.pageXOffset || doc.scrollLeft ) - ( doc.clientLeft || 0 ),
                  width = element[0].scrollWidth,
                  positionX = element[0].getBoundingClientRect().right,
                  wouldBeWidth;

                wouldBeWidth = width * 2 + positionX;

                if (docLeft < wouldBeWidth) {
                  element.addClass('drop-left');
                } else {
                  element.removeClass('drop-left');
                }

              };

              whichSideToDropSubs();

              $scope.$watch(
                function () {
                  return element[0].scrollWidth;
                },

                function () {
                  whichSideToDropSubs();
                }
              );

            }
          };
        }]);


});
