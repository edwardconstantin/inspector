(function (window, angular, undefined) {
  'use strict';

  angular.module('mgApp', ['ui.bootstrap', 'google-maps'])
    .config(function ($routeProvider, $compileProvider) {



      // Allow tel: links
      $compileProvider.urlSanitizationWhitelist(/^\s*(https?|ftp|mailto|file|tel):/);

      $routeProvider
        .when('/Login', {
          templateUrl: 'views/Login.html',
          controller: 'Login'
        })

      .when('/WorkOrderList', {
        templateUrl: 'views/WorkOrderList.html',
        controller: 'WorkOrderList'
      })

      .when('/USRN/:WONUM', {
        templateUrl: 'views/USRN.html',
        controller: 'USRN'
      })

      .when('/Summary/:WONUM/:USRN', {
        templateUrl: 'views/USRNSummary.html',
        controller: 'USRNSummary'
      })

      .when('/Photo/:WONUM/:USRN', {
        templateUrl: 'views/Photo.html',
        controller: 'PhotoCtrl'
      })

      .when('/Location/:WONUM/:USRN', {
        templateUrl: 'views/Location.html',
        controller: 'Location'
      })

      .when('/Location/:WONUM/:USRN/Map', {
        templateUrl: 'views/LocationMap.html',
        controller: 'LocationMap'
      })

      .when('/DefectType/:WONUM/:USRN', {
        templateUrl: 'views/DefectType.html',
        controller: 'DefectType'
      })

      .when('/DefectDetails/:WONUM/:USRN', {
        templateUrl: 'views/DefectDetails.html',
        controller: 'DefectDetails'
      })

      .when('/RaiseDefect/:WONUM/:USRN', {
        templateUrl: 'views/RaiseDefect.html',
        controller: 'RaiseDefect'
      })

      .otherwise({
        redirectTo: '/Login'
      });

    }).run(function (navigation, syncManager, $rootScope) {
      window.$rootScope = $rootScope;
      document.addEventListener("deviceready", function () {
        document.addEventListener("backbutton", function (e) {
            e.preventDefault();
            window.$rootScope.$broadcast("Evt.backbutton");
        }, false);
      }, false);
      navigation.restore();
    });

})(window, window.angular);
