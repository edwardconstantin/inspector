window.Camera = (function() {
    function noop() {}

    window.URL = window.URL || window.webkitURL;
    navigator.getUserMedia =
        navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;


    function b64toBlob(b64Data, contentType, sliceSize) {
        contentType = contentType || '';
        sliceSize = sliceSize || 1024;

        function charCodeFromCharacter(c) {
            return c.charCodeAt(0);
        }

        var byteCharacters = atob(b64Data);
        var byteArrays = [];

        for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            var slice = byteCharacters.slice(offset, offset + sliceSize);
            var byteNumbers = Array.prototype.map.call(slice, charCodeFromCharacter);
            var byteArray = new Uint8Array(byteNumbers);

            byteArrays.push(byteArray);
        }

        var blob = new Blob(byteArrays, {type: contentType});
        return blob;
    }

    var mimeTypes = ["image/jpeg", "image/png"],
        extensions = ["jpg", "png"];

    function Camera() {
        this.output = document.createElement("video");
        this.canvas = document.createElement("canvas");
        this.overlay = document.createElement("div");
        this.buttons = document.createElement("div");
        this.captureButton = document.createElement("button");
        this.cancelButton = document.createElement("button");

        this.captureButton.textContent = "Take Photo";
        this.cancelButton.textContent = "Cancel";

        this.ctx = this.canvas.getContext('2d');

        this.output.setAttribute("autoplay", "true");

        this.overlay.classList.add("camera-overlay");
        this.buttons.classList.add("buttons");

        this.buttons.appendChild(this.cancelButton);
        this.buttons.appendChild(this.captureButton);
        this.overlay.appendChild(this.output);
        this.overlay.appendChild(this.buttons);

        this.stream = null;
        this.streamUrl = null;
    }


    // Constants used for camera options
    Camera.DestinationType = {
        DATA_URL : 0, // Return base64 encoded string
        FILE_URI : 1 // Return file uri (content://media/external/images/media/2 for Android)
    };
    Camera.PictureSourceType = {
        PHOTOLIBRARY : 0,
        CAMERA : 1,
        SAVEDPHOTOALBUM : 2
    };
    Camera.EncodingType = {
        JPEG : 0, // Return JPEG encoded image
        PNG : 1 // Return PNG encoded image
    };

    Camera.MediaType = {
        PICTURE : 0, // allow selection of still pictures only. DEFAULT. Will return format specified via DestinationType
        VIDEO : 1, // allow selection of video only, WILL ALWAYS RETURN FILE_URI
        ALLMEDIA : 2 // allow selection from all media types
    };

    Camera.prototype.capture = function(success, error, options) {
        options = options || {};
        this.canvas.width = this.output.videoWidth;
        this.canvas.height = this.output.videoHeight;

        this.ctx.drawImage(this.output, 0, 0);
        var encoding = options.encodingType || Camera.EncodingType.JPEG,
            dataUrl = this.canvas.toDataURL(mimeTypes[encoding]);

        if(options.destinationType === Camera.DestinationType.DATA_URL) {
            setTimeout(function() {
                success(dataUrl);
            }, 0);
        }
        else {
            var dataStart = dataUrl.indexOf(","),
                data = b64toBlob(dataUrl.substring(dataStart + 1)),
                fileName = +new Date() + "." + extensions[encoding];

            window.fileSystem.root.getFile(fileName, {create: true}, function(fileEntry) {

                fileEntry.createWriter(function(fileWriter) {

                    fileWriter.onwriteend = function(e) {
                        success(fileEntry.fullPath);
                    };

                    fileWriter.onerror = error;
                    fileWriter.write(data);

                }, error);

            }, error);
        }

    };

    Camera.prototype.getPicture = function(success, failure, cameraOptions) {
        success = success || noop;
        failure = failure || noop;

        var self = this;
        this.open(function() {
            function end() {
                self.captureButton.removeEventListener("click", handleCapture);
                self.cancelButton.removeEventListener("click", handleCancel);
                self.close();
            }

            function handleCapture() {
                self.capture(function(result) {
                    end();
                    success(result);
                }, function(err) {
                    end();
                    failure(err);
                }, cameraOptions);
            }

            function handleCancel() {
                end();
                failure(new Error("User closed camera"));
            }

            self.captureButton.addEventListener("click", handleCapture, false);
            self.cancelButton.addEventListener("click", handleCancel, false);

        }, failure);
    };

    Camera.prototype.close = function() {
        if(this.stream) {
            this.output.pause();
            window.URL.revokeObjectURL(this.streamUrl);
            this.streamUrl = null;
            this.stream.stop();
            this.stream = null;

            document.body.removeChild(this.overlay);
        }
    };

    Camera.prototype.open = function(success, failure) {
        success = success || noop;
        failure = failure || noop;

        var self = this;

        navigator.getUserMedia({
            video: true
        }, function(stream) {
          self.output.src = window.URL.createObjectURL(stream);
          self.stream = stream;
          document.body.appendChild(self.overlay);
          success();
        }, failure);
    };

    navigator.camera = new Camera();
    return Camera;
})();

