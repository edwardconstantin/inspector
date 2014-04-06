(function (window, angular, undefined) {

    'use strict';

    var datasetID = 'WorkOrders';

    angular.module('mgApp').factory('workOrderManager', function ($rootScope) {

        var workOrders = [],
            workOrderMap = {};

        var sync = $fh.sync;

        function getStatus() {
            return currentStatus;
        }

        var status = {
            NONE: 0,
            SYNCING: 1,
            WAITING: 2,
            NO_CONNECTION: 3
        },
        currentStatus = status.NONE;


        /**
         * Recreate all the work orders after a change occurs on the server
         * @param  {[type]} data  An array of work orders
         * @return {[type]}      [description]
         */
        function refreshData(data) {

            // may only need to check for removals
            // TODO: may need to check for new USRNs

            // If the work order is not in the
            for (var entry in workOrderMap) {
                if ( !data[entry] ) {
                    delete workOrderMap[entry];
                }
            }

            for (var key in data) {
                // Only add work order if its not already there
                if (!workOrderMap[key]) {
                    workOrders.push(workOrderMap[key] = new WorkOrder(data[key].data, key));
                }
            }

            // Notify everyone that the work orders have been updated.
            $rootScope.$broadcast('WorkOrders.updated', workOrders, workOrderMap);
        }

        // might need to add field for date of creation

        function Usrn(data, wo) {

            this.data = data;
            this.wo = wo;
            this.usrn = data.usrn;
            this.usrnLocation = data.usrnLocation;
            this.assets = data.assets;
            this.defects = data.defects || [];
            this.status = data.status || 'ASSIGNED';
        }


        Usrn.prototype.ABORT = -1;
        // When we first recieve the usrn this should be the status.
        Usrn.prototype.ASSIGNED = 1;
        // Once we've got the usrn, we change to this status.
        Usrn.prototype.DOWNLOADED = 2;
        Usrn.prototype.INPROGRESS = 3;
        Usrn.prototype.POSTPONE = 4;
        Usrn.prototype.COMPLETE = 5;

        Usrn.prototype.updateStatus = function (status) {
            this.status = status;
            this.wo.updateChangeLog(2, status, this.usrn);
        };

        Usrn.prototype.addDefect = function (id) {
            this.wo.updateChangeLog(3, id, this.usrn);
            this.defects.push(id);
        };

        Usrn.prototype.deleteDefect = function (id) {
            this.defects.remove(id);
        };

        function WorkOrder(data, id) {
            var self = this;
            this.data = data;
            this.id = id;
            this.statuses = data.statuses || [];
            this.changeLog = data.changeLog || [];

            this.targetStartDate = new Date(data.targetStartDate);

            this.status = this.status() || 'DOWNLOADED';
            this.usrns = [];

            if (data.usrns) {
                for (var i = 0; i < data.usrns.length; i++) {
                    this.usrns.push(new Usrn(data.usrns[i], self));
                }
            }
        }

        WorkOrder.prototype.ABORT = -1;
        // When we first recieve the work order this should be the status.
        WorkOrder.prototype.ASSIGNED = 1;
        // Once we've got the work order, we change to this status.
        WorkOrder.prototype.DOWNLOADED = 2;
        WorkOrder.prototype.INPROGRESS = 3;
        WorkOrder.prototype.POSTPONE = 4;
        WorkOrder.prototype.COMPLETE = 5;

        /**
         * The app status is different to the actual status in that we have
         * to display different things in the app. This might not be the best
         * place to have this(it probably should be in the controller)
         * @return {String} The status name.
         */
        WorkOrder.prototype.appStatus = function () {
            var status = this.status;

            if (status) {
                if (status === "RISK_ASSESS" && this.photos.length) {
                    return "TAKE_PHOTOS";
                } else return status;
            } else {
                return "ASSIGNED";
            }
        };

        /*
         * Update changeLog array in WO
         * @param {int} type of update, 1=WO_STATUS_CHANGE, 2=USRN_STATUS_CHANGE, 3=DEFECT_ADDED
         * @param {String} status of the update
         * @param {String} ID of updated obj
         */
        WorkOrder.prototype.updateChangeLog = function (type, status, id) {
            var change = {
                id: type + "" + new Date().getTime(),
                processed: false,
                timestamp: new Date().getTime()
            };

            switch (type) {
            case 1:
                change.type = "WO_STATUS_CHANGE";
                change.dtls = status;
                break;
            case 2:
                change.type = "USRN_STATUS_CHANGE";
                change.dtls = status;
                change.usrn = id;
                break;
            case 3:
                change.type = "DEFECT_ADDED";
                change.dtls = status; // this will be the id of defect
                change.usrn = id;
                break;
            }

            this.changeLog.push(change);
            this.save();
        };

        /**
         * Get a number value that represents the order of the current status.
         * @return {[type]} [description]
         */
        WorkOrder.prototype.statusValue = function () {
            return this[this.appStatus()];
        };

        /**
         * Save the work order to the sync framework which will handle
         * persisting it locally and remotely.
         */
        WorkOrder.prototype.save = function () {
            sync.doUpdate(datasetID, this.id, this.toJSON(), function () {
                console.debug("updated sync");
            }, function () {
                console.debug("failed sync");
            });
        };

        /**
         * Get the latest status in that was updated.
         * @return {Object} The status object.
         */
        WorkOrder.prototype.status = function () {
            var statuses = this.statuses;
            if (statuses.length) {
                return statuses[statuses.length - 1].name;
            }
            return null;
        };

        /**
         * Update the work order to a new status.
         * @param  {String} status The status name
         * @param  {cb} data   Any data associated with the status.
         * @return {Boolean}       Whether the status was updated successfully.
         */
        WorkOrder.prototype.addStatus = function (status, data) {
            var statusValue = this[status],
                self = this;

            // Can either go to abort or one status ahead of the current one.
            // For the previous comment: Not really. A POSTPONE status can be resumed to ASSIGNED
            //if (status === "ABORT" || status === "POSTPONE" || status === "COMPLETE" || statusValue === this.statusValue() + 1) {

            this.statuses.push({
                name: status,
                timestamp: +new Date(),
                data: data
            });
            this.currentStatus = status;
            this.status = status;

            this.updateChangeLog(1, status);

            return true;
        };


        WorkOrder.prototype.isValidNextStatus = function (status) {
            var statusValue = this[status];
            return status === "ABORT" || statusValue === this.statusValue() + 1;
        };


        WorkOrder.prototype.getUsrn = function (usrnId) {
            for (var i = this.usrns.length - 1; i >= 0; i--) {
                if (this.usrns[i].usrn == usrnId) {
                    return this.usrns[i];
                }
            };
        };

        WorkOrder.prototype.toJSON = function () {

            function getUsrn(usrn) {
                return {
                    usrn: usrn.usrn,
                    defects: usrn.defects,
                    usrnLocation: usrn.usrnLocation,
                    assets: usrn.assets,
                    status: usrn.status,
                    notes: usrn.notes || ''
                };
            }

            // this.data.attachments = this.attachments.map(getAttachment);
            this.data.statuses = this.statuses;
            this.data.status = this.status;
            this.data.usrns = this.usrns.map(getUsrn);
            this.data.changeLog = this.changeLog;

            return this.data;
        };

        return {
            refreshData: refreshData,
            getStatus: getStatus,
            getWorkOrders: function () {
                return workOrders;
            },
            getWorkOrder: function (wonum) {
                return workOrderMap[wonum];
            }
        };
    });

})(window, window.angular);
