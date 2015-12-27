angular.module('mychat.controllers', ['firebase'])

.controller('LoginCtrl', function ($scope, $ionicModal, $state, $firebaseAuth, $ionicLoading, $rootScope) {
  console.log("Login Controller Initialized");

  // var ref = new Firebase($scope.firebaseUrl);
  var auth = $firebaseAuth(ref);

  console.log("LOGGING showNavBar");
  showNavBar = true;


  $ionicModal.fromTemplateUrl('templates/loginModal.html', {
    scope: $scope
  }).then(function(modal) {
    $scope.modal = modal;
  });

  $scope.createUser = function(user) {
    console.log("Create user function called");
    if (user && user.email && user.password && user.gender && user.grade) {

      $ionicLoading.show({
        template: "Signing up..."
      });

      auth.$createUser({
        email: user.email,
        password: user.password
      }).then(function(userData) {
          alert("User created successfully!");
          
          ref.child('users').child(userData.uid).set({
            email: user.email,
            displayname: user.grade + " " + user.gender,
            openToChat: false,
            profile: {
              gender: user.gender,
              grade: user.grade,
              password: user.password
            }
          });

          $ionicLoading.hide();
          $scope.modal.hide();

          $scope.signIn({
            email: user.email,
            pwdForLogin: user.password
          })
      }).catch(function (error) {
        alert("Error: " + error)
        $ionicLoading.hide();
      });
    } 
    else if (user && user.gender && user.displayname && 
      (user.gender == "Female" && user.displayname != "Oedipa") ) {
      alert("Alert: Female characters must be named 'Oedipa'.");
    }
    else { 
      alert("Please fill in all details.")
    }
  }

  $scope.signIn = function(user) {
    
    if (user && user.email && user.pwdForLogin) {
      $ionicLoading.show({
        template: "Signing in..."
      });

      auth.$authWithPassword({
        email: user.email,
        password: user.pwdForLogin
      }).then(function(authData) {
        console.log("Logged in as: " + authData.uid);
        ref.child('users').child(authData.uid).once('value', function(snapshot) {
          var val = snapshot.val();
          $scope.$apply(function() {
            $rootScope.displayname = val;
          });
        });
        $ionicLoading.hide();
        $scope.modal.hide();
        $state.go('tab.rooms');
      }).catch(function(error) {
        alert("Authentication failed: " + error.message);
        $ionicLoading.hide();
        $scope.modal.hide();
      });
    } else {
      alert("Something went wrong! Please enter a valid email and password");
    }
  }
})

.controller('ChatCtrl', function ($scope, Chats, $state, $ionicModal) {
  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //
  //$scope.$on('$ionicView.enter', function(e) {
  //});

  // Sorting
  $scope.sortMethod = "createdAt";

  //Stamps

  $ionicModal.fromTemplateUrl('templates/stampModal.html', {
    scope: $scope
  }).then(function(stampModal) {
    $scope.stampModal = stampModal;
  });

  $scope.sendStamp = function (msg) {
    $scope.stampModal.hide()
    $scope.sendMessage($scope.displayname.displayname + 
      " sent a stamp (" + msg + ")");
  }

  // Chats
  console.log("Chat Controller Initialized");
  $scope.chats = Chats.all();

  $scope.IM = {
    textMessage: ""
  };

  roomIdNumber = $state.params.roomId;

  console.log($state);
  Chats.selectRoom(roomIdNumber);

  var roomName = Chats.getSelectedRoomName($scope.currentUserId);

  if (roomName) {
    $scope.roomName = " - " + roomName;
    $scope.chats = Chats.all();
  }

  // Delete items from hasNewChatsInRooms when viewed
  $scope.$on('$ionicView.enter', function (e) {
    
    console.log("ENTERED CHAT VIEW");
    
    // Destroying the 'new' indicator
    if (roomIdNumber) {
      ref.child('users').child($scope.currentUserId).child('hasNewChatsInRooms')
        .child(roomIdNumber).remove();
    }
    
  });

  $scope.sendMessage = function(msg) {
    console.log("SCOPE");
    console.log($scope);
    Chats.send($scope.displayname, $state.params.roomId, msg);
    $scope.IM.textMessage = "";

    // Add new message indicator to other user
    var otherId = Chats.getOtherId($scope.currentUserId);
    
    console.log(typeof roomIdNumber);

    ref.child('users').child(otherId).child('hasNewChatsInRooms')
      .child(roomIdNumber).set(parseInt(roomIdNumber));
  }

  $scope.remove = function(chat) {
    Chats.remove(chat);
  }
})

.controller('RoomsCtrl', function ($scope, Rooms, $state) {
  console.log("Rooms Controller Initialized");
  // var ref = new Firebase($scope.firebaseUrl);
  $scope.rooms = Rooms.all();

  $scope.isFirstUser;
  
  $scope.gender = "Male";
  $scope.grade = "2016";
  //$scope.rooms.whichNameUid -- exists but not declared here


  // Check for new chats
  $scope.$on('$ionicView.enter', function (e) {
    console.log("ENTERED ROOMS VIEW");
    ref.child('users').child($scope.currentUserId).child('hasNewChatsInRooms')
      .once('value', function (snapshot) {
         
        hasNewChatsInRooms = snapshot.val()

        var hasNewChatsInRoomsArray = [];

        for (var key in hasNewChatsInRooms) {
          // hasNewChatsInRoomsArray.push(hasNewChatsInRooms[key]);
          hasNewChatsInRoomsArray.push(hasNewChatsInRooms[key]);
        }

        $scope.hasNewChatsInRoomsArray = hasNewChatsInRoomsArray;

      });
  });
  
  $scope.openChatRoom = function(roomId) {
    $state.go('tab.chat', {
      roomId: roomId
    });
  };

  $scope.requestNewChat = function(gender, grade) {

    ref.child('usersLookingToChat').once('value', function (snapshot) {
      usersLookingToChat = snapshot.val();

      if (usersLookingToChat != null && 
          usersLookingToChat.hasOwnProperty(grade) && 
          usersLookingToChat[grade].hasOwnProperty(gender) ) {
        
        makeNewChat(
          $scope.currentUserId,
          $scope.displayname.displayname,
          usersLookingToChat[grade][gender]["id"],
          usersLookingToChat[grade][gender]["displayname"]
          );

      }
      else {
        ref.child('usersLookingToChat').child(grade).child(gender).set({
          displayname: $scope.displayname.displayname,
          id: $scope.currentUserId
        });
      }

    });


    // // Functional code with OpenToChat (now refactoring)
    // ref.child('users').once('value', function (snapshot) {
    //   var keepChecking = true;

    //   // Create object of all items in hasChatsWith property
    //   var hasChatsWith = snapshot.child($scope.currentUserId)
    //     .child('hasChatsWith').val();

    //   var hasChatsWithArray = [];
    //   for (var key in hasChatsWith) {
    //       hasChatsWithArray.push(hasChatsWith[key]);
    //   }

    //   console.log("Looking for chats");

    //   snapshot.forEach(function (userOpenToChat) {
    //     if (keepChecking) {

    //       var userRefId = userOpenToChat.key();

    //       if ( (userRefId != $scope.currentUserId) && 
    //       (hasChatsWithArray.indexOf(userRefId) === -1) ) {

    //         if (userOpenToChat.child('openToChat').val() &&
    //             userOpenToChat.child('profile').child('gender') == gender &&
    //             userOpenToChat.child('profile').child('grade') == grade
    //             ) {  

    //           var userRefName = userOpenToChat.child('displayname').val();
              
    //           makeNewChat($scope.currentUserId, $scope.displayname.displayname, userRefId, userRefName);
            
    //           // COMMENT OUT FOR DEVELOPMENT - UNCOMMENT LATER
    //           ref.child('users').child(userRefId).child('openToChat').set(false);
              
    //           keepChecking = false;
    //         }
    //       }
    //     }
    //   });

    //   if (keepChecking) {
    //     console.log("Looking for chats");
    //     alert("Waiting for someone else to connect...");
    //     ref.child('users').child($scope.currentUserId).child('openToChat').set(true);
    //   }
    // });
  };

  var makeNewChat = function(uid1, u1Name, uid2, u2Name) {
    var newIdNumber;
    ref.child('rooms').once('value', function (snapshot) {
      newIdNumber = snapshot.numChildren();
      
      while (snapshot.child(newIdNumber).exists()) {
        newIdNumber++;
      }
      
      ref.child('rooms').child(newIdNumber).set({
        'id': newIdNumber,
        //'name': 'Anonymous',
        'nameUid1': u2Name,
        'nameUid2': u1Name,
        'roomUid1': uid1,
        'roomUid2': uid2
      });
    });
  
  ref.child('users').child(uid1).child('hasChatsWith').push(uid2);
  ref.child('users').child(uid2).child('hasChatsWith').push(uid1);
  
  }
})

.controller('AccountCtrl', function ($scope, $ionicModal) {
  console.log("Account Controller Initialized");

  $ionicModal.fromTemplateUrl('templates/modalDisclaimer.html', {
    scope: $scope
  }).then(function(modalDisclaimer) {
    $scope.modalDisclaimer = modalDisclaimer;
  });

  console.log("$scope.currentUserId:", $scope.currentUserId);

  ref.child('users').once('value', function (snapshot) {
    $scope.sensitiveFirebase = snapshot.val();
  });


  $scope.updateProfile = function (gender) {
    console.log("run updateProfile");
    ref.child('users').child($scope.currentUserId).child('profile')
      .child('gender').set(gender);
  }

  $scope.generateNewNumber = function() {
    tempNumber = "310-"
    for (var i = 0; i < 3; i++) {
      tempNumber += Math.floor(Math.random() * 10);
    }
    tempNumber += "-";
    for (var i = 0; i < 4; i++) {
      tempNumber += Math.floor(Math.random() * 10);
    }
    $scope.number = tempNumber;
  }

  $scope.number = "";

});





