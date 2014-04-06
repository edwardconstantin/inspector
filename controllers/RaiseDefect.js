'use strict';

angular.module('mgApp')
    .controller('RaiseDefect', function ($scope, $window, $routeParams, syncManager, workOrderManager, defectManager) {

        var noop = function () {};

        $scope.WONUM = $routeParams.WONUM;
        $scope.USRN = $routeParams.USRN;

        $scope.defectManager = defectManager;
        $scope.defects = [defectManager.defectObj[0]];
        if (defectManager.defectObj[0]) {
            $scope.defectObj = defectManager.defectObj[0];
        }

        $scope.$on("Defects.refresh", function (e, def) {
            if (def.obj) {
                $scope.defectObj = def.obj;
                $scope.$apply(function () {
                    $scope.defects = [defectManager.defectObj[0]];
                });
            } else {
                document.location.href = "#/USRN/" + $scope.WONUM;
            }
        });

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

        $scope.sendDefect = function () {
            $scope.defectObj = $scope.defectObj || $scope.defectManager.defectObj[0];
            $scope.defectObj.data.status = ['CLIENT_COMPLETE'];
            $scope.defectObj.save();
            document.location.href = "#/USRN/" + $scope.WONUM;
        };

        $scope.$on("Evt.backbutton", function (e) {
            $scope.backOnRaise();
        });

        $scope.backOnRaise = function () {
            $window.history.back();
        };

    });
