(function(window, angular, undefined) {
    "use strict";

    angular.module("mgApp").directive("mgdialog", function($timeout) {
        return {
            restrict: 'E',
            replace: true,
            transclude: 'element',
            scope: {
                title: "@",
                headerClass: "@",
                control: "="
            },
            templateUrl: "views/MGDialog.html"
        };
    });

})(window, window.angular);
