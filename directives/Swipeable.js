(function(window, angular, undefined) {
    "use strict";

    angular.module("mgApp").directive("swipeable", function($timeout) {
        return {
            restrict: 'A',
            link: function(scope, element, attrs) {

                var hammer = Hammer(element[0]);

                hammer.on("swipeleft", function() {
                    if(attrs.swipeLeft) {
                        document.location.href = attrs.swipeLeft;
                    }
                });

                hammer.on("swiperight", function() {
                    if(attrs.swipeRight) {
                        document.location.href = attrs.swipeRight;
                    }
                });
            }
        };
    });

})(window, window.angular);
