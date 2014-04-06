(function(window, angular, undefined) {
    "use strict";


    angular.module("mgApp").factory("GPS", function() {

        var geolocation = navigator.geolocation,
            listeners = [],
            watchId = null,
            cachedGeo = null;


        function handleEvent() {
            for(var i = 0, il = listeners.length; i < il; i++) {
                if (listeners[i]) {
                    listeners[i].apply(null, arguments);
                }
            }
        }

        function startWatching() {
            // If the browser func is available that will be used
            // otherwise the phonegap one will be used
            watchId = geolocation.watchPosition(function(geo) {
                cachedGeo = geo;
                setTimeout(function() {
                    handleEvent(geo);
                }, 0);
            }, function(err) {
                console.log("got error getting gps: ", err);
            }, {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: Infinity,
            });
        }
        function stopWatching() {
            geolocation.clearWatch(watchId);
            watchId = null;
        }

        // If searching for GPS already don't initiate another search
        function addListener(listener) {
            listeners.push(listener);

            if(!watchId) {
                startWatching();
            }
            else if(cachedGeo) {
                setTimeout(function() {
                    handleEvent(cachedGeo);
                }, 0);
            }
        }

        function removeListener(listener) {
            var index = listeners.indexOf(listener);

            if(index > -1) {
                listeners.splice(index, 1);
            }
            console.log("num listeners: ", listeners.length);
            console.log("watchId", watchId);
            if(watchId && !listeners.length) {
                stopWatching();
            }
        }

        function Request() {
            this.callback = null;
            this.conditions = true;
            this.handler = this.handleUpdate.bind(this); // bind to itself - this will always refer to the Request Object
        }

        Request.prototype.checkConditions = function(data) {
            var c = this.conditions;

            if(!c) {
                return true;
            }

            if(c.minAccuracy) {
                if(data.coords.accuracy > c.minAccuracy) {
                    console.log("failed on minAccuracy " + data.coords.accuracy + ":" + c.minAccuracy);
                    return false;
                }
            }

            if(c.maxAge) {
                if(+new Date() - data.timestamp > c.maxAge) {
                    console.log("failed on maxAge " + (+new Date() - data.timestamp) + ":" + c.maxAge);
                    return false;
                }
            }
            return true;
        };
        Request.prototype.handleUpdate = function(geo) {
            this.coords = geo;

            if(this.checkConditions(geo)) {
                this.callback(geo);
                removeListener(this.handler);
            }
        };

        Request.prototype.waitFor = function(conditions, cb) {
            this.conditions = conditions;
            this.callback = cb;

            addListener(this.handler);
        };


        Request.prototype.cancel = function() {
            removeListener(this.handler);
        };

        return {
            Request: Request
        };

    }).run(function(GPS) {

    });
})(window, window.angular);