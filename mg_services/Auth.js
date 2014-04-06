(function(window, angular, undefined) {

    angular.module("mgApp").factory("auth", function($rootScope, network) {
        function async(func) {
            return function() {
                var args = arguments,
                    thisArg = this;


                if(func) {
                    setTimeout(function() {
                        func.apply(thisArg, args);
                    }, 0);
                }
            };
        }

        var cachedToken = null;

        function storeToken(username, password, token) {
            cachedToken = token;
            localStorage.setItem(username, JSON.stringify({
                token: token,
                password: password
            }));
        }

        function localLogin(username, password, cb) {
            console.log("Trying local login");

            cb = async(cb);
            var userDataStr = localStorage.getItem(username),
                userData = null;


            if(userDataStr) {
                try {
                    userData = JSON.parse(userDataStr);
                }
                catch(e) {
                    cb(new Error("User has not previously logged in"));
                }
            }

            if(userData && password === userData.password) {
                cb(null, userData);
            }
            else {
                cb(new Error("User has not previously logged in"));
            }
        }

        function remoteLogin(username, password, cb) {
            console.log("Trying remote login.");
            $fh.act({
                act: "login",
                req: getLoginParams(username, password)
            }, function(token) {

                if(!token) {
                    return cb(new Error("Invalid username or password."));
                }
                cb(null, token);

            }, function(message) {
                cb(new Error("Can not reach server. Please check connection."));
            });
        }

        function getLoginParams (uname, password) {
            // TODO: get rest of fields
            return {
                uname: uname,
                password: password
            };
        }

        return {
            login: function(username, password, cb) {

                var uname = username;

                if ( network.isHostAvailable() ) {
                    remoteLogin(uname, password, function(err, res) {
                        cb(err, res);
                    });
                } else {
                    cb(new Error("Can not reach server. Please check connection."));
                }

            },
            init: function() {

            },
            isLoggedIn: function() {
                return true; //cachedToken !== null;
            }
        };

    }).run(function($rootScope, auth) {
        auth.init();
    });

})(window, window.angular);
