(function (window, angular, undefined) {

    'use strict';

    var datasetID = 'Defects';

    angular.module('mgApp')
        .factory('defectManager', function ($rootScope, attachments, workOrderManager) {

            var defectMap,
                sync = $fh.sync,
                defectObj = [];

            defectMap = {};

            var defectsCreated = false;

            function refreshData(data) {
                for (var key in data) {
                    if (data.hasOwnProperty(key)) {

                        if (!defectMap[key]) {
                            defectMap[key] = new Defect(data[key].data, key);
                            var status = data[key].data.status,
                                progressDefectId = localStorage.getItem('progressDefectId');

                            if (status && status.length === 0 && progressDefectId == data[key].data.defectId) {
                                defectObj[0] = defectMap[key];
                            }
                        }
                    }
                }
                // only need to broadcast a defect refresh if the current defect gets updated
                $rootScope.$broadcast('Defects.refresh', {
                    map: defectMap,
                    obj: defectObj[0]
                });
            }


            /**
             * The Defect class. Used to represent a defect created for a usrn
             * @param {[type]} data [description]
             * @param {[type]} id   [description]
             */
            function Defect(data, id) {

                function getRefs(attachment) {
                    return {
                        description: attachment.description,
                        timestamp: attachment.timestamp,
                        identifier: attachment.identifier,
                        mimeType: attachment.mimeType,
                        ref: attachments.get(attachment.identifier, attachment.mimeType)
                    };
                }
                this.id = id;
                this.data = data;
                this.photos = !data.photos ? [] : data.photos.map(getRefs);
            }


            /**
             * Add a photo to the defect.
             * @param  {Attachment} attachment  The reference to the attachment object.
             * @param  {String} description The description of the photo.
             * @param  {Object} data        Data association with the photo.
             */
            Defect.prototype.addPhoto = function (attachment, description, data) {
                this.photos.push({
                    timestamp: +new Date(),
                    description: description,
                    identifier: attachment.identifier,
                    mimeType: attachment.mimeType,
                    ref: attachment
                });
                this.data.photos.push({
                    timestamp: +new Date(),
                    description: description,
                    identifier: attachment.identifier,
                    mimeType: attachment.mimeType,

                    // Very convenient but not OK -- this is just a pointer to the local file
                    // -- to be visible for any client, it must be a reference to the cloud filesystem
                    localRef: attachment.getLocalUrl()
                });
                this.save();

/*                attachment.fileEntry.getMetadata(function (meta) {
                    alert(JSON.stringify(meta));
                }, function (err) {alert(err)});*/
            };

            Defect.prototype.getData = function () {
                return this.data;
            };

            Defect.prototype.saveCoords = function (xCoord, yCoord) {
                this.data.xCoordinate = xCoord;
                this.data.yCoordinate = yCoord;
                this.save();
            };

            Defect.prototype.saveCoordsAddress = function (address) {
                this.data.locationComments = address;
                this.save();
            };

            /**
             * Save the work order to the sync framework which will handle
             * persisting it locally and remotely.
             */
            Defect.prototype.save = function () {
                if(this.data.defectType){
                    var activity = this.data.defectType[0].choice;
                    var defect = this.data.defectType[1].choice;
                    var obj = getActivityCode(activity,defect);
                    this.data.activityCode = obj.activity;
                    this.data.defectCode = obj.defect;
                    this.data.description = obj.desc;
                }

                sync.doUpdate(datasetID, this.id, this.data, function (res) {
                    console.log('updated sync', res);
                }, function () {
                    console.log('failed sync');
                });
            };

            /**
             * Convert object to json for sync framework
             */
            Defect.prototype.toJSON = function () {

                function getAttachment(attachment) {
                    return {
                        timestamp: attachment.timestamp,
                        description: attachment.description,
                        identifier: attachment.identifier,
                        mimeType: attachment.mimeType,
                        data: attachment.data
                    };
                }

                this.data.photos = this.photos.map(getAttachment);

                return this.data;
            };

            /**
             * Update the defect with location details
             */
            Defect.prototype.addLocationDetails = function (id) {
                // TODO: implement
                // See defectMongo.json for reference
                // we need to set fields:
                //     'xCoordinate': '-0.407498',
                //     'yCoordinate': '51.3665',
            };


            Defect.prototype.takeDefectPhoto = function (cb) {
                var that = this;
                navigator.camera.getPicture(function (path) {
                    if (path) {
                        attachments.create(path, function(err, attachment) {
                            if (err || !attachment) {
                                console.error('Failed to create attachment', err);
                                cb('Photo not saved, device disk may be full?');
                            }
                            else { // All is ok, camera worked and attachment was created
                                attachment.timestamp = Date.now();
                                var title = that.data.photos.length ? 'Photo ' + (that.data.photos.length + 1) : 'Photo 1';
                                that.addPhoto(attachment, title);
                                cb();
                            }
                        });
                    } else {
                        console.error('No path returned from camera operation.');
                        cb('Photo not saved, device disk may be full?');
                    }
                }, function (msg) {
                    if (msg != "Camera cancelled.") {
                        console.error('Camera operation failed, '+JSON.stringify(msg));
                        alert('Problem taking photo: '+JSON.stringify(msg));
                        cb('Device failed to take photo');
                    } else {
                        cb('UserCancelled');
                    }
                }, { // options
                    quality: 75,
                    targetWidth: 1200,
                    targetHeight: 900,
                    encodingType: Camera.EncodingType.PNG,
                    sourceType: Camera.PictureSourceType.CAMERA,
                    destinationType: Camera.DestinationType.FILE_URI,
                    correctOrientation: true
                });
            };


            /**
             * Update the defect with type details (details come from defect type tab)
             */
            var getDefectType = function () {
                // For now concatenate all the fields on the defect type screen
                var Defects = {};

                Defects.faults = [{
                    name: "Fault Type",
                    options: [{
                        type: "single",
                        title: "Carriage Way Inspections"
                    }, {
                        type: "single",
                        title: "Footwary & Kerb Inspections"
                    }, {
                        type: "single",
                        title: "Furniture, Vegetation and Structural"
                    }]
                }, {
                    name: "Defect Type",
                    options: [{
                        type: "boolean",
                        title: "Failed Repair"
                    }, {
                        type: "filter",
                        defectType: [
                            // CARRIAGE WAY DEFECT TYPES
                            [
                                "Pot Hole",
                                "Pot Hole - Cycle Lane",
                                "Loose Material",
                                "Regulatory lines - excessive wear",
                                "Ironwork and covers - missing or broken",
                                "Edge damage",
                                "Uneveness due to rutting, subsidence",
                                "Displaced road studs, cat eyes and debris"
                            ],
                            // FOOTWAY & KERB INSPECTION DEFECT TYPES
                            [
                                "Ironwork and covers - missing or broken",
                                "Pot Hole",
                                "General Surface - Trips",
                                "Kerbing Defects"
                            ],
                            // FURNITURE, VEG & STRUCTURAL FAULTS DEFECT TYPES

                            [
                                "Rails, barriers, safety fencing - excessive",

                                "Road signs and signals",
                                "Unlawful signs - safety hazard",
                                "Trees/Vegetation on highway",
                                "Off highway - safety hazard",
                                "Surface defects in the verge",
                                "Ironwork and covers - missing or broken"
                            ]
                        ] // end of defectType
                    }]
                }, {
                    name: "Priority",
                    options: [{
                        type: "single",
                        title: "P2"
                    }, {
                        type: "single",
                        title: "P2+"
                    }, {
                        type: "single",
                        title: "P2 Cluster"
                    }, {
                        type: "single",
                        title: "P3"
                    }, {
                        type: "dropDown",
                        title: "3rd Party",
                        states: ["Affinity Water",
                            "British Telecom(BT)",
                            "National Grid Gas",
                            "Southern Gas Networks(SGN)",
                            "South East Water(SEW)",
                            "Southern Electric(SElec)",
                            "Southern Water(SW)",
                            "Sutton & East Surrey Water(S&ESW)",
                            "Thames Water",
                            "UK Power Networks(UKPN)",
                            "Virgin Media(Cable TV)",
                            "Other Utility",
                            "Private vegetation",
                            "Private (Other)",
                            "SCC"
                        ]
                    }]
                }, {
                    name: "Road Speed",
                    options: [{
                        type: "single",
                        title: "20"
                    }, {
                        type: "single",
                        title: "30",
                        selected: true
                    }, {
                        type: "single",
                        title: "40"
                    }, {
                        type: "single",
                        title: "50"
                    }, {
                        type: "single",
                        title: "60"
                    }, {
                        type: "single",
                        title: "70"
                    }]
                }, {
                    name: "Traffic Management",
                    options: [{
                        type: "single",
                        title: "Standard Chapter 8",
                        selected: true
                    }, {
                        type: "single",
                        title: "2-Way signals"
                    }, {
                        type: "single",
                        title: "Multi-way signals"
                    }, {
                        type: "single",
                        title: "Lane closure"
                    }, {
                        type: "single",
                        title: "Road closure"
                    }, {
                        type: "single",
                        title: "Advanced TM"
                    }, {
                        type: "single",
                        title: "No parking cones"
                    }, {
                        type: "single",
                        title: "Restricted working"
                    }, {
                        type: "single",
                        title: "Priority signs"
                    }, {
                        type: "single",
                        title: "Stop/go boards"
                    }, {
                        type: "single",
                        title: "Give and take"
                    }],
                    end: true
                }];

                Defects.faultData = [{
                    title: "Fault Type",
                    choice: ""
                }, {
                    title: "Defect Type",
                    repairs: 0,
                    choice: ""
                }, {
                    title: "Priority",
                    choice: ""
                }, {
                    title: "Road Speed",
                    choice: 0
                }, {
                    title: "Traffic Management",
                    choice: 0,
                    end: false
                }];

                Defects.totalDefects = {
                    name: "Number of Defects",
                    options: [{
                        type: "single",
                        title: 1,
                        selected: true
                    }, {
                        type: "single",
                        title: 2
                    }, {
                        type: "single",
                        title: 3
                    }, {
                        type: "single",
                        title: 4
                    }, {
                        type: "single",
                        title: 5
                    }, {
                        type: "single",
                        title: 6
                    }, {
                        type: "single",
                        title: 7
                    }, {
                        type: "single",
                        title: 8
                    }, {
                        type: "single",
                        title: 9
                    }, {
                        type: "single",
                        title: 10
                    }]
                };
                return Defects;
            };


            /**
             *
             */
            Defect.prototype.addDefectMeasurements = function (measurements) {
                // TODO: implement
                // See defectMongo.json for reference
                // we need to set fields:
                // 'mWidth': '0',
                // 'mLength': '0',
                // 'mDepth': '0',
                // 'mDiameter': '0',
            };


            Defect.prototype.delete = function () {
                sync.doDelete(datasetID, this.id, function (res) {
                        console.log('sync.doDelete successfull!', res);
                    },
                    function (err) {
                        console.log('sync.doDelete failed!', err);
                    });
            };

            window.defectObj = defectObj;

            /**
             * [createDefect description]
             * @param  {[type]} woId [description]
             * @param  {[type]} usrn [description]
             * @return {[type]}      [description]
             */

            function createDefect(woId, usrn, username) {
                var timestamp = new Date().getTime();

                sync.doCreate(datasetID, {
                    timestamp: timestamp
                }, function (data) {
                    console.log('Defect sync.doCreate successful.', data);

                    var defectId = data.uid;

                    localStorage.setItem('progressDefectId', defectId);

                    defectMap[defectId] = new Defect({}, defectId);
                    defectMap[defectId].data = {
                        "status": [],
                        "defectId": defectId,
                        "timestamp": timestamp,
                        "username": username,
                        "assetNum": usrn,
                        "defectDetails": {
                            numDefects: 1,
                            width: "",
                            len: "",
                            depth: "",
                            clusterTotal: 0
                        },
                        "woId": woId,
                        "photos": []
                    };
                    defectMap[defectId].save();
                    defectObj[0] = defectMap[defectId];

                    // Add a reference to the defect in the USRN on the Work Order
                    workOrderManager.getWorkOrder(woId).getUsrn(usrn).addDefect(defectId);
                }, function (msg) {
                    console.error('error creating Defect with sync framework: '+msg);
                });
            }


            // For testing purposes only, NOT for aplication usage!
            window.deleteAllDefects = function () {
                for (var key in defectMap) {
                    defectMap[key].delete();
                }
                defectMap = [];
                localStorage.removeItem('progressDefectId');
                $rootScope.$broadcast('Defects.refresh', {
                    map: defectMap,
                    obj: {}
                });
            };



            var getActivityCode = function(fault, defect){
                var obj = {activity:'',defect:'',desc:''};

                if(fault === 'Carriage Way Inspections'){
                    switch(defect){
                        case('Pot Hole'):
                            obj.activity = 'CW';
                            obj.defect = 'CW-POTHOLE';
                            obj.desc = 'carriageway defects - potholes';
                            return obj;
                        case('Pot Hole - Cycle Lane'):
                            obj.activity = 'CL';
                            obj.defect = 'CL-POTHOLE';
                            obj.desc = 'cycle lane defects - pothole';
                            return obj;
                        case('Loose Material'):
                            obj.activity = 'CW';
                            obj.defect = 'CW-LOOSEMAT';
                            obj.desc = 'carriageway defect - loose materials';
                            return obj;
                        case('Regulatory lines - excessive wear'):
                            obj.activity = 'CW';
                            obj.defect = 'CW-REGMARK';
                            obj.desc = 'carriageway defect - reg markings faded/worn';
                            return obj;
                        case('Ironwork and covers - missing or broken'):
                            obj.activity = 'CW';
                            obj.defect = 'CW-IRWKBRK';
                            obj.desc = 'carriageway defect - ironwork missing/broken etc.';
                            return obj;
                        case('Edge damage'):
                            obj.activity = 'CW';
                            obj.defect = 'CW-EDGE';
                            obj.desc = 'carriageway defect - edge damage';
                            return obj;
                        case('Unevenness due to rutting, subsidence'):
                            obj.activity = 'CW';
                            obj.defect = 'CW-UNEVEN';
                            obj.desc = 'carriageway defect - Uneven - rutting, humps etc';
                            return obj;
                        case('Displaced road studs, cat eyes and debris'):
                            obj.activity = 'CW';
                            obj.defect = 'CW-DISPLACERS';
                            obj.desc = 'carriageway defects - displaced road studs';
                            return obj;
                    }

                } else if(fault === 'Footway & Kerb Inspections'){
                    switch(defect){
                        case('Ironwork and covers - missing or broken'):
                            obj.activity = 'FW';
                            obj.defect = 'FW-IRONWK';
                            obj.desc = 'footway defect - ironwork - mising/broken etc';
                            return obj;
                        case('Pot Hole'):
                            obj.activity = 'FW';
                            obj.defect = 'FW-POTHOLE';
                            obj.desc = 'footway defect - potholes';
                            return obj;
                        case('General Surface - Trips'):
                            obj.activity = 'FW';
                            obj.defect = 'FW-PAVING';
                            obj.desc = 'footway defect - paving trip, rocking, missing';
                            return obj;
                        case('Kerbing Defects'):
                            obj.activity = 'FW';
                            obj.defect = 'FW-KERB';
                            obj.desc = 'footway defect - loose tilted projecting';
                            return obj;
                    }
                } else if(fault === 'Furniture, Vegitation and Structural'){
                    switch(defect){
                        case('Rails, barriers, safety fencing - excessive defects'):
                            obj.activity = 'SF';
                            obj.defect = 'SF-RAILFENCEPOST';
                            obj.desc = 'Street Furniture Defect - Rails, Fences, Posts etc defect';
                            return obj;
                        case('Road signs and signals'):
                            obj.activity = 'SF';
                            obj.defect = 'SF-RDSIGNS';
                            obj.desc = 'Street Furniture Defect - Road signs, signal defects';
                            return obj;
                        case('Unlawful signs - safety hazard'):
                            obj.activity = 'SF';
                            obj.defect = 'SF-UNLAWFUL';
                            obj.desc = 'Street Furniture Defect - Unlawful sign-safety hazard';
                            return obj;
                        case('Trees / Vegetation on highway'):
                            obj.activity = 'TV';
                            obj.defect = 'TV-DDD';
                            obj.desc = 'Trees and Vegetation Defect - Tree/Veg- disease, dead, danger';
                            return obj;
                        case('Off highway - safety hazard'):
                            obj.activity = 'TV';
                            obj.defect = 'TV-SAFETYHZD';
                            obj.desc = 'Trees and Vegetation Defect - Tree/Veg- off hw safety hazard';
                            return obj;
                        case('Surface defects in the verge'):
                            obj.activity = 'TV';
                            obj.defect = 'TV-VERGKERB';
                            obj.desc = 'Surface defect in the verge';
                            return obj;
                        case('Ironwork and covers - missing or broken'):
                            obj.activity = 'TV';
                            obj.defect = 'TV-VERGOBSTRUCT';
                            obj.desc = 'Ironwork and covers - missing or broken';
                            return obj;
                    }
                } else {
                    return obj;
                }
            }


            return {
                refreshData: refreshData,
                getDefectType: getDefectType,
                createDefect: createDefect,

                /**
                 * Given an array of defect ids return an array of objects
                 */
                getDefectsForUsrn: function (usrn) {
                    var result = [],
                        progressDefectId = localStorage.getItem('progressDefectId');

                    for (var key in defectMap) {
                        var status = defectMap[key].data.status;
                        if (defectMap[key].data.assetNum == usrn) {
                            if (status.length === 0 && progressDefectId !== defectMap[key].id) continue;
                            result.push(defectMap[key]);
                        }
                    }
                    return result;
                },

                /**
                 * Delete unfinshed defects -- To be called in controllers
                 * where there shoudn't be any open defect object.
                 */
                deleteStaleDefects: function () {
                    var temp = {};
                    for (var key in defectMap) {
                        if (defectMap.hasOwnProperty(key)) {
                            var status = defectMap[key].data.status,
                                progressDefectId = localStorage.getItem('progressDefectId');
                            // This is to protect someone else's progress defect when testing in the cloud --
                            // for a full clean up just remove '&& progressDefectId === defectMap[key].id' part.
                            if (status && status.length === 0 && progressDefectId === defectMap[key].id) {
                                defectMap[key].delete();
                                console.log('Stale Defect deleted!');
                            } else {
                                temp[key] = defectMap[key];
                            }
                        }
                    }
                    defectMap = temp;
                },

                getDefectById: function (defectId) {
                    return defectMap[defectId];
                },

            // showAbortDialog: function () {
            //     var abortDialog = $scope.abortDialog = new Dialog();
            // },

                defectMap: defectMap,
                defectObj: defectObj
            };
        });

})(window, window.angular);
