angular.module('mychat.controllers', ['firebase'])

.controller('LoginCtrl', function ($scope, $ionicModal, $state, $firebaseAuth, $ionicLoading, $rootScope) {
  console.log("Login Controller Initialized");

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

.controller('ChatCtrl', function ($scope, $state, $ionicModal) {
  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //
  //$scope.$on('$ionicView.enter', function(e) {
  //});

  // Chats
  console.log("Chat Controller Initialized");
  $scope.chats = new Array;
  $scope.deletedById;
  var selectedRoomId, roomName;

  $scope.IM = {
    textMessage: ""
  };

  roomIdNumber = $state.params.roomId;

  // Get roomname
  ref.child('rooms').child(roomIdNumber).once('value', function (snapshot){
      if (snapshot.child('roomUid1').val() === $scope.currentUserId) {
        roomName = snapshot.child('nameUid1').val()
      } 
      else if (snapshot.child('roomUid2').val() === $scope.currentUserId) {
        roomName = snapshot.child('nameUid2').val()
      } 
      else {
        console.log("Error getting roomName");
      }
  }); 
  
  // Connect $scope.chats to Firebase
  if (roomName) {
    $scope.roomName = " - " + roomName;

    ref.child('rooms').child(roomIdNumber).child('chats').on('value', function (snapshot) {
      chats = snapshot.val(); // object of chats
      $scope.chats = []; // get rid of old chats
      console.log(chats);
      for (var key in chats) {
        if (key === 'deleted') {
          $scope.deletedById = chats['deleted']['deletedById'];
        }
        if (chats.hasOwnProperty(key)) {
          $scope.chats.push(chats[key]); // push value to array of chats
        }
      }
    });
  }
  

  $ionicModal.fromTemplateUrl('templates/modalReport.html', {
    scope: $scope
  }).then(function(modalReport) {
    $scope.modalReport = modalReport;
  });

  $scope.report = function(msg) {

    ref.child('reports').push({
      roomId: roomIdNumber, 
      sender: $scope.displayname.displayname,
      senderId: $scope.currentUserId,
      senderEmail: $scope.displayname.email,
      message: msg
    });
    
    deleteRef.child('reports').push({
      roomId: roomIdNumber, 
      sender: $scope.displayname.displayname,
      senderId: $scope.currentUserId,
      senderEmail: $scope.displayname.email,
      message: msg
    });

    $scope.modalReport.hide();
  }

  // // Delete items from hasNewChatsInRooms when viewed
  // $scope.$on('$ionicView.enter', function (e) {
    
  //   console.log("ENTERED CHAT VIEW");
    
  //   // Destroying the 'new' indicator
  //   if (roomIdNumber) {
  //     ref.child('users').child($scope.currentUserId).child('hasNewChatsInRooms')
  //       .child(roomIdNumber).remove();
  //   }
    
  // });

  $scope.sendMessage = function(msg) {
    if (msg === "") { alert("Please add a message."); }

    else if ($scope.displayname.displayname && msg) {
      var chat = {
        from: $scope.displayname.displayname,
        message: msg,
        createdAt: Firebase.ServerValue.TIMESTAMP
      };

      ref.child('rooms').child(roomIdNumber).child('chats').push(chat, 
        function (error) {
          if (error) {console.log("Error sending message");}
          else { $scope.IM.textMessage = ""; }
      });
    }
  }

  $scope.confirmRemove = function() {
    console.log("confirmRemove()");
    // Before remove, save to backup Firebase
    ref.child('rooms').child(roomIdNumber).once('value', function (snapshot) {
      deleteRef.push(snapshot.val(), function() {
        // Once save is complete, delete from regular Firebase
        $state.go('tab.rooms');
        ref.child('rooms').child(roomIdNumber).remove();
      });
    });
  }

})

.controller('RoomsCtrl', function ($scope, Rooms, $state) {
  console.log("Rooms Controller Initialized");
  $scope.rooms = Rooms.all();

  $scope.isFirstUser;
  
  // console.log($scope.displayname);

  // $scope.gender = ($scope.displayname.profile.gender == "Male") ? "Female": "Male";
  // $scope.grade = $scope.displayname.profile.grade;

  $scope.grade = "2017";
  $scope.gender = "Male";

  //$scope.rooms.whichNameUid -- exists but not declared here

  // // Check for new chats
  // $scope.$on('$ionicView.enter', function (e) {
  //   console.log("ENTERED ROOMS VIEW");
  //   ref.child('users').child($scope.currentUserId).child('hasNewChatsInRooms')
  //     .once('value', function (snapshot) {
         
  //       hasNewChatsInRooms = snapshot.val()

  //       var hasNewChatsInRoomsArray = [];

  //       for (var key in hasNewChatsInRooms) {
  //         // hasNewChatsInRoomsArray.push(hasNewChatsInRooms[key]);
  //         hasNewChatsInRoomsArray.push(hasNewChatsInRooms[key]);
  //       }

  //       $scope.hasNewChatsInRoomsArray = hasNewChatsInRoomsArray;

  //     });
  // });

  /* Need to change this so that it doesn't ztcually delete but instead sends a
  special message requesting that the chat be deleted with a button that allows
  the other user to actually delete the chat. It should make deleted (child of 
  chat id) true. */
  
  $scope.askToRemove = function (id) {
    ref.child('rooms').child(id).child('chats').once('value', function (snapshot) {
      if (snapshot.child('deleted').exists() && 
          snapshot.child('deleted').child('deletedById').val() 
          != $scope.currentUserId) {
        $scope.confirmRemove(id);
      }
      else { 
        ref.child('rooms').child(id).child('chats').child('deleted').set({
          deletedById: $scope.currentUserId,
          from: "End of Chat",
          message: $scope.displayname.displayname + " has deleted this message."
        }, function(error) {
          if (error) { console.log(error); }
          else { alert("Deletion pending."); }
        });
      }
    });
  }

  $scope.confirmRemove = function (id) {
    // Before remove, save to backup Firebase
    ref.child('rooms').child(id).once('value', function (snapshot) {
      deleteRef.push(snapshot.val(), function() {
        // Once save is complete, delete from regular Firebase
        ref.child('rooms').child(id).remove();
      });
    });
  }
  
  $scope.openChatRoom = function(roomId) {
    $state.go('tab.chat', {
      roomId: roomId
    });
  };

  $scope.requestNewChat = function(gender, grade) {

    ref.child('usersLookingToChat').once('value', function (snapshot) {
      myGender = $scope.displayname.profile.gender;
      myGrade = $scope.displayname.profile.grade;
      lookingForOtherType = myGender + myGrade + ":" + gender + grade;
      lookingForMeType = gender + grade + ":" + myGender + myGrade;

      usersLookingToChat = snapshot.val();
      var foundMatch = false;

      /* Loop through properties and check if any equal what we want in the form
      personlooking_gendergrade:lookingfor_gendergrade */

      for (var prop in usersLookingToChat) {
        if (usersLookingToChat.hasOwnProperty(prop)) {
          // Check if good match
          if (usersLookingToChat[prop]["type"] == lookingForMeType) {  

            makeNewChat(
              $scope.currentUserId,
              $scope.displayname.displayname,
              usersLookingToChat[prop]["id"],
              usersLookingToChat[prop]["displayname"]
              );

            foundMatch = true;
            break;
          }
          // If dulpicate request, end loop and do nothing          
          else if (usersLookingToChat[prop]["id"] == $scope.currentUserId &&
                   usersLookingToChat[prop]["type"] == lookingForOtherType) {
            foundMatch = true;
            break;
          }
        }
      }
      
      if (!(foundMatch)) {
        ref.child('usersLookingToChat').push({
          type: lookingForOtherType,
          displayname: $scope.displayname.displayname,
          id: $scope.currentUserId
        });
        alert("Waiting for a " + grade + " " + gender + " to connect.");
      }

    });
  };

  var makeNewChat = function(uid1, u1Name, uid2, u2Name) {
    var newIdNumber;

    var newChatLocation = ref.child('rooms').push();
    newChatLocation.set({
      'nameUid1': u2Name,
      'nameUid2': u1Name,
      'roomUid1': uid1,
      'roomUid2': uid2
    }, function() {
      newChatLocation.child('id').set( newChatLocation.key() );
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


  // $scope.updateProfile = function (gender) {
  //   console.log("run updateProfile");
  //   ref.child('users').child($scope.currentUserId).child('profile')
  //     .child('gender').set(gender);
  // }

});





