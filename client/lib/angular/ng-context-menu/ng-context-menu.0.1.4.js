/**
 * ng-context-menu - v0.1.4 - An AngularJS directive to display a context menu when a right-click event is triggered
 *
 * @author Ian Kennington Walter (http://ianvonwalter.com)
 */
angular
  .module('ng-context-menu', [])
  .factory('ContextMenuService', function() {
    return {
      element: null,
      menuElement: null
    };
  })
  .directive('contextMenu', ['$document', 'ContextMenuService', '$window', function($document, ContextMenuService, $window) {
    return {
      restrict: 'A',
      scope: {
        'callback': '&contextMenu',
        'disabled': '&contextMenuDisabled'
      },
      link: function($scope, $element, $attrs) {
        var opened = false;

        function open(event, menuElement) {
          menuElement.addClass('open');

          var doc = $document[0].documentElement;
          var docLeft = (window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0),
            docTop = (window.pageYOffset || doc.scrollTop)  - (doc.clientTop || 0),
            elementHeight = menuElement[0].scrollHeight;
          var docHeight = doc.clientHeight + docTop,
            totalHeight = elementHeight + event.pageY,
            top = Math.max(event.pageY - docTop, 0);

          if (totalHeight > docHeight) {
            top = top - (totalHeight - docHeight);
          }

          menuElement.css('top', top + 'px');
          menuElement.css('left', Math.max(event.pageX - docLeft, 0) + 'px');
          opened = true;
        }

        function close(menuElement) {
          menuElement.removeClass('open');
          opened = false;
        }

        $element.bind('contextmenu', function(event) {
          if (!$scope.disabled()) {
            if (ContextMenuService.menuElement !== null) {
              close(ContextMenuService.menuElement);
            }
            ContextMenuService.menuElement = angular.element(document.getElementById($attrs.target));
            ContextMenuService.element = event.target;
            //console.log('set', ContextMenuService.element);

            event.preventDefault();
            event.stopPropagation();
            $scope.$apply(function() {
              $scope.callback({ $event: event });
              open(event, ContextMenuService.menuElement);
            });
          }
        });

        function handleKeyUpEvent(event) {
          //console.log('keyup');
          if (!$scope.disabled() && opened && event.keyCode === 27) {
            $scope.$apply(function() {
              close(ContextMenuService.menuElement);
            });
          }
        }

        function handleMouseDownEvent(event) {
          if (!$scope.disabled() &&
            opened &&
            (event.button !== 2 || event.target !== ContextMenuService.element)) {
            $scope.$apply(function() {
              close(ContextMenuService.menuElement);
            });
          }
        }

        function handleClickEvent(event) {
          if (!$scope.disabled() &&
            opened &&
            (event.button !== 2 || event.target !== ContextMenuService.element)) {
            $scope.$apply(function() {
              close(ContextMenuService.menuElement);
            });
          }
        }

        function handleScrollEvent(event) {
          if (!$scope.disabled() && opened) {
            $scope.$apply(function() {
              close(ContextMenuService.menuElement);
            });
          }
        }

        function handleResizeEvent(event) {
          if (!$scope.disabled() && opened) {
            $scope.$apply(function() {
              close(ContextMenuService.menuElement);
            });
          }
        }

        function handleBlurEvent(event) {
          if (!$scope.disabled() && opened) {
            $scope.$apply(function() {
              close(ContextMenuService.menuElement);
            });
          }
        }

        $document.bind('keyup', handleKeyUpEvent);
        // Firefox treats a right-click as a click and a contextmenu event while other browsers
        // just treat it as a contextmenu event

        $document.bind('scroll', handleScrollEvent);

        var w = angular.element($window);

        w.bind('resize', handleResizeEvent);
        w.bind('blur', handleBlurEvent);

        $document.bind('click', handleClickEvent);
        $document.bind('mousedown', handleMouseDownEvent);
        $document.bind('contextmenu', handleMouseDownEvent);

        $scope.$on('$destroy', function() {
          //console.log('destroy');
          $document.unbind('keyup', handleKeyUpEvent);
          $document.unbind('click', handleClickEvent);
          $document.unbind('mousedown', handleMouseDownEvent);
          $document.unbind('contextmenu', handleMouseDownEvent);
          $document.unbind('scroll', handleScrollEvent);
          w.unbind('resize', handleResizeEvent);
          w.unbind('blur', handleBlurEvent);
        });
      }
    };
  }]);