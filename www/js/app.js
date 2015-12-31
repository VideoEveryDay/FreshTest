// My Chat App

var firebaseUrl = "https://freshchat.firebaseio.com/"; //freshtest
var ref = new Firebase(firebaseUrl);

var deleteFirebaseUrl = "https://glaring-inferno-6223.firebaseio.com/"; // test only
var deleteRef = new Firebase(deleteFirebaseUrl);

function onDeviceReady() {
  angular.bootstrap(document, ["mychat"]);
}

document.addEventListener("deviceready", onDeviceReady, false);

angular.module('mychat', ['ionic', 'firebase', 'angularMoment', 'mychat.controllers', 'mychat.services'])

.run(function ($ionicPlatform, $rootScope, $location, Auth, $ionicLoading) {

  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      cordova.plugins.Keyboard.disableScroll(true);
    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }

    // Resolve bug
    ionic.Platform.fullScreen();

    /* Generate variables for use elsewhere.
    displayname is the whole person object, not just displayname.
    To get displayname, use displayname.displayname
    */
    $rootScope.firebaseUrl = firebaseUrl;
    $rootScope.displayname = null;

    Auth.$onAuth(function(authData) {
      if (authData) {
        console.log("Logged in as:", authData.uid);
        $rootScope.currentUserId = authData.uid;
      } else {
        console.log("Logged out");
        $ionicLoading.hide();
        $location.path('/login');
      }
    });

    $rootScope.logout = function() {
      console.log("Logging out");
      $ionicLoading.show({
        template: "Logging out..."
      });
      Auth.$unauth();
    }

    $rootScope.$on("$stateChangeError", function (event, toState, toParams, fromState, fromParams, error) {
      if (error === "AUTH_REQUIRED") {
        $location.path('/login');
      }
    });
  });

  // Disconnect from Firebase when app pauses
  // And Reconnect when app resumes
  document.addEventListener('pause', onAppPause, false);
  document.addEventListener('resume', onAppResume, false);

  var onAppPause = function() {
    console.log("Going offline");
    Firebase.goOffline();
  };

  var onAppResume = function() {
    console.log("Going online");
    Firebase.goOnline();
  };

})

.config(function ($stateProvider, $urlRouterProvider) {
  console.log("settings worked out");
  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider

  // state for login directive
    .state('login', {
      url: '/login',
      templateUrl: 'templates/login.html',
      controller: 'LoginCtrl',
      resolve: {
        "currentAuth": ["Auth",
          function (Auth) {
            return Auth.$waitForAuth();
        }]
      }
    })

  // abstract state for tabs directive

  .state('tab', {
    url: '/tab',
    abstract: true,
    templateUrl: 'templates/tabs.html',
    resolve: {
      "currentAuth": ["Auth", 
        function (Auth) {
          return Auth.$requireAuth();
        }
      ]
    }
  })

  // each tab has its own nav history stack

  .state('tab.rooms', {
    url: '/rooms',
    views: {
      'tab-rooms': {
        templateUrl: 'templates/tab-rooms.html',
        controller: 'RoomsCtrl'
      }
    }
  })
  .state('tab.chat', {
    url: '/chat/:roomId',
    views: {
      'tab-chat': {
        templateUrl: 'templates/tab-chat.html',
        controller: 'ChatCtrl'
      }
    }
  })
  .state('tab.account', {
    url: '/account',
    views: {
      'tab-account': {
        templateUrl: 'templates/tab-account.html',
        controller: 'AccountCtrl'
      }
    }
  });



  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/login');

});
