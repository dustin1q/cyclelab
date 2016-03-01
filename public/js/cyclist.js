(function($) {

  // variable for flashing notification
  var flash,
      socket,
      isoList,
      leader = false,
      totalTime = 0,
      intervalTime = 0,
      interval = 0,
      totalTimer,
      $timeElem,
      $intervalElem,
      $interval,
      ilastStart = 0,
      iLastTime = 0,
      intervalStarted;

  $(document).ready(function() {

    if(window.location.pathname === "/instructor") {
      leader = true;
    }

    $timeElem = $('.total-time');
    $intervalElem = $('.interval-time');
    $interval = $('.interval');

  // set up socket and event handlers
    socket = io.connect('http://' + ip, {query:'leader='+leader});

    socket.on('listLoad', function (data) {
      createList(data.list);

      totalTime = Number(data.totalTime);
      intervalTime = Number(data.intervalTime);

      updateTimer($timeElem, totalTime);
      updateTimer($intervalElem, intervalTime);
      updateInterval(data.interval);
    });

    socket.on('players', function (data) {
      playersChanged(data.id, data.playerName, data.action);
    });

    socket.on('startTime', function (data) {
      totalTime = Number(data.totalTime);
      updateTimer($timeElem, totalTime);
      startTime();
    });

    socket.on('startInterval', function (data) {

      intervalTime = Number(data.intervalTime);

      updateTimer($intervalElem, intervalTime);
      updateInterval(data.interval);

      startInterval();
    });

    socket.on('stopTime', function () {
      stopTime();
    });

    socket.on('reset', function () {
      restInterval();
      stopTime();

      totalTime = 0;
      intervalTime = 0;

      updateTimer($timeElem, totalTime);
      updateTimer($intervalElem, intervalTime);
    });

    socket.on('stopInterval', function (data) {
      restInterval();

      updateTimer($intervalElem, data.intervalTime);
      updateInterval(data.interval);
    });

    if(leader) {
      socket.on('showControls', function () {
        $("#welcome").css("display", "none");
        $('.controls').show();
        startSession();
        bindLeader();
      });
    } else {
      $("#submit").on("click", sendName);
    }

    //Set Up Isotope
    isoList = $("#ranking-list").isotope({
      itemSelector: 'li',
      layoutMode: 'vertical',
      getSortData: {
        points: '.score parseInt'
      },
      sortBy: 'points',
      sortAscending: false
    });

  });



  function sendName() {
    $("#welcome").css("display", "none");
    var name = $("#name").val();
    socket.emit('name', {playerName:name});
    startSession();
  }

  function startSession() {
    $('body').addClass('started');
  }

  // add or remove a player from the list
  function playersChanged($id, $name, $action) {

    // flash a notification on the screen
    var elem = '<p data-id="' + $id + '">' + $name + ' has ' + $action + ' the party.</p>';
    $("#message").append(elem);
    setTimeout(function() {
      $("#message").find('p[data-id=' + $id + ']').addClass('flash');
      setTimeout(function() {
        $("#message").find('p[data-id=' + $id + ']').removeClass('flash');
        setTimeout(function() {
          $("#message").find('p[data-id=' + $id + ']').remove();
        }, 750);
      }, 2500);
    }, 100);

    // add or remove the list item
    if($action == "left") {
      $('#ranking-list').isotope('remove', $('li[data-id=' + $id + ']'));
    } else {
      var elem = '<li data-id="' + $id + '"><div class="name">' + $name + '</div></li>';
      $('#ranking-list').isotope('insert', $(elem));
    }

    isoList.isotope('updateSortData').isotope();
  }

  // update the page with an existing list of players
  function createList(list) {
    for(var k in list) {
      elem = '<li data-id="' + k + '"><div class="name">' + list[k].name + '</div></li>';
      $('#ranking-list').isotope('insert', $(elem));
    }
  }

  function bindLeader() {
    $('.controls .btn').on('click',function(e) {
      // resetButtons();
      // $(this).addClass('btn-primary');
      var type = $(this).parent().parent().data("type");
      var action = $(this).data("type");
      socket.emit('controlButtonClick', {type:type,action:action});
    });
  }

  function resetButtons() {
    // $('.controls .btn.btn-primary').removeClass('btn-primary');
  }

  // continue the timer
  function startTime() {
    var timeDiff,
        tlastStart,
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

          updateTimer($intervalElem, intervalTime);
        }

        updateTimer($timeElem, totalTime);

    }, 1000);
  }

  // continue the interval
  function startInterval() {

    ilastStart = new Date().getTime();

    iLastTime = intervalTime;
    intervalStarted = true;
  }

  function stopTime() {
    clearInterval(totalTimer);
  }

  function restInterval() {
    intervalStarted = false;
  }

  function updateTimer(elem, t) {
      var hour = Math.floor(t/60/60) > 9 ? "" + Math.floor(t/60/60): "0" + Math.floor(t/60/60);
      var min = Math.floor(t/60%60) > 9 ? "" + Math.floor(t/60%60): "0" + Math.floor(t/60%60);
      var sec = Math.floor(t)%60 > 9 ? "" + Math.floor(t)%60: "0" + Math.floor(t)%60;

      elem.html(hour + ":" + min + ":" + sec);
  }

  function updateInterval(interval) {
    $interval.html(interval);
  }
})(jQuery);