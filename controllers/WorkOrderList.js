(function(window, angular, undefined) {
    'use strict';

    angular.module('mgApp').controller('WorkOrderList', function ($scope, syncManager, workOrderManager, defectManager) {

        $scope.workOrders = workOrderManager.getWorkOrders();

        $scope.$on('WorkOrders.updated', function(e, workOrders) {

            $scope.$apply(function() {
                $scope.workOrders = workOrders;
            });
        });
    });

})(window, window.angular);

