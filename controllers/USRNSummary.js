'use strict';

angular.module('mgApp')
    .controller('USRNSummary', function($scope, $routeParams, defectManager, $window) {

        var woNum = $routeParams.WONUM,
            USRN = $routeParams.USRN;

        $scope.USRN = USRN;

        // Get the defect for this USRN and sort them
        $scope.defects = defectManager.getDefectsForUsrn(USRN);
        $scope.defects = $scope.defects.sort(function (a, b) {
            return b.data.timestamp - a.data.timestamp;
        });

        $scope.back = function () {
            $window.history.back();
        }
    });

