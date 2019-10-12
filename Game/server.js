var express = require('express');
var app = express();
var http = require('http').Server(app);
var fs = require('fs');
var io = require('socket.io')(http);

app.use(express.static('.'));

server = http.listen(7777, function() {
    console.log('Listening on port 7777');
});

process.on('exit', function() {
    console.log('About to exit, waiting for remaining connections');
    server.close();
});

process.on('SIGTERM', function() {
    console.log('About to exit, waiting for remaining connections');
    server.close();
});

var screens = [];

var ws;
function initLeapMotionRemote(ip) {
    WebSocket = require('ws');
    // Create and open the socket
    ws = new WebSocket("ws://" + ip + ":7778");

    // On successful connection
    ws.onopen = function(event) {
        console.log("Connected to Leap Motion server");
    };

    // On message received
    ws.onmessage = function(event) {
        var obj = JSON.parse(event.data);
        var str = JSON.stringify(obj, undefined, 2);
        if(!obj.id) {

        } else {
            console.log("Got LM frame");
            var data = JSON.parse(str);
            if (data.hands[0] !== undefined) {
                var palmHeight = data.hands[0].palmPosition[1];
                var palmHorizontal = data.hands[0].palmPosition[0];

                // Normalize vertical
                palmHeight -= 100;
                if (palmHeight < 0) {
                    palmHeight = 0;
                } else if (palmHeight > 300) {
                    palmHeight = 300;
                }
                palmHeight = 300 - palmHeight;
                // Normalize horizontal
                if (palmHorizontal < -200) {
                    palmHorizontal = -200;
                } else if (palmHorizontal > 200) {
                    palmHorizontal = 200;
                }
                palmHorizontal += 200;
                palmHorizontal *= 8;
            }
            if (data.gestures.length > 0) {
                // console.log(data.gestures)
                console.log("Gesture: " + data.gestures[0].type)
            }
        }
    };

    // On socket close
    ws.onclose = function(event) {
        ws = null;
        console.log("Leap Motion socket closed");
    };

    // On socket error
    ws.onerror = function(event) {
        console.log("Leap Motion socket error: " + event);
    };
}

io.on('connection', function(socket) {
    screens.push(socket);
    console.log('Screen connected as screen #' + screens.length);

    socket.on('disconnect', function() {
        var screen = getScreenNumber(socket);
        if (screen > -1) {
            console.log('Screen ' + getScreenNumber(socket) + ' disconnected');
            screens = [];
        }
    });

});

function getScreenNumber(socket) {
    for (var i = 0; i < screens.length; i++) {
        if (screens[i] === socket) {
            return i + 1
        }
    }
    return -1
}