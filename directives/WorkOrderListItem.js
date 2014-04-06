(function(window, angular, undefined) {
    'use strict';

    angular.module('mgApp').directive('workorderlistitem', function() {
        return {
            restrict: 'E',
            transclude: true,
            templateUrl: 'views/WorkOrderListItem.html',
            link: function ($scope, iElement, iAttrs, controller, workOrderManager) {

                $scope.selectWorkOrder = function () {

                    // Don't do anything if status is ABORT or COMPLETE
                    var status = $scope.workOrder.statusValue();
                    if (status == -1 || status == 5) return;

                    // If status is POSTPONE, resume
                    if (status == 4) {
                        this.workOrder.addStatus("ASSIGNED", {});
                    }

                    document.location.href = '#/USRN/' + $scope.workOrder.id;
                }
            }
        };
    });

})(window, window.angular);
