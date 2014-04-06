(function (window, angular) {
    'use strict';

    angular.module('mgApp')
        .controller('PhotoCtrl', function ($window, $scope, $routeParams, syncManager, workOrderManager, defectManager) {

            var currentDefect;
            

            $scope.WONUM = $routeParams.WONUM;
            $scope.USRN = $routeParams.USRN;

            // reDirect callback, on img success
            var photoSuccess = function (err) {
                if (err && err != 'UserCancelled') {
                    console.error('Error taking photo or saving photo: %s', err);
                    alert("Error taking photo or saving photo: " + err);
                } else if (err == 'UserCancelled') {
                    $scope.goBack();
                } else {
                    document.location.href = '#/Location/' + $scope.WONUM + '/' + $scope.USRN + "/Map";
                }
            };

            $scope.defectManager = defectManager;
            $scope.defects = [defectManager.defectObj[0]];
            if (defectManager.defectObj[0]) {
                currentDefect = $scope.currentDefect = defectManager.getDefectById( defectManager.defectObj[0].id );
                $scope.takePhoto = currentDefect.takeDefectPhoto(photoSuccess);
            } else {
                document.location.href = '#/USRN/' + $scope.WONUM;
            }

            //$scope.$on("Evt.backbutton", function (e) {

            //});

            $scope.goBack = function () {
                if ($scope.currentDefect.photos.length) {
                    $window.history.back();
                } else {
                    document.location.href = '#/USRN/' + $scope.WONUM;
                }
            }
        });
})(window, window.angular);
