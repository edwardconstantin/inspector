(function (window, angular, undefined) {
    "use strict";

    angular.module("mgApp").directive("mgheader", function (network) {
        return {
            restrict: 'E',
            transclude: true,
            scope: {
                title: "@title"
            },
            templateUrl: "views/MGHeader.html",
            controller: function ($scope, attachments, workOrderManager) {

                $scope.syncStatus = "none";

                function updateSyncStatus(status) {
                    var workOrderStatus = workOrderManager.getStatus(),
                        attachmentStatus = attachments.getStatus();

                    if (workOrderStatus === attachments.WAITING || attachmentStatus == attachments.WAITING) {
                        $scope.syncStatus = "waiting";
                    } else if (workOrderStatus === attachments.SYNCING || attachmentStatus == attachments.SYNCING) {
                        $scope.syncStatus = "syncing";
                    } else {
                        $scope.syncStatus = "none";
                    }
                }

                function updateNetworkStatus() {
                    var status = navigator.connection.type;
                    if (status === Connection.UNKNOWN || status === Connection.NONE) {
                        console.log("no network");
                        $scope.syncStatus = "failed";
                    } else {
                        updateSyncStatus(attachments.getStatus());
                    }
                }
                updateNetworkStatus();

                $scope.$on("Network.changed", function (e, status) {
                    //console.log("network changed event");
                    $scope.$apply(updateNetworkStatus);
                });

                $scope.$on("SyncManager.statusChange", function (e, status) {
                    //console.log("workorder status changed event");
                    $scope.$apply(updateNetworkStatus);
                });

                $scope.$on("Attachments.statusChange", function (e, status) {
                    $scope.$apply(updateNetworkStatus);
                });

            }
        };
    });

})(window, window.angular);