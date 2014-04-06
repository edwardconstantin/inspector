(function (window, angular, undefined) {

    angular.module("mgApp").factory("network", function ($rootScope) {

        var host,
            initTimeout,
            initInProgress = false,
            cbQueue = [];


        function handleEvent(e) {
            console.debug("network changed");
            $rootScope.$broadcast("Network.changed", navigator.onLine);
        }

        window.addEventListener("online", handleEvent, false);
        window.addEventListener("offline", handleEvent, false);

        handleEvent();


        // TODO: init properties should be injected at build time.

        /**
         * If we initialise successfully, we set the host and execute all the callbacks
         * waiting on the host.
         */

        function initFH(cb) {

            initInProgress = true;

            $fh.init({

                // // LOCAL
                //'host': 'http://127.0.0.1:8000',
                //'appid': 'o4qh_Yb1bzlyARIBVQG4Juee',
                //'appkey': 'bcc60fe2bd7cabab346de8974c58a540d847fdba',

                // // DEVELOPMENT

                 // 'host': 'https://maygurney.feedhenry.com',
                 // 'appid': '_BHwPkGAmricreJnJBW4Fl5Q',
                 // 'appkey': 'f7ecb34251a899ba0fedb4ab280b06e2a1b1959e',


                // // TEST
                 'host': 'https://maygurney.feedhenry.com',
                 'appid': 'D907CxHGLPAOqbgqccQU7TGj',
                 'appkey': '6bbd1f7fd099954618d8472db67acf436895a902',

                // // DEMO
                // 'host': 'https://maygurney.feedhenry.com',
                // 'appid': 'IQUif6PAO1kcahITx_w1wg1E',
                // 'appkey': '5cf19ce48807116d0111fe564c6ab0ef71d7386d',

                'mode': 'dev'

            }, function (res) {
                console.debug('$fh initialised');
                if ($fh && $fh.cloud_props) {
                    setHost($fh.cloud_props);
                    complete();
                    if (cb) cb(true);
                }
                if (cb) cb(false);
            }, function (msg, err) {
                console.debug('$fh failed to initialise');
                if (cb) cb(false);
            });
        };


        /**
         * Try to initialize immediately, then every 15 seconds until the host is found.
         */
        (function tryInit() {
            if (!host && !initInProgress && navigator.onLine) {
                initFH(function (success) {
                    if (!success) {
                        setTimeout(tryInit, 15000);
                    }
                });
            } else if (!host) {
                setTimeout(tryInit, 15000);
            }
        })();


        // (function check() {
        //     // console.log( 'check connectivity' );
        //     checkCloudReachable(function () {
        //         // console.log( 'returned from check - resetting timer' );
        //         setTimeout(check, UCB.cfg.timers.connectivity);
        //     });
        // })();



        /**
         *
         */

        function setHost(props) {
            if (!host) {
                host = props.hosts.releaseCloudUrl;
                if ($fh.app_props.mode && $fh.app_props.mode.indexOf("dev") > -1) {
                    host = props.hosts.debugCloudUrl;
                }
                // https://feedhenry.assembla.com/spaces/feedhenry-platform/tickets/4413
                // Java doesn't support _s in the url, so the cloud exposes a seperate
                // url that is valid, but we have to create it ourselves from the invalid one.
                host = host.replace(/_\w+/g, "") + "/cloud/";
            }
        }

        function complete() {
            while (cbQueue.length) {
                cbQueue.pop()(host);
            }
            initInProgress = false;
        }

        function getConnection(cb) {
            // If we're online and a host exists just return it.
            // If there is an init in progress or we're offline add cb to Q.
            // If we're online and a init is not in progress then attempt init.

            if (navigator.onLine && host) {
                cb(host);

            } else if (initInProgress || !navigator.onLine) {
                cbQueue.push(cb);

            } else {
                cbQueue.push(cb);
                if (!initInProgress && navigator.onLine) {
                    initFH();
                }
            }
        }

        return {
            getStatus: function () {
                return navigator.onLine;
            },

            getConnection: getConnection,

            isHostAvailable: function () {

                // if host is available we have successfully init already
                // If not attempt to get a connnection
                if (!host) {
                    getConnection(function () { /* fire and forget */ });
                }

                // send back the host value immediately - don't want to wait
                return host;
            }
        };


    });

})(window, window.angular);

