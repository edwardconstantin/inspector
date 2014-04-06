(function(window, angular, undefined) {
    "use strict";

    angular.module("mgApp").directive("defectlist", function() {
        return {
            restrict: 'E',
            transclude: true,
            templateUrl: "views/DefectList.html",
            link: function ($scope, iElement, iAttrs, controller) {
            }
        };
    });

})(window, window.angular);
