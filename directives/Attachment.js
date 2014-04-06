(function(window, angular, undefined) {
    "use strict";

    angular.module("mgApp").directive("attachment", function($timeout) {
        return {
            restrict: 'E',
            replace: true,
            transclude: true,
            scope: {
                attachment: "=data"
            },
            templateUrl: "views/Attachment.html",
            controller: function($scope) {

            }
        };
    });

})(window, window.angular);
