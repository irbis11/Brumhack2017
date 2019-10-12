var express = require('express');
var app = express();
var http = require('http').Server(app);
var fs = require('fs');
var io = require('socket.io')(http);

process.on('exit', function() {
    console.log('About to exit, waiting for remaining connections');
    server.close();
});

process.on('SIGTERM', function() {
    console.log('About to exit, waiting for remaining connections');
    server.close();
});

var client = undefined;

var WebSocketServer = require('ws').Server, wss = new WebSocketServer({port: 7778});
wss.on('connection', function(ws) {
    client = ws;
    console.log("Client connected");

    ws.on('disconnect', function() {
        client = undefined;
    });
});

var counter = 0;

var ws;
function initLeapMotion() {
    WebSocket = require('ws');
    // Create and open the socket
    ws = new WebSocket("ws://localhost:6437/v6.json");//use latest

    // On successful connection
    ws.onopen = function(event) {
        console.log("Connected to LM");
        var enableMessage = JSON.stringify({enableGestures: true});
        ws.send(enableMessage); // Enable gestures
        ws.send(JSON.stringify({focused: true})); // claim focus
    };

    // On message received
    ws.onmessage = function(event) {
        //console.log("Got LM data");
        var obj = JSON.parse(event.data);
        var str = JSON.stringify(obj, undefined, 2);
        if(!obj.id) {

        } else {
            if (client !== undefined) {
                counter++;
                if (counter > 5) {
                    counter = 0;
                    console.log("Sending LM data," +  Math.random());
                    client.send(str);
                }
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
        console.log("Leap Motion socket error");
    };
}

initLeapMotion();
