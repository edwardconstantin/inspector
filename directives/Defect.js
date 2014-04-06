(function (window, angular, undefined) {
    "use strict";

    angular.module("mgApp")
        .directive('defect', function ($location, defectManager) {

            return {
                restrict: "E",
                templateUrl: 'views/templates/DefectFaultType.html',
                //scope: {defectManager: '='},

                link: function (scope, element, attrs, controller) {
                    scope.isContentVisible = false; // fault toggle Ctrl
                    scope.defectHeader = false; // selected item Ctrl
                    scope.visible = false; // priority toggle Ctrl
                    scope.faultOption = -1;
                    scope.boolOption = false;
                    scope.priorityOption = -1;
                    scope.filterOption = -1;
                    scope.controller = controller;

                    var idx = scope.this.$index;

                    scope.$on("DefectType.refresh", function (e, defectObj) {
                        if (defectObj.data.defectType) {
                            scope.faultData[idx] = defectObj.data.defectType[idx]
                            scope.init();
                        }
                    });

                    scope.init = function () {
                        var i,
                            opts = scope.$parent.$parent.defects.faults[idx].options,
                            name = scope.$parent.$parent.defects.faults[idx].title;

                        scope.faultOption = scope.faultData[idx].selectedIdx;
                        scope.defectHeader = true;

                        if (idx == 1) {
                            opts = opts[1].defectType[scope.faultData[idx].selectedIdx];
                        }

                        // Remove defaults or any other previous selections
                        if (opts) {
                            for (i = 0; i < opts.length; i++) {
                                opts[i].selected = false;
                            }
                        }
                    };

                    if (window.defectObj[0] && window.defectObj[0].data.defectType) {
                        scope.faultData = window.defectObj[0].data.defectType;
                        scope.init();
                    }

                    //___________________________________________________
                    // console.log("Defect.js", scope);
                    // toggle options
                    scope.toggleContent = function () {
                        scope.isContentVisible = !scope.isContentVisible;
                        console.info("Toggle Content");
                    };


                    // priority toggle dropDown
                    scope.toggleContentLevel2 = function () {
                        scope.visible = !scope.visible;
                        console.info("Toggle Content Level 2");
                    };

                    // capture title touch event
                    scope.selectedHeader = function () {
                        scope.isContentVisible = false;
                    };

                    // capture failed repairs option
                    scope.repairsOption = function (index) {
                        scope.boolOption = !scope.boolOption;
                        scope.isContentVisible = true;
                    };

                    //filteed option
                    scope.filteredOption = function (index) {
                        scope.filterOption = index;
                    };

                    // assign selection index to scope variable
                    scope.applySelectedOption = function (index, name) {
                        scope.faultOption = index;
                        scope.defectHeader = true;

                        // open next level
                        if (scope.defectHeader === true) {
                            if (scope.$$nextSibling === null) {
                                scope.faultData[4].end = true; // set boolean if nextSibling is null
                                if (scope.faultData[4].end === true) {
                                    console.warn("<<<$ BANG!!! you are about to leave this screen... Bye!! $>>");
                                    console.info("<<<$ USERDATA $>>\n", scope.faultData);

                                    // validation, check if all 5 catagories have been seleceted
                                    for (var i = 0; i < scope.faultData.length; i++) {
                                        var item = scope.faultData[i];
                                        if (item.choice === 0) { // All data has not been filled in
                                            return;
                                        }
                                    }
                                    // adds to defect obj
                                    scope.defectManager.defectObj[0].data.defectType = scope.faultData;
                                    scope.defectManager.defectObj[0].save();

                                    setTimeout(function () {
                                        // Redirect to Defect Summary screen
                                        document.location.href = '#/DefectDetails/' + scope.WONUM + '/' + scope.USRN;
                                    }, 1000);
                                }
                            } else {
                                scope.$$nextSibling.isContentVisible = true;
                            }
                        }
                    };

                    scope.applyPriorityOption = function (index, name) {
                        scope.priorityOption = index;
                        scope.defectHeader = true;
                        scope.$$nextSibling.isContentVisible = true;
                    };

                    // filter defects based on fault selection
                    scope.filterDefects = function (index) {
                        var filterIndex = index;
                        this.selectedDefect(filterIndex);
                    };
                }
            };
        });
})(window, window.angular);