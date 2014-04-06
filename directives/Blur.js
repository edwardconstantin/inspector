'use strict';

angular.module('mgApp').directive('ngBlur', ['$parse', function($parse) {
  return function(scope, element, attr) {
    var fn = $parse(attr['ngBlur']);
    element[0].addEventListener('blur', function(event) {
      scope.$apply(function() {
        fn(scope, {$event:event});
      });
    });
  };
}]);