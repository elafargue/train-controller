/**
 * The Node.js backend server that communicates with the hardware and serves the
 * HTML web app.
 *
 * This server does two things:
 *
 * Manages the persistence layer for the objects handled by the web app:
 *    - Model train layouts
 *       - Model train layouts also contain accessories
 *    - Model train locomotives
 *    - Model train controllers
 *
 * Handles call to the train controllers, either on an IP network, or on
 * local serial ports in case a controller is connected to the same hardware
 * as the server.
 *
 * (c) 2013 Edouard Lafargue
 *  License: GPLv3
 */


/**
 *   Setup the serial port
 */

/*
var serialport = require("serialport"),
    SerialPort  = serialport.SerialPort;
var portName = process.argv[2];
console.log("Using opening serial port: " + portName);

//  This opens the serial port:
var myPort = new SerialPort(portName, {
   baudRate: 9600,
   dataBits: 8,
   parity: 'none',
   stopBits: 1,
   flowControl: false,
   // look for return and newline at the end of each data packet:
   parser: serialport.parsers.readline("\r\n")
});

*/

/**
 * Setup Db connection before anything else
 */
require('./db.js');

/**
 * Setup the HTTP server and routes
 */
var express = require('express'),
    loco = require('./routes/locomotives.js'),
    controllers = require('./routes/controllers.js'),
    layouts = require('./routes/layouts.js'),
    settings = require('./routes/settings.js');

var app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server);

app.configure(function () {
    app.use(express.logger('dev'));     /* 'default', 'short', 'tiny', 'dev' */
    app.use(express.favicon()); // Test please
    app.use(express.bodyParser({ keepExtensions: true, uploadDir: __dirname + "/public/pics/tmp" }));
});

server.listen(8000);
console.log("Listening for new clients on port 8000");
var connected = false;

/**
 * Interface for managing the locomotives
 */
app.get('/locos', loco.findAll);
app.get('/locos/:id', loco.findById);
app.post('/locos', loco.addLoco);
app.post('/locos/:id/picture', loco.uploadPic);
app.put('/locos/:id', loco.updateLoco);
app.delete('/locos/:id', loco.deleteLoco);

/**
 * Interface for managing the layouts
 */
app.get('/layouts', layouts.findAll);
app.get('/layouts/:id', layouts.findById);
app.post('/layouts', layouts.addLayout);
app.put('/layouts/:id', layouts.updateLayout);
app.post('/layouts/:id/picture', layouts.uploadPic);
app.delete('/layouts/:id', layouts.deleteLayout);

/**
 * Interface for our settings. Only get/put
 */
app.get('/settings', settings.getSettings);
app.put('/settings/:id', settings.updateSettings);

 
// Our static resources are in 'public'
// GET /javascripts/jquery.js
// GET /style.css
// GET /favicon.ico
app.use(express.static(__dirname + '/public'));

// listen for new socket.io connections:
io.sockets.on('connection', function (socket) {
	// if the client connects:
	if (!connected) {
            console.log('user connected');
            myPort.flush();
            connected = true;
        }

        // if the client disconnects:
        socket.on('disconnect', function () {
             console.log('user disconnected');
             connected = false;
        });

        // listen for new serial data:  
        myPort.on('data', function (data) {
             // Convert the string into a JSON object:
             var serialData = JSON.parse(data);
             // for debugging, you should see this in the terminal window:
             console.log(data);
             // send a serial event to the web client with the data:
             socket.emit('serialEvent', serialData);
        });
});
