function FileHasher() {}


FileHasher.prototype.javascriptHash = function(path, cb) {

    cb = cb || function() {};

    function fail(err) {
        cb(err);
    }
    window.fileSystem.root.getFile(path, {create: false}, function(entry) {

        entry.file(function(file) {

            var blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice,
                chunkSize = 2097152,                               // read in chunks of 2MB
                chunks = Math.ceil(file.size / chunkSize),
                currentChunk = 0,
                spark = new SparkMD5.ArrayBuffer();

            function onload(e) {
                spark.append(e.target.result); // append array buffer
                currentChunk++;

                if (currentChunk < chunks) {
                    loadNext();
                }
                else {
                    // Finished loading, compute the hash.
                    cb(null, spark.end());
                }
            }

            function loadNext() {
                var fileReader = new FileReader();
                fileReader.onload = onload;
                fileReader.onerror = fail;

                var start = currentChunk * chunkSize,
                    end = ((start + chunkSize) >= file.size) ? file.size : start + chunkSize;

                fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));
            }

            loadNext();

        }, fail);

    }, fail);
};


FileHasher.prototype.nativeHash = function(path, digestType, cb) {
    if(typeof digestType === "function") {
        cb = digestType;
        digestType = "MD5";
    }
    cordova.exec(function(hash) {
        return cb(null, hash);
    },function(err) {
        return cb(new Error(err));
    }, "FileHasher", "hash", [path, digestType]);
};




if(navigator.userAgent.toLowerCase().indexOf("android") === -1) {
    FileHasher.prototype.hash = FileHasher.prototype.javascriptHash;
}
else {
    FileHasher.prototype.hash = FileHasher.prototype.nativeHash;
}

/**
 * Load Plugin
 */

if(!window.plugins) {
    window.plugins = {};
}
if (!window.plugins.fileHasher) {
    window.plugins.fileHasher = new FileHasher();
}


