(function(window, angular, undefined) {
    "use strict";

    angular.module("mgApp").directive("mgscroll", function() {
        return {
            replace: true,
            restrict: 'E',
            transclude: true,
            templateUrl: "views/MGScroll.html",
            link: function($scope, element, attr) {
                // return; // for native scrolling
                var scroller = null;

                setTimeout(function() {
                    var lastTarget;
                    scroller = new IScroll(element[0], {
                        mouseWheel: true,
                        hScroll: false,
                        preventGhostClick: true,
                        ghostClickTimeout: 500,

                        onBeforeScrollStart: function (e) {
                            var target = e.target;
                            // console.log('mgscroll ' + target.tagName);

                            var i = 0;

                            while (target.nodeType != 1) {
                                target = target.parentNode;
                                // console.log('mgscroll ' + i + ' ' + target.tagName);
                                i++;
                            }

                            if (target.tagName != 'SELECT'
                                && target.tagName != 'INPUT'
                                && target.tagName != 'TEXTAREA'
                                && target.tagName != 'OPTION') {
                                // console.log('mgscroll if ' + target.tagName);
                                e.preventDefault();
                                if (lastTarget) {
                                    lastTarget.blur();
                                    lastTarget = null;
                                }
                            }
                            else {
                                // console.log('mgscroll else ' + target.tagName);
                                lastTarget = target;
                            }
                            // console.log('---');
                        }
                        // useTransform: false
                    });
                    element[0].addEventListener('touchmove', function (e) { e.preventDefault(); }, false);
                }, 100);

                $scope.refresh = function() {
                    setTimeout(function() {
                        scroller.refresh();
                    }, 0);
                };

                $scope.$watch(function() {
                    if(scroller) {
                        scroller.refresh();
                    }
                });

            }
        };
    });

})(window, window.angular);
