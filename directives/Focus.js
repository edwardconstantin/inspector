'use strict';

angular.module('mgApp').directive('ngFocus', ['$parse', function($parse) {
  return function(scope, element, attr) {
    var fn = $parse(attr['ngFocus']);
    element[0].addEventListener('focus', function(event) {
      scope.$apply(function() {
        fn(scope, {$event:event});
      });
    });
  };
}]);

