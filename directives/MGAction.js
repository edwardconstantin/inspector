(function(window, angular, undefined) {
    "use strict";

    angular.module("mgApp").directive("mgaction", function() {
        return {
            restrict: 'E',
            transclude: true,
            replace: true,
            scope: {
                message: "@",
                ok: "&",
                func: "@ok",
                icon: "@",
                dest: "@",
                btnText: "@",
                tel: "@"
            },
            templateUrl: "views/MGAction.html"
        };
    });

})(window, window.angular);
