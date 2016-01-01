angular.module('mychat.services', ['firebase'])
  .factory('Auth', ['$firebaseAuth', '$rootScope', function($firebaseAuth, $rootScope) {
    return $firebaseAuth(ref);
  }]);