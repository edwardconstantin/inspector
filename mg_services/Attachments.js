(function(window, angular, undefined) {

    angular.module("mgApp").factory("attachments", function($rootScope, network) {
        function noop() {}

        function _updateProgress() {
            // Notify a listener that we have made progress so it
            // call apply to update the view.
            $rootScope.$broadcast("Attachments.updated");
            $rootScope.$broadcast("Attachments.statusChange", getStatus());
        }

        /**
         * There are some issues with phonegap in terms of progress events. Mainly
         * that the loaded value is twice the amount it should be. This function
         * should be bound to an attachment object to update progress when an
         * progress event gets fired.
         * @param {Event} e The event from phonegap or the browser.
         */
        function handleProgress(e) {
            if (e.lengthComputable) {

                // decide whether the event came from the browser or
                // phonegap.
                if(window.XMLHttpRequestProgressEvent) {
                    this.progress = e.loaded / e.total * 100;
                }
                else {
                    // when we get a phonegap event, calculate the proper value.
                    console.log("update-progress:" + JSON.stringify(e, null, 4));
                    this.progress = (e.loaded / 2) / e.total * 100;
                }

                _updateProgress();
            }
            else {
                this.progress = Infinity;
            }
        }

        var NONE = 0,
            // Currently uploading or downloading files.
            SYNCING = 1,
            // Has items in backlog and waiting for connection/timeout
            // to try again.
            WAITING = 2,
            NO_CONNECTION = 3;

        function getStatus() {
            if(uploadQueue.isRunning() || downloadQueue.isRunning()) {
                return SYNCING;
            }
            else if(uploadQueue.backlog.length || downloadQueue.backlog.length) {
                return WAITING;
            }
            else {
                return NONE;
            }
        }

        function TransferQueue(type) {
            // Transfers that are ready to be uploaded/downloaded.
            this.ready = [];
            // Transfers that are in progress.
            this.inprogress = [];
            // Transfers that failed but still have tries left.
            this.failed = [];
            // Transfers that failed but has reached the timeout limit
            this.backlog = [];

            // Once transfers have been successfully completed, then we
            // don't need to keep track of them other than that they actually
            // completed.
            this.done = 0;

            this.seen = {};

            // bind to self to handle callbacks.
            this.handleFinish = this.handleFinish.bind(this);

            this.retryTimeout = null;

            this.type = type || "download";
        }

        TransferQueue.prototype.maxConcurrent = 4;

        TransferQueue.prototype.handleFinish = function(err, transfer) {
            var loc = this.inprogress.indexOf(transfer);

            this.inprogress.splice(loc, 1);

            // Retry the transfer, but only if the limit hasn't been
            // reached.
            if(err) {
                if(transfer.shouldRetry()) {
                    this.failed.push(transfer);
                }
                else {
                    this.backlog.push(transfer);
                }
            }
            else {
                this.done++;
            }
            if(this.failed.length || this.ready.length) {
                this.process();
            }
            else {
                this.finished();
            }
            _updateProgress();
        };

        TransferQueue.prototype.next = function() {
            // Get from ready list first then do previously failed downloads.
            return this.ready.shift() || this.failed.shift();
        };

        TransferQueue.prototype.process = function() {
            if(this.inprogress.length < this.maxConcurrent) {
                var next = this.next();

                if(next) {
                    this.inprogress.push(next);
                    next.transfer(this.type, this.handleFinish);
                    this.process();
                }
            }
            _updateProgress();
        };

        TransferQueue.prototype.isRunning = function() {
            return this.inprogress.length ||
                this.ready.length ||
                this.failed.length;
        };

        TransferQueue.prototype.finished = function() {
            var self = this;
            if(this.backlog.length && !this.retryTimeout) {
                this.retryTimeout = setTimeout(function() {
                    // Add each transfer to the ready queue and reset
                    // it so that the number of tries is reset.
                    while(self.backlog.length) {
                        self.ready.push(self.backlog.shift().reset());
                    }

                    clearTimeout(self.retryTimeout);
                    self.retryTimeout = null;
                    self.process();
                }, 20 * 1000);
            }
        };

        TransferQueue.prototype.hasSeen = function(attachment) {
            return this.seen[attachment.identifier] === true;
        };

        TransferQueue.prototype.queue = function(attachment) {
            if(!this.hasSeen(attachment)) {
                this.seen[attachment.identifier] = true;
                this.ready.push(new Transfer(attachment));
                this.process();
            }
        };

        /**
         * Wraps an attachment to maintain it's state while in
         * a transfer queue.
         * @param {Attachment} attachment [description]
         */
        function Transfer(attachment) {
            this.attachment = attachment;
            this.tries = 0;
        }

        // The default number of retries.
        Transfer.prototype.maxRetries = 3;

        /**
         * Reset the transfer to add it back to the ready queue.
         */
        Transfer.prototype.reset = function() {
            this.tries = 0;
            return this;
        };

        /**
         * Either upload or download the attachment.
         * @param  {String}   direction "upload" | "download"
         * @param  {Function} cb        [description]
         */
        Transfer.prototype.transfer = function(direction, cb) {
            var self = this;
            this.attachment[direction](function(err, attachment) {
                self.tries++;
                return cb(err, self);
            });
        };

        /**
         * Whether the transfer should be retried i.e. when the number of
         * retries has exceeded the limit.
         * @return {Boolean}
         */
        Transfer.prototype.shouldRetry = function() {
            return this.tries < this.maxRetries;
        };

        var extensions = {
            "image/png": "png",
            "image/jpeg": "jpg",
            "image/jpg": "jpg",
            "application/pdf": "pdf"
        },
        mimeTypes = {
            ".jpg": "image/jpg",
            ".png": "image/png",
            ".pdf": "application/pdf"
        };

        /**
         * Represents the state of an attachment while it is being downloaded.
         * We download files individually, because instead of just getting all the
         * files, it allows us to check beforehand if we have a file, and if we don't,
         * _then_ get it. It also helps with error correction; when a file fails to
         * download then we can request that file on its own without having to download
         * everything together. There may be a way to download multiple files in the one
         * request but I think it's easier for now to do them separately.
         *
         * @param {String} identifier The hash of the file.
         * @param {String} fileEntry A reference to the fileEntry on the fileSystem.
         */
        function Attachment(identifier, mimeType, fileEntry) {
            this.progress = 0;

            this.fileEntry = fileEntry || null;
            this.identifier = identifier;
            this.extension = extensions[mimeType];
            this.mimeType = mimeType;

            // specifies whether this file exists in the cloud or not.
            this.remoteStatus = this.NOEXIST;
            this.localStatus = this.NOEXIST;

            if(fileEntry) {
                this.localStatus = this.EXISTS;
            }
            // Check whether we have a flag that says the file
            // exists remotely.
            this.loadStatus();
        }

        Attachment.prototype.ERROR = -1;
        Attachment.prototype.NOEXIST = 0;
        Attachment.prototype.EXISTS = 1;
        Attachment.prototype.INPROGRESS = 2;


        // Directory for storing attachments
        // TODO: actually use this directory
        // just using root at the moment.
        Attachment.prototype.dir = "";
        Attachment.prototype.getRemotePath = function( cb ) {
            network.getConnection(function ( host ) {
                cb ( host );
            });
        }

        /**
         * @return {String} The url to upload an attachment to.
         */
        Attachment.prototype.getUploadPath = function( cb ) {
            this.getRemotePath( function (res) {
                cb ( res + "uploadPhoto" );
            })
        };

        /**
         * @return {String} The url to download an attachment from.
         */
        Attachment.prototype.getDownloadPath = function( cb ) {
            var self = this;
            this.getRemotePath( function (res) {
                cb ( res + "downloadPhoto?identifier=" + self.identifier );
            });
        };

        /**
         * Generate a path to where the attachment should exist on device, before we
         * have a reference to the FileEntry. i.e. before the file is downloaded, or
         * before we know it exists.
         * @return {String} The path to the attachment on device.
         */
        Attachment.prototype.getLocalPath = function() {
            var root = url.parse(fileSystem.root.fullPath).path;

            return path.join(root, this.dir, this.identifier + "." + this.extension);
        };

        Attachment.prototype.getFileName = function() {
            return this.identifier;
        };

        /**
         * Get a url that we can use to refer to the file and include it in a html
         * reference such as an image. Includes the protocol, which is normally file://
         * or in the browser it should be "filesystem:..."
         * @return {[type]} [description]
         */
        Attachment.prototype.getLocalUrl = function() {
            if(this.fileEntry && this.localStatus === this.EXISTS) {
                return this.fileEntry.toURL();
            }
            return "";
        };

        /**
         * Update the state of the attachment when it is ready to
         * be used.
         * @param  {FileEntry} fileEntry The reference to the
         * fileEntry on the fileSystem
         */
        Attachment.prototype.doneDownloading = function(fileEntry) {
            this.fileEntry = fileEntry;
            this.localStatus = this.EXISTS;
            _updateProgress();
        };

        Attachment.prototype.failDownloading = function() {
            this.localStatus = this.ERROR;
            _updateProgress();

            // When the download fails, we need to delete the file entry
            // if it exists
            this.existsLocally(function(exists, fileEntry) {
                if(exists) {
                    fileEntry.remove();
                }
            });
        };

        Attachment.prototype.saveStatus = function() {
            localStorage.setItem(this.identifier, this.remoteStatus);
        };

        Attachment.prototype.loadStatus = function() {
            var storedData = localStorage.getItem(this.identifier);

            if(storedData) {
                this.remoteStatus = parseInt(storedData, 10);
            }
        };

        /**
         * Executes a call to a cordova plugin to open the attachment
         * using the os via an intent.
         */
        Attachment.prototype.open = function() {
            if(this.localStatus === this.EXISTS) {
                console.log("---------------------------");
                console.log("opening file: " + this.fileEntry.fullPath);
                console.log("---------------------------");
                window.plugins.fileOpener.open(this.fileEntry.fullPath);
            }
        };

        /**
         * Check asynchronously whether the file for the attachment
         * has been downloaded already.
         * @param  {Function} cb(exists, fileEntry)
         *         @param {boolean} exists Whether the file exists or not
         *         @param {FileEntry} fileEntry If the file exists, a reference
         *         to the fileEntry on the fileSystem.
         */
        Attachment.prototype.existsLocally = function(cb) {
            cb = cb || noop;

            var self = this;

            if(this.fileEntry && this.localStatus === this.EXISTS) {
                return cb(true, this.fileEntry);
            }
            console.log("Checking existance of file: " + this.getLocalPath());

            fileSystem.root.getFile(this.getLocalPath(), {create: false}, function(fileEntry) {
                console.log("file exists locally: " + self.getLocalPath());
                self.doneDownloading(fileEntry);
                cb.call(self, true, fileEntry);
            }, function() {
                console.log("file doesn't exist locally: " + self.getLocalPath());
                self.localStatus = self.NOEXIST;
                cb.call(self, false);
            });

        };

        /**
         * Load the file for use locally.
         * @param  {Function} cb(err, fileEntry)
         *         @param {Error} err The error if one occured
         *         @param {FileEntry} fileEntry A reference the fileEntry if
         *         the attachment was loaded successfully
         * @return {Attachment}      Returns itself to allow chaining.
         */
        Attachment.prototype.download = function(cb) {
            var self = this;

            cb = cb || function() {};

            function download() {
                var fileTransfer = new window.FileTransfer();

                fileTransfer.onprogress = handleProgress.bind(this);

                _updateProgress();

                this.getDownloadPath(function (res) {
                    fileTransfer.download(encodeURI(res), self.getLocalPath(), function(fileEntry) {
                        console.log("file download succeeded: " + fileEntry.fullPath);

                        // When we successfully download a file, we know it exists on-line.
                        self.remoteStatus = self.EXISTS;
                        self.saveStatus();
                        self.doneDownloading(fileEntry);

                        cb(null, self);
                    }, function(err) {
                        // TODO: distinguish between whether the cloud says the file does not exist at
                        // all vs a connection failure, i.e. the file might still exist but we weren't
                        // able to find out.
                        console.log("file download failed: " + JSON.stringify(err, null, 4));
                        self.failDownloading();

                        _updateProgress();
                        cb(err, self);
                    }, true);
                });
            }

            // Make sure not to try download the file when we already have it or are
            // in the process of getting it.
            if(this.localStatus !== this.EXISTS && this.localStatus !== this.INPROGRESS) {
                self.status = this.INPROGRESS;
                this.existsLocally(function(exists, fileEntry) {
                    // If the file is already downloaded, then we
                    // don't need to do anything, otherwise download it.
                    exists ? cb(null, this) : download.call(this);
                });
            }
            else {
                return cb(null, this);
            }
        };

        /**
         * Upload a file to the server.
         * @param {Function} cb
         *        @param {Error} err An error if one occurs while trying to
         *        upload the file.
         */
        Attachment.prototype.upload = function(cb) {
            var self = this;

            cb = cb || noop;

            // Don't try upload if the cloud already has the data, or we are in
            // the process of uploading it.
            if(this.remoteStatus === this.EXISTS || this.remoteStatus === this.INPROGRESS) {
                return cb(null, this);
            }
            else {
                self.remoteStatus = self.INPROGRESS;

                var fileTransfer = new window.FileTransfer(),
                    options = new window.FileUploadOptions();

                options.fileKey = "file";
                options.fileName = this.identifier;
                options.mimeType = this.mimeType;
                options.chunkedMode = false;
                options.params = {
                    identifier: self.identifier
                };

                fileTransfer.onprogress = handleProgress.bind(self);

                _updateProgress();
                this.getUploadPath(function (res) {
                    fileTransfer.upload(self.getLocalPath(), res, function() {
                        console.log("file upload succeeded");
                        self.remoteStatus = self.EXISTS;
                        self.saveStatus();

                        _updateProgress();
                        return cb(null, self);
                    }, function(err) {
                        console.log("file upload failed");
                        self.remoteStatus = self.ERROR;

                        _updateProgress();
                        return cb(err, self);
                    }, options, true);
                });

            }
        };

        var instances = {};

        /**
         * However unlikely we need to allow for the case where an attachment
         * exists on different work orders, so the same file will get downloaded
         * simultaneously. To prevent this we maintain instances of attachments
         * that we've already downloaded.
         * @param {String} identifier The has of the file that uniquely identifies it.
         * @param {FileEntry} fileEntry A reference to the fileEntry on the fileSystem
         * if we happen to have one(Normally just after we've created the file).
         */
        function createAttachment(identifier, mimeType, fileEntry) {
            var attachment = instances[identifier];

            if(instances.hasOwnProperty(identifier)) {
                return attachment;
            }
            else {
                return instances[identifier] = new Attachment(identifier, mimeType, fileEntry);
            }
        }

        /**
         * Get a file that should already exist either remotely or locally
         * @param {String}   identifier The file identifier.
         */
        function get(identifier, mimeType, cb) {
            cb = cb || noop;

            var attachment = createAttachment(identifier, mimeType);

            attachment.existsLocally(function(exists, fileEntry) {
                if(!exists) {
                    downloadQueue.queue(attachment);
                }
                else if(attachment.remoteStatus !== attachment.EXISTS &&
                    attachment.remoteStatus !== attachment.INPROGRESS) {
                    uploadQueue.queue(attachment);
                }

                cb(null, attachment);
            });

            return attachment;
        }

        /**
         * Track a new file that has just been created. i.e. when a photo has
         * been taken.
         * Adding a local file means creating a unique identifier for the file
         * i.e. creating an md5 checksum, then copying the file to a new location
         * and uploading it straight away.
         *
         * @param {String} path The path to the existing file.
         */
        function create(fileUrl, cb) {
            cb = cb || noop;

            var fsFail = function(msg) {
                var err = 'Problem getting file from file system ';
                console.error( err + msg );
                cb(err);
            }


            // Make sure the url is a path without the file:// protocol, which is what
            // we get from the camera api on device.
            var fullPath = url.parse(fileUrl).path;

            window.plugins.fileHasher.hash(fullPath, function(err, hash) {
                if(err) {
                    console.error("error from file hasher: " + JSON.stringify(err, null, 4));
                    return cb(err);
                }

                console.log("got file hash" + hash);

                fileSystem.root.getFile(fullPath, null, function(fileEntry) {

                    var extension = path.extname(fullPath),
                        mimeType = mimeTypes[extension];

                    console.log("parsed extension: " + extension);

                    function finish(fileEntry) {
                        var attachment = createAttachment(hash, mimeType, fileEntry);
                        uploadQueue.queue(attachment);
                        cb(null, attachment);
                    }
                    if(path.join(fileSystem.root.fullPath, hash + extension) === fileEntry.fullPath) {
                        finish(fileEntry);
                    }
                    else {
                        fileEntry.moveTo(fileSystem.root, hash + extension, finish, fsFail);
                    }
                }, fsFail);
            });
        }

        var uploadQueue = new TransferQueue("upload"),
            downloadQueue = new TransferQueue("download");

        // TODO: this is only exposed globally for debugging.
        return window.attachments = {
            getStatus: getStatus,

            NONE: NONE,
            SYNCING: SYNCING,
            WAITING: WAITING,
            NO_CONNECTION: NO_CONNECTION,

            uploadQueue: uploadQueue,
            downloadQueue: downloadQueue,

            instances: instances,
            Attachment: Attachment,
            create: create,
            get: get
        };
    });

})(window, window.angular);