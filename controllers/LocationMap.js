'use strict';

angular.module('mgApp')
    .controller('LocationMap', function ($window, $scope, $location, attachments, $routeParams, syncManager, workOrderManager, defectManager, GPS, $timeout) {

        var DEFAULT_LAT_COORD = 51.262251,
            DEFAULT_LNG_COORD = -0.467252,
            DETAILED_ZOOM = 18,
            DISTANT_ZOOM = 10;

        if (google) {
            google.maps.visualRefresh = true;
        }

        $scope.WONUM = $routeParams.WONUM;
        $scope.USRN = $routeParams.USRN;
        $scope.position = {};
        $scope.resumingOverlay = false;
        $scope.needsGPS = true;
        $scope.refreshMap = false;
        $scope.DEFAULT_LAT_COORD = DEFAULT_LAT_COORD;
        $scope.DEFAULT_LNG_COORD = DEFAULT_LNG_COORD;


        $scope.defectManager = defectManager;
        var currentDefect = $scope.defectManager.defectObj[0];

        var lat, lng;
        if (currentDefect && currentDefect.data.xCoordinate) {
            lat = currentDefect.data.xCoordinate;
            lng = currentDefect.data.yCoordinate;
            setMapProperties(lat, lng, DETAILED_ZOOM);
            currentDefect.saveCoords(lat, lng);
        }
        else if (currentDefect) {
            lat = DEFAULT_LAT_COORD;
            lng = DEFAULT_LNG_COORD;
            setMapProperties(lat, lng, DISTANT_ZOOM);
            currentDefect.saveCoords(lat, lng);
        }
        else {
            lat = DEFAULT_LAT_COORD;
            lng = DEFAULT_LNG_COORD;
            setMapProperties(lat, lng, DISTANT_ZOOM);
            // showResumeOverlay();
        }


        function showResumeOverlay () {
            $scope.resumingOverlay = true;
        }


        function hideResumeOverlay () {
            $scope.$apply(function () {
                $scope.resumingOverlay = false;
            });
        }


        function setMapProperties (lat, lng, zoom) {
            angular.extend($scope, {

                position: {
                    coords: {
                        latitude: lat,
                        longitude: lng
                    }
                },

                /** the initial center of the map */
                centerProperty: {
                    latitude: lat,
                    longitude: lng
                },

                /** the initial zoom level of the map */
                zoomProperty: zoom,

                /** list of markers to put in the map */
                markersProperty: [{
                    latitude: lat,
                    longitude: lng
                }],

                // These 2 properties will be set when clicking on the map
                clickedLatitudeProperty: lat,
                clickedLongitudeProperty: lng,

                eventsProperty: {
                    click: function(mapModel, eventName, originalEventArgs) {
                        currentDefect.saveCoords(originalEventArgs[0].latLng.lat(), originalEventArgs[0].latLng.lng());
                        setGeoCodeAddress(originalEventArgs[0].latLng.lat(), originalEventArgs[0].latLng.lng());
                    }
                },

                refreshMap : true
            });
        }

        // TODO: need to take this out and replace it with an app resume
        // This can be called
        $scope.$on("Defects.refresh", function (e, def) {

            if (!def.obj || !def.obj.data) {
                hideResumeOverlay();
                document.location.href = "#/USRN/" + $scope.WONUM;
            }
            // we only need to apply the coords if we are waiting for the app to resume i.e. $scope.resumingOverlay = true
            else if ( $scope.resumingOverlay ) {
                $scope.$apply(function () {
                    if (def.obj.data.xCoordinate && def.obj.data.yCoordinate) {
                        setMapProperties(def.obj.data.xCoordinate, def.obj.data.yCoordinate, DETAILED_ZOOM);
                    } else {
                        setMapProperties(DEFAULT_LAT_COORD, DEFAULT_LNG_COORD, DISTANT_ZOOM);
                    }
                });
            }
            currentDefect = def.obj;
            hideResumeOverlay();
        });


        function getLocation(cb) {

            var waitTimeout = null,
                gpsRequest = new GPS.Request();

            function wait() {
                // We need gps coordinates to continue.
                $scope.needsGPS = true; // forces popup
                waitTimeout = $timeout(function() {
                    $scope.needsGPS = false;

// lmartin: If device is unable to establish a GPS fix the app now brings up an option to retry or continue.
// Happens when selecting On Way and On Site. This is not required. Agreed that if the app could not get GPS
// fix it would ignore and continue.
                    finish();

                    // // after 5 seconds open dialog
                    // gpsDialog.open(function(data) {
                    //     if(data === "continue") {
                    //         finish();
                    //     }
                    //     else if(data === "retry") {
                    //         $scope.$apply(wait);
                    //     }
                    // });

                }, 8000);
            }

            function finish() {
                $scope.$apply(function() {
                    $scope.needsGPS = false;
                });
                $timeout.cancel(waitTimeout);
                gpsRequest.cancel();
                return cb(gpsRequest.coords);
            }
            wait();

            gpsRequest.waitFor({
                minAccuracy: 200,    // accuarcy in meters
                maxAge: 60 * 1000   // if it is older than 60 seconds it will not be used.
            }, finish);
        }
        getLocation(function (geo) {

            if (geo && geo.coords) {
                setMapProperties(geo.coords.latitude, geo.coords.longitude, DETAILED_ZOOM);
                if (currentDefect) {
                    currentDefect.saveCoords(geo.coords.latitude, geo.coords.longitude);
                }
                hideResumeOverlay();
            }
            setGeoCodeAddress($scope.centerProperty.latitude, $scope.centerProperty.longitude);
        });


        function setGeoCodeAddress (lat, lng) {
            if (google) {
                var latlng = new google.maps.LatLng(lat, lng);
                var geocoder = new google.maps.Geocoder();
                geocoder.geocode({
                        'latLng': latlng
                    }, function(results, status) {
                        if (status == google.maps.GeocoderStatus.OK) {

                            if (results[0] && currentDefect) {
                                currentDefect.saveCoordsAddress(results[0].formatted_address);
                            }
                        }
                    }
                );
            }
        }

        $scope.$on("Evt.backbutton", function (e) {
            $scope.goBack();
        });

        $scope.goBack = function () {
            $window.history.back();
        }


        $scope.goForward = function () {

            // before moving forward from the location map we need to capture an image of screen
            window.plugins.screenCapture.capture(function (err, path) {
                if (err) {
                    console.log( 'Problem capturing image of map: '+err );
                    alert('Problem capturing image of map');
                }

                // Redirect to the next screen first as we don't need to block UI to create attachment

                if ($scope.workOrder) {
                    $scope.workOrder.coords = $scope.position.coords;
                }

                // If a path exists then the screen capture should have worked, in which case we create an attachment.
                if (path) {

                    var timestamp = Date.now();

                    attachments.create(path, function (err, attachment) {

                        attachment.timestamp = timestamp;

                        if (!err && attachment) {
                            var title = currentDefect.data.photos.length ? "Map " + currentDefect.data.photos.length : "Map 1";
                            currentDefect.addPhoto(attachment, title);
                        } else {
                            alert('Problem creating attacment' + err);
                            console.error("ERROR -> take photo", err);
                        }
                    });
                }

            });
            $location.path("/Location/" + $scope.WONUM + "/" + $scope.USRN);
        };

    });
