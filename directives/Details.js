(function (window, angular, undefined) {
    "use strict";

    angular.module("mgApp")
        .directive('details', function () {

            return {
                restrict: "A",
                templateUrl: 'views/templates/NumberOfDefects.html',
                //scope: {faultOption = '=ngModel'},

                link: function (scope, element, attrs, controller) {
                    scope.isContentVisible = false; // fault toggle Ctrl
                    scope.defectHeader = false; // selected item Ctrl
                    scope.faultOption = -1;

                    scope.$on('Defect.numDefects', function (e, numDefects) {
                        scope.applySelectedOption(numDefects - 1);
                    });

                    //___________________________________________________

                    // toggle content
                    scope.toggleContent = function () {
                        scope.isContentVisible = !scope.isContentVisible;
                        console.info("Toggle Content", scope.isContentVisible);
                    };

                    // capture title touch event
                    scope.selectedHeader = function () {
                        scope.isContentVisible = false;
                    };

                    scope.applySelectedOption = function (index, name) {
                        // console.debug(index, name);
                        scope.faultOption = index;
                        scope.defectHeader = true;
                    };

                    if (scope.$parent.defectDetails) {
                        scope.applySelectedOption(scope.$parent.defectDetails.numDefects - 1);
                    }

                    scope.removePlaceHolder = function () {
                        console.log("removing placeholder.....");
                        element.find('input').removeAttr('placeholder');
                    };
                }
            };
        });

})(window, window.angular);
