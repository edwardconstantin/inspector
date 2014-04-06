(function(window, angular, undefined) {
    'use strict';

    angular.module('mgApp').controller('Login', function($scope, $routeParams, auth, defectManager, workOrderManager, syncManager) {

        window.plugins.version.getVersionName(function(versionCode) {
            console.log('Got version name: ' + versionCode);
            $scope.$apply(function() {
                $scope.version = versionCode;
            });
        }, function(err) {
            console.log('Failed to get version name: ' + err);
        });

        $scope.login = function() {
            /**
             * Compare credentials against what is in local storage (if anything)
             */

            function tryLocalLogin(cb) {

                var valid = false;
                var credentials;

                console.log('Attempting Local Login');

                try {
                    credentials = JSON.parse(localStorage.getItem('credentials'));
                    if (credentials.uname == uname && credentials.pword == $scope.password) {
                        valid = true;
                    }
                } catch (err) {}
                cb(valid);
            }

            function tryRemoteLogin(cb) {
                auth.login(uname, $scope.password, cb);
            }

            function finishLocalLogin() {
                // get defects and WO's from localStorage when offline
                $fh.sync.doList('Defects', defectManager.refreshData);
                $fh.sync.doList('WorkOrders', workOrderManager.refreshData);
            }

            function success() {
                $fh.sync.manage('WorkOrders', {}, {
                    'userID': uname.toUpperCase()
                });
                $fh.sync.manage('Defects', {}, {
                    'userID': uname.toUpperCase()
                });
                document.location.href = '#/WorkOrderList';
            }

            var uname = $scope.username;
            /**
             * We first try a local login, checking credentials against those in local storage
             * If that fails we try a remote login, If it suceeds we save the credentials so that
             * they are available for a local login next time.
             */
            tryLocalLogin(function(valid) {
                if (valid) {
                    console.log('Local login suceeded.');
                    success();
                    finishLocalLogin();
                } else {
                    console.log('Local login failed.');
                    tryRemoteLogin(function(err, res) {
                        if (err) {
                            alert(err.message);
                        } else {
                            console.log('Remote login suceeded.');
                            // Hack as sync continues to process after user has logged out - need a way to stop sync
                            localStorage.clear();

                            localStorage.setItem('userID', uname);

                            // Save the credentials for later offline login attempts
                            var credentials = {
                                uname: uname,
                                pword: $scope.password
                            };
                            localStorage.setItem('credentials', JSON.stringify(credentials));

                            success();
                        }
                    });
                }
            });
        };
    });

})(window, angular);
