(function() {

  // load external files and plugins
var express = require('express')
  ,app = express()
  ,server = require('http').createServer(app)
  ,io = require('socket.io').listen(server)
  ,fs = require('fs');

server.listen(3000);

// initialize app variables
var list = {},
    refUrl = "",
    userType = "",
    totalTime = 0,
    intervalTime = 0,
    interval = 0,
    totalTimer,
    intervalTimer,
    timeStarted,
    intervalStarted,
    ilastStart,
    iLastTime;

console.log("Express server listening on port 3000");


// when static pages and files are requested on the server,
// check for them in this directory
app.use(express.static('public'));
app.use(function (req, res){
    res.send("works");
});


//get the file requested and write it to the page
app.get('*', function(req, res) {

    // look for pages in the routes folder and handle requests to the root page
    if(req.url === "/instructor") {
      refUrl = "/routes/cyclist.html";
    } else {
      refUrl = "/routes/cyclist.html";
    }

    fs.readFile(__dirname + refUrl,
    function (err, data) {
      if (err) {
        res.writeHead(500);
        return res.end('Error loading: ' + refUrl);
      }

      res.writeHead(200);
      res.end(data);
    });
});


io.sockets.on('connection', function (socket) {
  // load any existing player list for leaderboard
  if(refUrl === "/routes/cyclist.html") {

    //initialize a new player at question 1
    if(socket.manager.handshaken[socket.id].query.leader === "true") {
      socket.instructor = true;

      socket.emit("showControls");


      socket.emit("listLoad", {list:list,
                            totalTime:totalTime,
                            intervalTime:intervalTime,
                            interval:interval});

      socket.on('controlButtonClick', function (data) {

        switch(data.action) {

          case "start":
            startTime(data.type);
            break;

          case "stop":
            stopTime(data.type);
            break;

          case "rest":
            stopTime(data.type);
            break;

          case "reset":
            reset();
            break;

          case "clear":
            clearinterval();
            break;
        }
      });

    } else {
      newPlayer(socket);

      // set the name of the new player
      socket.on('name', function (data) {
        list[socket.playerID] = {
          name: data.playerName
        };

        // send new player details out to all
        var playerDetails = {
          id: socket.playerID,
          playerName: data.playerName,
          action: 'joined'
        };

        socket.emit("listLoad", {list:list,
                            totalTime:totalTime,
                            intervalTime:intervalTime,
                            interval:interval});

        socket.broadcast.to("room").emit('players', playerDetails);
      });
    }

    if(timeStarted) {
      if(intervalStarted) {
        socket.emit("startInterval", {intervalTime:intervalTime});
      }
      socket.emit("startTime", {totalTime:totalTime});
    }

    socket.join("room");

  }

  // remove a named player on disconnect
  socket.on('disconnect', function () {
    if(list[socket.playerID]) {
      var data = {
        id: socket.playerID,
        playerName: list[socket.playerID].name,
        action: 'left'
      };
      delete list[socket.playerID];
      socket.broadcast.to("room").emit('players', data);
    }
  });
});

function newPlayer(socket) {
  var random = Math.floor(Math.random() * 1000);
  if(list[random]) {
    console.log("Duplicate id! Trying again...");
    newPlayer(socket);
    return false;
  }
  socket.playerID = random;
}

// continue the timer
function startTime(type, socket) {
  switch(type) {

    case "time":
      if(!timeStarted) {

        io.sockets.in("room").emit('startTime', {totalTime:totalTime});
        timeStarted = true;

        var timeDiff,
            lastStart,
            lastTotalTime = totalTime,
            intervalDiff;

        lastStart = new Date().getTime();

        totalTimer = setInterval(function(){

            timeDiff = new Date().getTime() - lastStart;
            timeDiff = Math.floor(timeDiff/100/10);

            totalTime = Number(lastTotalTime) + Number(timeDiff);

            if(intervalStarted) {

              intervalDiff = new Date().getTime() - ilastStart;
              intervalDiff = Math.floor(intervalDiff/100/10);

              intervalTime = iLastTime + Number(intervalDiff);
            }

        }, 1000);
      }
      break;

    case "interval":

      ilastStart = new Date().getTime();

      iLastTime = intervalTime;

      if(intervalStarted && timeStarted) {
        interval++;
        intervalTime = 0;
        iLastTime = 0;
      }

      io.sockets.in("room").emit('startInterval', {intervalTime:intervalTime, interval: interval});
      intervalStarted = true;

      if(!timeStarted) {
        startTime("time");
      }
      break;
  }
}

function stopTime(type) {
  switch(type) {

    case "time":
      timeStarted = false;
      io.sockets.in("room").emit('stopTime');
      clearInterval(totalTimer);
      break;

    case "interval":
      intervalStarted = false;
      io.sockets.in("room").emit('stopInterval', {intervalTime:intervalTime, interval: interval});
      break;
    }
}

function reset() {
  stopTime("time");
  stopTime("interval");

  totalTime = 0;
  intervalTime = 0;
  interval = 0;

  io.sockets.in("room").emit('reset');
}

function clearinterval() {
  intervalTime = 0;
  interval = 0;
  stopTime("interval");
}
})();