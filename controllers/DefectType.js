(function (window, angular) {
    'use strict';

    angular.module("mgApp")
        .controller('DefectType', function ($window, $timeout, $rootScope, $scope, $routeParams, $location, syncManager, workOrderManager, defectManager) {

            $scope.abortDefect = false;
            var noop = function () {};

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

            Dialog.prototype.close = function (cb) {
                if (this.opened) {
                    this.callback = cb;
                    this.opened = false;
                }
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

            //_____________________{ $SCOPE VARIABLES }___________________________

            $rootScope.WONUM = $routeParams.WONUM;
            $rootScope.USRN = $routeParams.USRN;

            $scope.defectManager = defectManager;
            $scope.selectedOptionIndex = -1; // set to -1 for no default selection
            $scope.selectedDefectIndex = -1;
            $scope.selectedPriorityIndex = -1;
            $scope.selectedFilterOption = -1;
            $scope.repairs = -1;
            $scope.dropDown = -1;
            $scope.selectDefect = false;
            $scope.showForBtn = false;
            $scope.abortDefect = false;

            $scope.defects = defectManager.getDefectType();
            $scope.faultData = $scope.defects.faultData;

            $scope.defectObj = [];


            if ($scope.defectManager.defectObj[0]) {
                $scope.defectObj = $scope.defectManager.defectObj[0];
            }



            $scope.$on("Defects.refresh", function (e, def) {
                if (!def.obj) {
                    document.location.href = "#/USRN/" + $scope.WONUM;
                }
                $scope.defectObj = def.obj;

                $scope.$broadcast("DefectType.refresh", $scope.defectObj);
            });

            $scope.faultData[3].choice = "30";
            $scope.faultData[4].choice = "Standard Chapter 8";

            var validationDialog = $scope.validationDialog = new Dialog();
            var notCompleteDialog = $scope.notCompleteDialog = new Dialog();
            var noDataDialog = $scope.noDataDialog = new Dialog();
            var abortDialog = $scope.abortDialog = new Dialog();


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

            $scope.notComplete = function () {
                var item = $scope.faultData[$scope.defectIndex];
                if ($scope.defectIndex <= 2) {
                    console.log("notComplete!!!");
                    notCompleteDialog.open(function () {});
                }
            };

            $scope.abort = function () {
                abortDialog.open(function () {});

                // if ($scope.abortDefect === true) {
                //     console.log("Hello");

                //     document.location.href = "#/USRN/" + $scope.WONUM;

                // }
                // document.location.href = "#/USRN/" + $scope.WONUM;
            };

            $scope.isComplete = function (index) {
                var item = $scope.faultData[index];
                console.log("isComplete");
                if (item.choice !== 0) {
                    return true;
                } else {
                    return false;
                }
            };

            // capture defect heading
            $scope.defectSelection = function (defectIndex, name) {
                $scope.defectIndex = defectIndex;
                $scope.selectDefect = true;

                if (defectIndex > 0) {
                    if ($scope.isComplete(defectIndex - 1) && !$scope.isComplete(defectIndex)) {
                        this.toggleContent();
                        if ($scope.isComplete(defectIndex <= 2)) {
                            console.log("notComplete!!!");
                            notCompleteDialog.open(function () {});
                        }
                    } else {
                        validationDialog.open(function () {});
                    }
                } else {
                    this.toggleContent();
                }
            };

            // capture option selected
            $scope.optionSelection = function (optionIndex, value, name) {
                console.log('optionSelec');
                var i; // loop ctrl
                var arrLength = $scope.defects.faultData.length;
                $scope.selection = value;

                // remove default value
                if (name === "Road Speed") {
                    $scope.defects.faults[3].options[1].selected = false;
                }

                if (name === "Traffic Management") {
                    $scope.defects.faults[4].options[0].selected = false;
                }

                //_______ Assign obj prop on user select __________
                for (i = 0; i < arrLength; i++) {
                    if (name === $scope.faultData[1].title) {

                        $scope.faultData[1].choice = value;
                        $scope.faultData[1].selectedIdx = optionIndex;

                        // console.log($scope.myArray[$scope.$index]);
                    } else if (name === $scope.faultData[i].title) {
                        $scope.faultData[i].choice = value;
                        $scope.faultData[i].selectedIdx = optionIndex;
                    }
                }
                //_________________________________________________

                this.selectedHeader(); // apply selected class
                this.applySelectedOption(optionIndex, name);
                this.filterDefects(optionIndex);
            };


            $scope.optionBoolean = function (optionIndex, name, value) {
                // console.log(name);
                // check value pass and store string

                if (value === "yes") {
                    $scope.faultData[1].repairs = value;
                } else {
                    value = "no";
                    $scope.faultData[1].repairs = value;
                }
                this.repairsOption(optionIndex);
                console.log("Yes/No", $scope.faultData[1].repairs);
            };

            // Priority dropdown menu
            $scope.optionDropDown = function () {
                this.toggleContentLevel2();
            };

            // Priority dropDown option selection
            $scope.prioritySelection = function (optionIndex) {
                // debugger;
                var name = $scope.defects.faults[2].options[4].states[optionIndex];
                console.log("priorityOption", optionIndex, name);
                $scope.faultData[2].choice = name;
                $scope.selection = name;
                this.applyPriorityOption(optionIndex);
                this.selectedHeader(); // apply selected class
            };



            $scope.selectedDefect = function (optionIndex) {

                if ($scope.defects.faults[optionIndex]) {
                    var defectTypeArr = $scope.defects.faults[1].options[1].defectType[optionIndex];

                    // Pass filtered fault type options to scope.
                    $scope.myArray = defectTypeArr;
                }
                // this.selectedHeader(); // apply selected class
                // this.filteredOption(optionIndex);
            };

            $scope.renderHistory = function () {
                if ($window.goBackFlag !== true) {
                    $scope.showForBtn = true;
                    console.log("Normal workflow");
                    $scope.faultData = $scope.defects.faultData;
                } else {
                    $scope.populatePrevSelection();
                    console.log("old workflow");
                }
            };

            $scope.populatePrevSelection = function () {
                var currentId = localStorage.getItem('progressDefectId');
                var currentDefect = defectManager.getDefectById(currentId); // grab most current user data
                var currentSelection = currentDefect.data.defectType;

                console.log("populatePrevSelection", currentId, currentDefect, currentSelection);

                // if (!currentSelection) {
                //     noDataDialog.open(function () {});
                // } else {
                $scope.faultData = currentSelection;
                console.log("old faultdata baby!!!");
                // }
                $scope.showForBtn = false;
            };

            $scope.workOrder = workOrderManager.getWorkOrder($scope.WONUM);

            $scope.$on("Evt.backbutton", function (e) {
                if ($scope.abortDialog.opened) {
                    $scope.abortDialog.closeCancel();
                } else {
                    $scope.goBack();
                }
            });

            $scope.goBack = function () {
                $window.history.back();
            };

            $scope.goForward = function () {
                document.location.href = "#/DefectDetails/" + $scope.WONUM + "/" + $scope.USRN;
            };

            if ($scope.defectManager.defectObj[0]) {
                $scope.defectObj = $scope.defectManager.defectObj[0];
                $scope.$broadcast("DefectType.refresh", $scope.defectObj);
            }


            $scope.$on("WorkOrders.updated", function (e, workOrders) {
                $scope.$apply(function () {
                    $scope.workOrder = workOrderManager.getWorkOrder($scope.WONUM);
                    $scope.usrn = $scope.workOrder.getUsrn($scope.USRN);
                });
            });
        });
})(window, window.angular);
