(function(window, angular, undefined) {
    "use strict";


    angular.module("mgApp").directive("usrnsummary", function() {
        return {
            restrict: 'E',
            transclude: true,
            templateUrl: "views/USRNSummaryItem.html",
            replace: true
        };
    });
}(window, window.angular));