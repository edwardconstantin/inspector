'use strict';

angular.module('mgApp')
    .controller('USRN', function ($window, $rootScope, $scope, $routeParams, $location, $timeout, syncManager, workOrderManager, defectManager) {


        //$scope.workOrders = workOrderManager.getWorkOrders();
    // console.debug("USRN CTRL", $scope);

        $scope.defectManager = defectManager;

        function Dialog(data) {
            this.data = {};
            this.callback = null;
        }

        Dialog.prototype.open = function (cb) {
            this.opened = true; //opened is used in MGDialog (example)
            this.data = {};
            this.callback = cb;
        };
        Dialog.prototype.close = function () {
            if (this.opened) {
                this.callback = null;
                this.opened = false;
            }
        };

        Dialog.prototype.done = function () {
            var self = this;

            if (this.opened) {
                var callback = this.callback,
                    data = this.data;

                if (callback) {
                    $timeout(function () {
                        if (self.callback(self.data) !== false) {
                            self.close();
                        }
                    }, 0);
                } else {
                    self.close();
                }
            }
        };

        var id = $routeParams.WONUM,
            workOrder = null,
            // sort = "usrn",
            abortDialog = $scope.abortDialog = new Dialog(),
            noDefectDialog = $scope.noDefectDialog = new Dialog(),
            notCompleteDialog = $scope.notCompleteDialog = new Dialog(),
            usrnCompleteNotesDialog = $scope.usrnCompleteNotesDialog = new Dialog(),
            usrnResumeDialog = $scope.usrnResumeDialog = new Dialog(),
            abortDialogIsCollapsed = false;

        abortDialog.toggleCollapse = function () {
            abortDialogIsCollapsed = !abortDialogIsCollapsed;
        };

        workOrder = $scope.workOrder = workOrderManager.getWorkOrder(id);

        if (workOrder && workOrder.data) {
            // TODO: DON'T USE HARD CODED USRNS!
            // bgbg
            // workOrder.data.usrns = HARD_CODED_USRNS;
        }


        $scope.$on("WorkOrders.updated", function (e, workOrders, workOrderMap) {

            $scope.$apply(function () {
                $scope.workOrder = workOrder = workOrderMap[id];

                // TODO: DON'T USE HARD CODED USRNS!
                // bg
                // workOrder.data.usrns = HARD_CODED_USRNS;
            });

        });

        // sort USRNs by alpha / maximo
        var sort = "usrnLocation";
        $scope.sort = sort;
        $scope.toggleSort = function (sort) {
            // console.log("sort");
            $scope.sort = $scope.sort === "usrnLocation" ? "usrn" : "usrnLocation";
        };

        $scope.onAbort = function () {

            $scope.abortDialog.open(function (result) {
                if (result.cancel) {
                    return;
                } else {
                    $scope.updateStatus("ABORT", {
                        reason: result
                    }, function () {
                        document.location.href = "#/WorkOrderList";
                    });
                }
            });
        };

        $scope.onAbortOk = function (reason) {
            if (!reason) {
                alert('Please select an option');
            } else {
                $scope.abortDialog.done();
            }
        };

        $scope.updateStatus = function (status, data, cb) {
            if (!data) {
                data = {};
            }
            workOrder.addStatus(status);
            if (cb) cb();
        };

        $scope.dectivateAll = function () {
            for (var i = 0; i < workOrder.usrns.length; i++) {
                workOrder.usrns[i].active = false;
            }
        };

        $scope.onPostpone = function () {
            $scope.updateStatus("POSTPONE", {}, function () {
                document.location.href = "#/WorkOrderList";
            });
        };

        $scope.onComplete = function () {
            var i, status, usrns = workOrder.data.usrns,
                l = usrns.length,
                valid = true;
            for (i = 0; i < l; i += 1) {
                status = usrns[i].status;
                if (status != "ABORT" && status != "COMPLETE") {
                    valid = false;
                    break;
                }
            }

            if (valid) {
                $scope.updateStatus("COMPLETE", {}, function () {
                    document.location.href = "#/WorkOrderList";
                });
            } else {
                notCompleteDialog.open(function () {});
            }
        };

        $scope.$on("Evt.backbutton", function (e) {
            $scope.goBack();
        });

        $scope.goBack = function () {
            document.location.href = "#/WorkOrderList";
        };
    });
