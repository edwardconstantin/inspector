(function(window, angular, undefined) {

    angular.module("mgApp").factory("logger", function() {

        function log() {



            console.log.apply(console, arguments);
        }

        return {
            log: log
        };
    });

})(window, window.angular);