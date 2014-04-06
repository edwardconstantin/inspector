function ScreenCapture() {}


ScreenCapture.prototype.javascriptCapture = function(cb) {

    cb = cb || function() {};

    function fail(err) {
        cb(err);
    }
    cb("error");
};


ScreenCapture.prototype.nativeCapture = function(cb) {
    cordova.exec(function(path) {
        return cb(null, path);
    },function(err) {
        return cb(new Error(err));
    }, "ScreenCapture", "capture", []);
};




if(navigator.userAgent.toLowerCase().indexOf("android") === -1) {
    ScreenCapture.prototype.capture = ScreenCapture.prototype.javascriptCapture;
}
else {
    ScreenCapture.prototype.capture = ScreenCapture.prototype.nativeCapture;
}

/**
 * Load Plugin
 */
if(!window.plugins) {
    window.plugins = {};
}
if (!window.plugins.screenCapture) {
    window.plugins.screenCapture = new ScreenCapture();
}


