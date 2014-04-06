'use strict';

angular.module('mgApp')
    .controller('Location', function (workOrderManager, $rootScope, $scope, $window, $timeout, $routeParams, $location, syncManager, defectManager, GPS) {

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
            $scope.usrn.deleteDefect(currentDefect.id);
            $scope.workOrder.save();
            currentDefect.delete();
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

        var DEFAULT_LAT_COORD = 51.262251,
            DEFAULT_LNG_COORD = -0.467252,
            DETAILED_ZOOM = 18,
            DISTANT_ZOOM = 10;

        google.maps.visualRefresh = true;

        $scope.WONUM = $routeParams.WONUM;
        $scope.USRN = $routeParams.USRN;
        $scope.position = {};
        $scope.resumingOverlay = false;
        $scope.DEFAULT_LAT_COORD = DEFAULT_LAT_COORD;
        $scope.DEFAULT_LNG_COORD = DEFAULT_LNG_COORD;

        $scope.defectManager = defectManager;
        var currentDefect = $scope.defectManager.defectObj[0];
        $scope.defectObj = currentDefect;

        var lat, lng;
        if (currentDefect && currentDefect.data.xCoordinate) {
            lat = currentDefect.data.xCoordinate;
            lng = currentDefect.data.yCoordinate;
            setMapProperties(lat, lng, DETAILED_ZOOM);
            currentDefect.saveCoords(lat, lng);
        } else if (currentDefect) {
            lat = DEFAULT_LAT_COORD;
            lng = DEFAULT_LNG_COORD;
            setMapProperties(lat, lng, DISTANT_ZOOM);
            currentDefect.saveCoords(lat, lng);
        } else {
            lat = DEFAULT_LAT_COORD;
            lng = DEFAULT_LNG_COORD;
            setMapProperties(lat, lng, DISTANT_ZOOM);
            // showResumeOverlay();
        }

        function showResumeOverlay() {
            $scope.resumingOverlay = true;
        }

        function hideResumeOverlay() {
            $scope.$apply(function () {
                $scope.resumingOverlay = false;
            });
        }


        function setMapProperties(lat, lng, zoom) {
            $scope.center = {
                latitude: lat,
                longitude: lng
            };
            $scope.position.coords = {
                latitude: lat,
                longitude: lng
            };
            $scope.markersProperty = [{
                latitude: lat,
                longitude: lng
            }];
            $scope.zoomProperty = zoom;
            $scope.dragging = false;
            $scope.eventsProperty = {
                click: function (mapModel, eventName, originalEventArgs) {
                    currentDefect.saveCoords(originalEventArgs[0].latLng.lat(), originalEventArgs[0].latLng.lng());
                    setGeoCodeAddress(originalEventArgs[0].latLng.lat(), originalEventArgs[0].latLng.lng());
                }
            };
        }

        var abortDialog = $scope.abortDialog = new Dialog();

        // TODO: need to take this out and replace it with an app resume
        // This can be called
        $scope.$on("Defects.refresh", function (e, def) {

            if (!def.obj || !def.obj.data) {
                hideResumeOverlay();
                document.location.href = "#/USRN/" + $scope.WONUM;
            }
            // we only need to apply the coords if we are waiting for the app to resume i.e. $scope.resumingOverlay = true
            else if ($scope.resumingOverlay) {
                $scope.$apply(function () {
                    if (def.obj.data.xCoordinate && def.obj.data.yCoordinate) {
                        setMapProperties(def.obj.data.xCoordinate, def.obj.data.yCoordinate, DETAILED_ZOOM);
                    } else {
                        setMapProperties(DEFAULT_LAT_COORD, DEFAULT_LNG_COORD, DISTANT_ZOOM);
                    }
                });
            }
            currentDefect = def.obj;
            $scope.defectObj = currentDefect;
            hideResumeOverlay();
        });

        function setGeoCodeAddress(lat, lng) {
            var latlng = new google.maps.LatLng(lat, lng);
            var geocoder = new google.maps.Geocoder();
            geocoder.geocode({
                'latLng': latlng
            }, function (results, status) {
                if (status === google.maps.GeocoderStatus.OK) {

                    if (results[0] && currentDefect) {
                        currentDefect.saveCoordsAddress(results[0].formatted_address);
                    }
                }
            });
        }

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
            document.location.href = "#/DefectType/" + $scope.WONUM + "/" + $scope.USRN;
        };

        $scope.abort = function () {
            abortDialog.open(function () {});
            // document.location.href = "#/USRN/" + $scope.WONUM;
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
    });
