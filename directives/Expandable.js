(function(window, angular, undefined) {
    "use strict";

    angular.module("mgApp").directive("expandable", function($timeout) {
        return {
            restrict: 'E',
            replace: true,
            transclude: true,
            scope: {
                title: "@"
            },
            templateUrl: "views/Expandable.html",
            controller: function($scope) {
                $scope.expanded = false;
            }
        };
    });

})(window, window.angular);
