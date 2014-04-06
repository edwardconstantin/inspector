(function(window, angular, undefined) {
    "use strict";

    angular.module("mgApp").directive("riskassess", function() {
        return {
            restrict: 'E',
            transclude: true,
            replace: true,
            scope: {
                yes: "&",
                no: "&"
            },
            templateUrl: "views/RiskAssessment.html"
        };
    });

})(window, window.angular);
