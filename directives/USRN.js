(function (window, angular, undefined) {
    "use strict";


    angular.module("mgApp").directive("usrn", function ($rootScope) {
        return {
            restrict: 'E',
            transclude: true,
            templateUrl: "views/USRNItem.html",
            replace: true,
            link: function ($scope, iElement, iAttrs, controller) {

                // alert('resetting');

                $scope.isCollapsed = $scope.usrn.active ? false : true;
                // $scope.usrnID = $scope.usrn.usrn;

                $scope.defectExists = $scope.usrn.defects.length > 0;

                $scope.toggleCollapse = function () {

                    if ($scope.usrn.status == "POSTPONE" || $scope.usrn.status == "COMPLETE") {
                        $scope.usrnResumeDialog.open(function (data) {

                            if (data) {
                                $scope.usrn.notes = data.notes;
                                $scope.usrn.status = 1;
                                $scope.isCollapsed = false;
                                $scope.usrn.updateStatus('ASSIGNED');
                            }
                        });
                        return;
                    }

                    $scope.isCollapsed = !$scope.isCollapsed;

                    var chevron = angular.element(iElement[0].getElementsByClassName("chevron")[0]);

                    if ($scope.isCollapsed) {
                        chevron.removeClass("chevron-point-down");
                        $scope.usrn.active = false;
                    } else {
                        chevron.addClass("chevron-point-down");
                        $scope.usrn.active = true;
                    }
                };

                $scope.onComplete = function () {
                    $scope.usrnCompleteNotesDialog.open(function (data) {
                        $scope.toggleCollapse();
                        $scope.usrn.notes = data.notes;
                        $scope.usrn.status = 5;
                        $scope.usrn.updateStatus('COMPLETE');
                    });
                };


                $scope.onNoDefect = function () {
                    $scope.noDefectDialog.open(function (result) {
                        if (result) {
                            $scope.toggleCollapse();
                            $scope.usrn.status = 5;
                            $scope.usrn.updateStatus('COMPLETE');
                        }
                    });
                };

                $scope.onPostpone = function () {
                    $scope.usrn.active = false;
                    $scope.toggleCollapse();
                    $scope.usrn.status = 4;
                    $scope.usrn.updateStatus('POSTPONE');
                };

                $scope.onDefect = function (id) {
                    var woID = $scope.workOrder.id;
                    var usrn = $scope.usrn.usrn;
                    $scope.$parent.dectivateAll();
                    $scope.usrn.active = true;
                    var username = $scope.workOrder.data.userName;
                    $scope.defectManager.deleteStaleDefects();
                    $scope.defectManager.createDefect(woID, usrn, username);
                    document.location.href = "#/Photo/" + woID + "/" + usrn;
                };

                $scope.onAbort = function () {
                    $scope.usrn.status = -1;
                    $scope.usrn.updateStatus('ABORT');
                };

                $scope.onSummary = function () {
                    if (!$scope.defectExists) return;
                    var woID = $scope.workOrder.id;
                    var usrn = $scope.usrn.usrn;
                    $scope.defectManager.deleteStaleDefects();
                    document.location.href = "#/Summary/" + woID + "/" + usrn;
                };
            }
        };
    });

})(window, window.angular);
