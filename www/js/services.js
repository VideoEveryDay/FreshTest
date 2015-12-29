angular.module('mychat.services', ['firebase'])
  .factory('Auth', ['$firebaseAuth', '$rootScope', function($firebaseAuth, $rootScope) {
    return $firebaseAuth(ref);
  }])

  .factory('Rooms', function($firebaseArray) {
    var rooms = $firebaseArray(ref.child('rooms'));

    return {
      all: function() {
        return rooms;
      },
      get: function(roomId) {
        return rooms.$getRecord(roomId);
      }
    }
  })

  .factory('Chats', function($firebaseArray, Rooms) {
    var selectedRoomId;
    var chats;

    return {
      all: function() {
        return chats;
      },
      remove: function(chat) {
        chats.$remove(chat).then(function(ref) {
          ref.key() === chat.$id;
        });
      }, 
      get: function(chatId) {
        for (var i = 0; i < chats.length(); i++) {
          // why parseInt? I think this is now broken but unused code
          if (chats[i].id === parseInt(chatId)) {
            return chats[i];
          }
        }
        return null;
      },
      getOtherId: function (currentUserId) {
        var selectedRoom;
        if (selectedRoomId && selectedRoomId != null) {
          selectedRoom = Rooms.get(selectedRoomId);
          if (selectedRoom) {
            if (currentUserId === selectedRoom.roomUid1)
              return selectedRoom.roomUid2;
            else if (currentUserId === selectedRoom.roomUid2)
              return selectedRoom.roomUid1;
            else
              console.log("Error getting the other id");
          }
        } else
            return null;
      },
      getSelectedRoomName: function(currentUserId) {
        var selectedRoom;
        if (selectedRoomId && selectedRoomId != null) {
          selectedRoom = Rooms.get(selectedRoomId);
          if (selectedRoom) {
            if (currentUserId === selectedRoom.roomUid1)
              return selectedRoom.nameUid1;
            else if (currentUserId === selectedRoom.roomUid2)
              return selectedRoom.nameUid2;
            else
              return null;
          }
        } else
            return null;
      },
      selectRoom: function(roomId) {
        if (!roomId) {
          console.log("NOT ROOMID");
        }
        else {
          console.log("Selecting room with id " + roomId);
          console.log(!isNaN(roomId))
          selectedRoomId = roomId;
          // if (!isNaN(roomId)) { // Figure out why this was here
          chats = $firebaseArray(ref.child('rooms').child(roomId).child('chats'));
          // }
        }
      }, 
      send: function(from, chatId, message) {
        console.log("sending message from: " + from.displayname + ". Message is: " + message);
        if (from && message) {
          var chatMessage = {
            from: from.displayname,
            message: message,
            createdAt: Firebase.ServerValue.TIMESTAMP
          };
          // chats.$add(chatMessage).then(function(data) {
          //   console.log("Message added");
          // });
          console.log(chatId);
          console.log(chatMessage);
          
          // Add chat to room
          ref.child('rooms').child(chatId).child('chats').push(chatMessage);

        }
      }
    }
  });