/*globals angular*/

/**
 * ng-context-menu - v0.2 - An AngularJS directive to display a context menu when a right-click event is triggered
 *
 * @author Ian Kennington Walter (http://ianvonwalter.com)
 * @author nabana / https://github.com/nabana*
 */

(function () {

    "use strict";

    angular
        .module(
            'ng-context-menu', []
        )
        .factory(
        'ContextMenuService', function () {
            return {
                element: null,
                menuElement: null
            };
        }
    )
        .directive(
            'contextMenu',
            ['$document', 'ContextMenuService', '$window', function ( $document, ContextMenuService, $window ) {
                return {
                    restrict: 'A',
                    scope: {
                        'callback': '&contextMenu',
                        'disabled': '&contextMenuDisabled'
                    },
                    link: function ( $scope, $element, $attrs ) {

                        var opened = false,
                            w = angular.element(
                                $window
                            ),
                            setPosition,
                            bindEvents,
                            unBindEvents,
                            open,
                            close,
                            handleKeyUpEvent,
                            handleMouseDownEvent,
                            handleClickEvent,
                            handleScrollEvent,
                            handleResizeEvent,
                            handleBlurEvent;

                        setPosition = function ( event, menuElement ) {

                            var doc = $document[0].documentElement,

                                docLeft = ( window.pageXOffset || doc.scrollLeft ) - ( doc.clientLeft || 0 ),
                                docTop = ( window.pageYOffset || doc.scrollTop ) - ( doc.clientTop || 0 ),

                                elementHeight = menuElement[0].scrollHeight,
                                elementWidth = menuElement[0].scrollWidth,

                                docHeight = doc.clientHeight + docTop,
                                docWidth = doc.clientWidth + docLeft,

                                totalHeight = elementHeight + event.pageY,
                                totalWidth = elementWidth + event.pageX,

                                strechOverPageWidth = totalWidth - docWidth,
                                strechOverPageHeight = totalHeight - docHeight,

                                top = Math.max(
                                    event.pageY - docTop, 0
                                ),

                                left = Math.max(
                                    event.pageX - docLeft, 0
                                );

                            console.log( elementHeight + ' ' + elementWidth );

                            if ( strechOverPageHeight > 0 ) {
                                top = top - strechOverPageHeight;
                            }

                            if ( strechOverPageWidth > 0 ) {
                                left = left - strechOverPageWidth;
                            }

                            menuElement.css(
                                'top', top + 'px'
                            );
                            menuElement.css(
                                'left', left + 'px'
                            );

                        };

                        open = function ( event, menuElement ) {

                            menuElement.addClass(
                                'open'
                            );

                            menuElement.show( function() {
                                setPosition( event, menuElement );
                            } );


                            bindEvents();

                            opened = true;
                        };

                        close = function ( menuElement ) {

                            unBindEvents();

                            menuElement.hide();

                            menuElement.removeClass(
                                'open'
                            );
                            opened = false;
                        };

                        handleKeyUpEvent = function ( event ) {

                            if ( !$scope.disabled(
                            ) && opened && event.keyCode === 27 ) {
                                $scope.$apply(
                                    function () {
                                        close(
                                            ContextMenuService.menuElement
                                        );
                                    }
                                );
                            }
                        };

                        handleMouseDownEvent = function ( event ) {

                            if ( !$scope.disabled() &&
                                opened &&
                                ContextMenuService.menuElement && !$.contains( ContextMenuService.menuElement[0],
                                                                               event.target ) ) {
                                $scope.$apply(
                                    function () {
                                        close(
                                            ContextMenuService.menuElement
                                        );
                                    }
                                );
                            }
                        };

                        handleClickEvent = function ( event ) {
                            if ( !$scope.disabled(
                            ) &&
                                opened &&
                                (event.button !== 2 || event.target !== ContextMenuService.element) ) {
                                $scope.$apply(
                                    function () {
                                        close(
                                            ContextMenuService.menuElement
                                        );
                                    }
                                );
                            }
                        };

                        handleScrollEvent = function ( event ) {
                            if ( !$scope.disabled(
                            ) && opened ) {
                                $scope.$apply(
                                    function () {
                                        close(
                                            ContextMenuService.menuElement
                                        );
                                    }
                                );
                            }
                        };

                        handleResizeEvent = function ( event ) {
                            if ( !$scope.disabled(
                            ) && opened ) {
                                $scope.$apply(
                                    function () {
                                        close(
                                            ContextMenuService.menuElement
                                        );
                                    }
                                );
                            }
                        };

                        handleBlurEvent = function ( event ) {
                            if ( !$scope.disabled(
                            ) && opened ) {
                                $scope.$apply(
                                    function () {
                                        close(
                                            ContextMenuService.menuElement
                                        );
                                    }
                                );
                            }
                        };


                        bindEvents = function () {
                            $document.bind(
                                'keyup', handleKeyUpEvent
                            );
                            // Firefox treats a right-click as a click and a contextmenu event while other browsers
                            // just treat it as a contextmenu event

                            $document.bind(
                                'scroll', handleScrollEvent
                            );

                            w.bind(
                                'resize', handleResizeEvent
                            );
                            w.bind(
                                'blur', handleBlurEvent
                            );

                            $document.bind(
                                'click', handleClickEvent
                            );
                            $document.bind(
                                'mousedown', handleMouseDownEvent
                            );
                            $document.bind(
                                'contextmenu', handleClickEvent
                            );

                        };

                        unBindEvents = function () {
                            $document.unbind(
                                'keyup', handleKeyUpEvent
                            );
                            $document.unbind(
                                'click', handleClickEvent
                            );
                            $document.unbind(
                                'mousedown', handleMouseDownEvent
                            );
                            $document.unbind(
                                'contextmenu', handleClickEvent
                            );
                            $document.unbind(
                                'scroll', handleScrollEvent
                            );
                            w.unbind(
                                'resize', handleResizeEvent
                            );
                            w.unbind(
                                'blur', handleBlurEvent
                            );
                        };

                        $element.bind(
                            'contextmenu', function ( event ) {
                                if ( !$scope.disabled() ) {

                                    if ( ContextMenuService.menuElement !== null ) {
                                        close(
                                            ContextMenuService.menuElement
                                        );
                                    }

                                    ContextMenuService.menuElement = angular.element(
                                        document.getElementById(
                                            $attrs.target
                                        )
                                    ).hide();



                                    ContextMenuService.element = event.target;


                                    event.preventDefault();
                                    event.stopPropagation();

                                    $scope.$apply(
                                        function () {
                                            $scope.callback(
                                                { $event: event }
                                            );
                                            open(
                                                event, ContextMenuService.menuElement
                                            );
                                        }
                                    );
                                }
                            }
                        );

                        $scope.$on(
                            '$destroy', function () {

                            }
                        );
                    }
                };
            }]
        );
})();