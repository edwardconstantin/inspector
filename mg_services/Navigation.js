(function(window, angular, undefined) {

    angular.module("mgApp").factory("navigation", function($rootScope) {

        $rootScope.$on("$routeChangeSuccess", function(e, data) {
            localStorage.setItem("lastRoute", document.location.href);
        });

        function restore() {
            var lastRoute = localStorage.getItem("lastRoute");

            if(lastRoute && lastRoute !== document.location.href) {
                document.location.href = lastRoute;
            }
        }

        return {
            restore: restore
        };

    });

})(window, window.angular);