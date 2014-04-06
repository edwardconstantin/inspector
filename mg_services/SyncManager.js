(function (window, angular, undefined) {

    'use strict';

    angular.module('mgApp').factory('syncManager', function ($rootScope, workOrderManager, defectManager) {

        var sync = $fh.sync,
            status = {
                NONE: 0,
                SYNCING: 1,
                WAITING: 2,
                NO_CONNECTION: 3
            },
            currentStatus = status.NONE;

        console.log('initializing sync service');

        sync.init({
            'sync_frequency': 10,
            'do_console_log': true,
            // Notify of changes to the local data set
            'notify_delta_received': true,
            'notify_local_update_applied': true,

            'notify_sync_started': true,
            'notify_sync_complete': true,
            'notify_sync_failed': true
        });

        sync.notify(function (e) {
            switch (e.code) {
            case 'local_update_applied':
            case 'delta_received':
                if (e.dataset_id == 'Defects') {
                    sync.doList('Defects', defectManager.refreshData);
                } else if (e.dataset_id == 'WorkOrders') {
                    sync.doList('WorkOrders', workOrderManager.refreshData);
                }
                break;
            case 'sync_failed':
                updateStatus(status.WAITING);
                break;
            case 'sync_started':
                updateStatus(status.SYNCING);
                break;
            case 'sync_complete':
                updateStatus(status.NONE);
                break;
            }
        });

        // Use phonegaps file system api or the browsers if it is not available
        window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;

        /**
         * Initialise the filesystem with the size specified
         * @param  {Integer} amount Amount in bytes to initialise.
         */
        function requestFileSystem(amount) {
            window.requestFileSystem(LocalFileSystem.PERSISTENT, amount, function (fs) {

                // get Username from storage
                var userID = localStorage.getItem('userID');
                if (!userID) {
                    document.location.href = '#/Login';
                } else {
                    sync.manage('WorkOrders', {}, { 'userID' : userID.toUpperCase() });
                    sync.manage('Defects', {}, { 'userID': userID.toUpperCase() });
                }

                // Notify everyone that the file system is ready.
                console.log('FileSystem is ready - sync service can now manage datasets');

                window.fileSystem = fs;
            }, function () {
                console.debug('Failed to allocate file system');
            });
        }

        // When in the browser we need to use the html5 file system rather than
        // the one cordova supplies, but it needs to request a quota first.
        if (typeof navigator.webkitPersistentStorage !== 'undefined') {
            navigator.webkitPersistentStorage.requestQuota(20 * 1024 * 1024, requestFileSystem, function () {
                console.warn('User declined file storage');
            });
        } else {
            // Amount is 0 because we pretty much have free reign over the
            // amount of storage we use on an android device.
            requestFileSystem(0);
        }

        function updateStatus(status) {
            $rootScope.$broadcast('SyncManager.statusChange', currentStatus = status);
        }

        return {};
    });

})(window, window.angular);
