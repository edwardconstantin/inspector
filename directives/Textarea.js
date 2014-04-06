(function(window, angular, undefined) {
    "use strict";

    angular.module("mgApp").directive("textarea", function($timeout) {
        return {
            restrict: 'E',
            link: function(scope, element, attributes) {

                element = element[0];

                function handler(e) {
                    var newHeight = element.scrollHeight;
                    var currentHeight = element.clientHeight;
                    if (newHeight > currentHeight) {
                        element.style.height = newHeight + 3 * textLineHeight + 'px';
                        // if iScroll is present, refresh since we altered the height
                        if (typeof scope.refresh === "function") {
                            scope.refresh();
                        }
                    }
                }

                function blurHandler(e) {
                    // if iScroll is present, refresh since we altered the height
                    if (typeof scope.refresh === "function") {
                        setTimeout(function() {
                            scope.refresh();
                        }, 250);
                    }
                }

                var setLineHeight = 14;
                var textLineHeight = element.currentStyle ? element.currentStyle.lineHeight : getComputedStyle(element, null).lineHeight;

                textLineHeight = (textLineHeight.indexOf('px') == -1) ? setLineHeight : parseInt(textLineHeight, 10);

                element.style.overflow = 'hidden';
                element.addEventListener('input', handler, false);
                element.addEventListener('blur', blurHandler, false);
            }
        };
    });

})(window, window.angular);
