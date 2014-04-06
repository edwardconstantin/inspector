var Version = function() {};


Version.prototype.getVersionName = function(success, fail) {
    return setTimeout(function() {
        if(!window.cordova) {
                success("DEV");
        }
        else {
            return cordova.exec(success, fail, 'Version', 'GetVersionName', []);
        }
    }, 0);
};

if(!window.plugins) {
    window.plugins = {};
}
if (!window.plugins.version) {
    window.plugins.version = new Version();
}
