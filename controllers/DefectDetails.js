(function (window, angular) {
    'use strict';

    angular.module('mgApp')
        .controller('DefectDetails', function ($window, $scope, $routeParams, syncManager, workOrderManager, defectManager) {

            //_____________________{ $SCOPE VARIABLES }___________________________
            $scope.WONUM = $routeParams.WONUM;
            $scope.USRN = $routeParams.USRN;
            $scope.selectedOptionIndex = -1; // set to -1 for no default selection
            $scope.selectedDefectIndex = -1;
            $scope.selectDefect = false;
            $scope.defectHeader = false;
            $scope.defectManager = defectManager;
            $scope.numDefects = $scope.defectManager.getDefectType().totalDefects;
            $scope.Defects = $scope.defectManager.getDefectType().faults;
            $scope.selection = 1;

            var initScope = function (_defectObj) {
                $scope.defectObj = _defectObj;
                $scope.defectDetails = $scope.defectObj.data.defectDetails;
                $scope.faultData = $scope.defectObj.data.defectType;

                // set bg class based on mandatory defect
                if ($scope.faultData[0].choice === "Furniture, Vegetation and Structural") {
                    // console.log("Not mand", $scope);
                    $scope.required = true;
                } else {
                    $scope.required = false;
                }

                $scope.$broadcast('Defect.numDefects', $scope.defectDetails.numDefects);
            };

            if ($scope.defectManager.defectObj[0]) {
                initScope($scope.defectManager.defectObj[0]);
            }

            // $scope.required = false;

            $scope.$on("Defects.refresh", function (e, def) {
                if (!def.obj) {
                    document.location.href = "#/USRN/" + $scope.WONUM;
                }
                $scope.$apply(initScope(def.obj));
            });

            $scope.isCommentsFocused = false;


            function Dialog(data) {
                this.data = {};
                this.callback = null;
            }

            Dialog.prototype.open = function (cb) {
                this.opened = true; //opened is used in MGDialog (example)
                this.data = {};
                this.callback = cb;
                var abortDialog = $scope.abortDialog = this;
            };

            Dialog.prototype.close = function () {
                if (this.opened) {
                    this.callback = null;
                    this.opened = false;
                }
            };

            Dialog.prototype.closeCancel = function (cb) {
                // $scope.abortUSRN = true;
                if (this.opened) {
                    this.callback = cb;
                    this.opened = false;
                    if (!$rootScope.$$phase) {
                        $scope.$apply(function () {});
                    }
                }
            };

            Dialog.prototype.closeOk = function (cb) {
                if (this.opened) {
                    this.callback = cb;
                    this.opened = false;
                }
                $scope.workOrder = workOrderManager.getWorkOrder($scope.WONUM);
                $scope.usrn = $scope.workOrder.getUsrn($scope.USRN);
                $scope.usrn.deleteDefect($scope.defectObj.id);
                $scope.workOrder.save();
                $scope.defectObj.delete();
                document.location.href = "#/USRN/" + $scope.WONUM;
            };

            Dialog.prototype.done = function () {
                var self = this;

                if (this.opened) {
                    var callback = this.callback,
                        data = this.data;

                    if (callback) {
                        setTimeout(function () {
                            if (self.callback(self.data) !== false) {
                                self.close();
                            }
                        }, 0);
                    } else {
                        self.close();
                    }
                }
            };

            var validationDialog = $scope.validationDialog = new Dialog();
            var abortDialog = $scope.abortDialog = new Dialog();

            $scope.enableComplete = function () {
                document.location.href = "#/RaiseDefect/" + $scope.WONUM + "/" + $scope.USRN;
            };

            // grab img capture logic from service
            $scope.takeAnotherPhoto = function () {
                setTimeout(function () {
                    $scope.defectObj.takeDefectPhoto(function (err) {
                        if (err && err != 'UserCancelled') {
                            console.error('Error taking photo or saving photo: %s', err);
                            alert("Error taking photo or saving photo: " + err);
                        }
                    });
                }, 500);
            };


            $scope.updateStatus = function () {
                if ($scope.faultData[0].choice === "Furniture, Vegetation and Structural" ||
                    $scope.faultData[1].choice === "Ironwork and covers - missing or broken" ||
                    $scope.faultData[1].choice === "Displaced road studs, cat eyes and debris" ||
                    $scope.faultData[1].choice === "Regulatory lines - excessive wear") {
                    console.log("DISABLE INPUTS", $scope.faultData[0].choice);
                    var details = $scope.defectDetails;

                    //TODO - this needs to be revised I think. (Eoin 23/10/13)
                    if ($scope.required === true) {
                        details.depth = 0;
                        details.len = 0;
                        details.width = 0;
                    }

                    $scope.defectObj.save();
                    $scope.enableComplete();
                } else {
                    // message to user
                    validationDialog.open(function () {});

                    console.log("ENABLE INPUTS", $scope.faultData[0].choice);

                    //watch for changes in the data model, redirect if all values set
                    $scope.$watch('data', function () {
                        var details = $scope.defectDetails;
                        if (details.depth > 0 && details.len > 0 && details.width > 0 && details.numDefects >= 1) {
                            // enable complete btn if model data set.
                            $scope.defectObj.save();
                            // console.log("Watcg data", $scope.data);
                            $scope.enableComplete();
                        }
                    }, true);
                }
            };

            $scope.abort = function () {
                abortDialog.open(function () {});
                // document.location.href = "#/USRN/" + $scope.WONUM;
            };

            // -REMOVE- testing data capture
            $scope.test = function () {
                console.log($scope.data);
            };

            // capture defect heading
            $scope.defectSelection = function () {
                $scope.selectDefect = true;
                this.toggleContent();
            };

            // capture option selected
            $scope.optionSelection = function (optionIndex, value, name) {
                // remove default selection on input
                $scope.numDefects.options[0].selected = false;
                $scope.selection = value;
                $scope.defectDetails.numDefects = value;

                this.selectedHeader(); // apply selected class
                this.applySelectedOption(optionIndex, name);
            };

            // set $scope watcher for change in model data
            // compute cluster value on submitted data
            $scope.$watch('defectDetails', function () {
                if ($scope.defectDetails) {
                    var vol = $scope.defectDetails.len * $scope.defectDetails.depth * $scope.defectDetails.width;
                    $scope.defectDetails.clusterTotal = vol * $scope.defectDetails.numDefects;
                    console.log("clusterTotal", $scope.defectDetails.clusterTotal);
                }
            }, true);

            //___________________________________________________
            $scope.workOrder = workOrderManager.getWorkOrder($scope.WONUM);
            $scope.$on("WorkOrders.updated", function (e, workOrders) {
                $scope.$apply(function () {
                    $scope.workOrder = workOrderManager.getWorkOrder($scope.WONUM);
                });
            });

            $scope.populatePrevSelection = function () {
                var currentDefect = localStorage.getItem('progressDefectId');
                console.log("populatePrevSelection", currentDefect);
            };

            $scope.$on("Evt.backbutton", function (e) {
                if ($scope.abortDialog.opened) {
                    $scope.abortDialog.closeCancel();
                } else {
                    $scope.goBack();
                }
            });

            // cb to detect use of back btn from details
            // var goBackFlag = function () {
            //     return true;
            // };
            $scope.goBack = function () {
                $window.goBackFlag = true;
                $window.history.back();
            };
        });
})(window, window.angular);
