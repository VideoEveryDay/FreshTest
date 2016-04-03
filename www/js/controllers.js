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
        //local storage store password
        localStorage['username'] = user.email;
        localStorage['password'] = user.pwdForLogin;
        // end localStorage stuff
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

  // // If password saved, log user in // ENABLE FOR PRODUCTION
  if (localStorage.getItem("username") && localStorage.getItem("password")) {
    $scope.signIn({
      email: localStorage.getItem("username"),
      pwdForLogin: localStorage.getItem("password")
    });
  }

})

.controller('ChatCtrl', function ($scope, $state, $timeout, $ionicModal) {
  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //
  
  // $scope.$on('$ionicView.enter', function(e) {
    
  // });

  // Chats
  console.log("Chat Controller Initialized");
  $scope.chats;
  $scope.deletedById;
  $scope.IM;
  var selectedRoomId, roomName, roomIdNumber;
  
  
  function getOtherId() {
    var myUid = $scope.currentUserId;
    var otherUserUid;
    ref.child('users').child(myUid).child('hasChatsWith').child(
      roomIdNumber).child('uid').once('value', function (snapshot) {
        otherUserUid = snapshot.val();
      });
    return otherUserUid;
  }

  
  $scope.$on('$ionicView.enter', function(e) {
    roomIdNumber = $state.params.roomId;
    $scope.IM = {
      textMessage: ""
    };
    
    // Get roomname
    ref.child('rooms').child(roomIdNumber).once('value', function (snapshot) {
        if (snapshot.child('roomUid1').val() === $scope.currentUserId) {
          $scope.roomName = snapshot.child('nameUid1').val()
        } 
        else if (snapshot.child('roomUid2').val() === $scope.currentUserId) {
          $scope.roomName = snapshot.child('nameUid2').val()
        } 
        else {
          console.log("Error getting roomName");
        }
    }); 
    
    // Could be refactored with 'child_added' but this should work for now
    ref.child('rooms').child(roomIdNumber).child('chats').on('value', function (snapshot) {
      // use $timeout to actually update DOM when Firebase changes
      var chats = snapshot.val();
      $timeout(function() {
        $scope.chats = chats;
      });
      
      for (var key in chats) {
        if (key === 'deleted') {
          $timeout(function() {
            $scope.deletedById = chats['deleted']['deletedById']; 
          });
        }
      }

    });
  });

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

  $scope.sendMessage = function(msg) {
    if (msg === "") { alert("Please add a message."); }

    else if ($scope.displayname.displayname && msg) {
      var chat = {
        from: $scope.displayname.displayname,
        message: msg,
        createdAt: Firebase.ServerValue.TIMESTAMP
      };

      ref.child('rooms').child(roomIdNumber).child('chats').push(chat, 
        function (error) { if (error) { console.log("Error sending message"); } });

      // last message
      var truncatedMsg = (msg.length > 30) ? msg.substring(0,30) + "..." : msg;
      var otherUserUid = getOtherId();
      console.log(otherUserUid);
      ref.child('users').child($scope.currentUserId).child('hasChatsWith').child(
        roomIdNumber).child('lastMessage').set(truncatedMsg);
      ref.child('users').child(otherUserUid).child('hasChatsWith').child(
        roomIdNumber).child('lastMessage').set(truncatedMsg);      

      // ref.child('rooms').child(roomIdNumber).child('chats').push(chat, 
      //   function (error) { if (error) { console.log("Error sending message"); } });

      $scope.IM.textMessage = "";
    }
  }

  $scope.confirmRemove = function(id) {
    // Before remove, save to backup Firebase
    ref.child('rooms').child(id).once('value', function (snapshot) {
      deleteRef.push(snapshot.val(), function() {
        // Once save is complete, delete from regular Firebase
        ref.child('rooms').child(id).remove();
        // Find out other user id
        otherUserUid = getOtherId();
        // Delete from hasChatsWith on both accounts
        ref.child('users').child(myUid).child('hasChatsWith').child(
          roomIdNumber).remove();
        ref.child('users').child(otherUserUid).child('hasChatsWith').child(
          roomIdNumber).remove();
      });
    });
  }

  $scope.back = function() {
    $state.go('tab.rooms');
  }

})

.controller('RoomsCtrl', function ($scope, $state, $timeout) {
  console.log("Rooms Controller Initialized");
  $scope.rooms = new Array;
  hasChatsWithIdArray = new Array;
  // $scope.isFirstUser;

  // // Get rooms
  // if ($scope.currentUserId) {
  //   // First figure out which nodes to check
  //   ref.child('users').child($scope.currentUserId).child('hasChatsWith').once('value', 
  //     function (snapshot) {
  //       hasChatsWith = snapshot.val();
  //       for (var key in hasChatsWith) {
  //         roomsArray.push(key);
  //       }
  //     });
  // }
  // else { console.log("Error getting currentUserId"); }

  if ($scope.currentUserId) { console.log("currentUserId is defined!"); }
  else { console.log("currentUserId is NOT defined!"); }

  ref.child('users').child($scope.currentUserId).child('hasChatsWith').on('value',
    function (snapshot) {
      roomsArray = [];
      hasChatsWith = snapshot.val();
      for (var key in hasChatsWith) {
        // First add id to array of ids for later use checking duplicates
        hasChatsWithIdArray.push(hasChatsWith[key]['uid']);

        // Then push object to array of rooms to display all rooms
        roomsArray.push({
          'id': key,
          'uid': hasChatsWith[key]['uid'],
          'name': hasChatsWith[key]['name'],
          'lastMessage': hasChatsWith[key]['lastMessage'] // last message
        });
      }
      // Then update the scope with $timeout
      $timeout(function() {
        $scope.rooms = roomsArray;
      });
    });

  // // Then get those rooms and place them into the array
  // ref.child('rooms').on('value', function (snapshot) {
  //   // use $timeout to update DOM on Firebase change
  //   $timeout(function() {
  //     $scope.rooms = snapshot.val();
  //   });
  // });

  $scope.grade = "2017"; // change based on displayname.profile.gender
  $scope.gender = "Male"; // equal to displayname.profile.grade

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
          message: $scope.displayname.displayname + " has deleted this chat."
        }, function(error) {
          if (error) { console.log(error); }
          else { alert("Deletion pending."); }
        });
      }
    });
  }

  // I should set up a factory for this function
  $scope.confirmRemove = function (id) {
    // Before remove, save to backup Firebase
    ref.child('rooms').child(id).once('value', function (snapshot) {
      deleteRef.push(snapshot.val(), function() {
        // Once save is complete, delete from regular Firebase
        ref.child('rooms').child(id).remove();
        // Find out other user id
        var myUid = $scope.currentUserId;
        var otherUserUid;
        ref.child('users').child(myUid).child('hasChatsWith').child(
          id).child('uid').once('value', function (snapshot) {
            otherUserUid = snapshot.val();
          });
        // Delete from hasChatsWith on both accounts
        ref.child('users').child(myUid).child('hasChatsWith').child(id).remove();
        ref.child('users').child(otherUserUid).child('hasChatsWith').child(id).remove();
      });
    });
  }
  
  $scope.openChatRoom = function(roomId) {
    $state.go('tab.chat', {
      roomId: roomId
    });
  };

  $scope.requestNewChat = function(gender, grade) {

    // Still need to implement no duplicate chats
    // should be able to use hasChatsWithIdArray
    // hasChatsWithArray = []
    // ref.child('users').child($scope.currentUserId).child('hasChatsWith')
    //   .child('uid').once('value', function (snapshot) {
    //     hasChatsWithObject = snapshot.val();
    //     for (var key in hasChatsWithObject) {
    //       hasChatsWithArray.push(hasChatsWithObject[key]);
    //     }
    // });
    // console.log("hasChatsWithArray:");
    // console.log(hasChatsWithArray);

    ref.child('usersLookingToChat').once('value', function (snapshot) {
      myGender = $scope.displayname.profile.gender;
      myGrade = $scope.displayname.profile.grade;
      lookingForOtherType = myGender + myGrade + ":" + gender + grade;
      lookingForMeType = gender + grade + ":" + myGender + myGrade;

      usersLookingToChat = snapshot.val();
      var foundMatch;

      for (var prop in usersLookingToChat) {
        // Match found in Firebase
        if (usersLookingToChat[prop]["type"] == lookingForMeType && 
            usersLookingToChat[prop]["id"] != $scope.currentUserId) {

          makeNewChat(
            $scope.currentUserId,
            $scope.displayname.displayname,
            usersLookingToChat[prop]["id"],
            usersLookingToChat[prop]["displayname"]
            );

          // Remove the match
          ref.child('usersLookingToChat').child(prop).remove();

          foundMatch = true; break;
        }
        // If dulpicate request, end loop and do nothing          
        else if (usersLookingToChat[prop]["id"] == $scope.currentUserId &&
                 usersLookingToChat[prop]["type"] == lookingForOtherType) {
          foundMatch = true; break;
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
    var newChatLocation = ref.child('rooms').push()
    var newRoomInfo = {
      'nameUid1': u2Name,
      'nameUid2': u1Name,
      'roomUid1': uid1,
      'roomUid2': uid2
    }
    
    newChatLocation.set(newRoomInfo, function (error) {
      if (error) { console.log("Error making new chat"); }
      else {
        var newChatLocationId = newChatLocation.key();
        newChatLocation.child('id').set(newChatLocationId);

        ref.child('users').child(uid1).child('hasChatsWith').child(
          newChatLocationId).set({
            'uid': uid2,
            'name': u2Name,
            'lastMessage': "" // last message
          });
        ref.child('users').child(uid2).child('hasChatsWith').child(
          newChatLocationId).set({
            'uid': uid1,
            'name': u1Name,
            'lastMessage': "" // last message
          });
      }
    });
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





