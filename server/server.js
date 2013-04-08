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
 * (c) 2013 Edouard Lafargue, edouard@lafargue.name
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


/**
 *   Setup access to serial ports
 */
var serialport = require('serialport'),
    SerialPort  = serialport.SerialPort;

// Utility function to get a Hex dump
var Hexdump = require('./hexdump.js');
var Debug = true;


/**
 * Debug: get a list of available serial
 * ports on the server - we'll use this later
 * to populate options on controller settings
 * on the application
 */
serialport.list(function (err, ports) {
    ports.forEach(function(port) {
      console.log(port.comName);
      console.log(port.pnpId);
      console.log(port.manufacturer);
    });
  });

/**
 * Setup Db connection before anything else
 */
require('./db.js');


/**
 * Setup the HTTP server and routes
 */
var express = require('express'),
    locos = require('./routes/locomotives.js'),
    logbook = require('./routes/logbooks.js'),
    controllers = require('./routes/controllers.js'),
    accessories = require('./routes/accessories.js'),
    layouts = require('./routes/layouts.js'),
    settings = require('./routes/settings.js'),
    backup = require('./routes/backup.js');

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
app.get('/locos', locos.findAll);
app.get('/locos/:id', locos.findById);
app.post('/locos', locos.addLoco);
app.post('/locos/:id/picture', locos.uploadPic);
app.put('/locos/:id', locos.updateLoco);
app.delete('/locos/:id', locos.deleteLoco);

/**
 * Interface for managing loco logbooks
*/
app.get('/locos/:id/logbook', logbook.findByLocoId);
app.post('/logbooks', logbook.addEntry);
app.get('/logbooks/', logbook.findAll);
app.put('/logbooks/:id', logbook.updateEntry);
app.delete('/logbooks/:id', logbook.deleteEntry);

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
 * Interface for managing controllers
 */
app.get('/controllers', controllers.findAll);
app.get('/controllers/:id', controllers.findById);
app.post('/controllers', controllers.addController);
app.put('/controllers/:id', controllers.updateController);
app.delete('/controllers/:id', controllers.deleteController);

/**
 * Interface for managing accessories
 */
app.get('/accessories', accessories.findAll);
app.get('/accessories/:id', accessories.findById);
app.post('/accessories', accessories.addAccessory);
app.put('/accessories/:id', accessories.updateAccessory);
app.delete('/accessories/:id', accessories.deleteAccessory);


/**
 * Interface for our settings. Only one settings object,
 * so no getting by ID here
 */
app.get('/settings', settings.getSettings);
app.put('/settings/:id', settings.updateSettings);

/**
 * Interface for triggering a backup and a restore
 */
app.get('/backup', backup.generateBackup);
app.post('/restore', backup.restoreBackup);


// Our static resources are in 'public'
// GET /javascripts/jquery.js
// GET /style.css
// GET /favicon.ico
app.use(express.static(__dirname + '/public'));

//
// For now, we are supporting only one communication
// port on the server, but in the future we could
// extend this to support multiple simultaneous
// connections to several train controllers...
//var portsList = new Array();
var myPort;
var portOpen = false;

// listen for new socket.io connections:
io.sockets.on('connection', function (socket) {
	// if the client connects:
	if (!connected) {
            console.log('User connected');
            connected = true;
    }

    // if the client disconnects, we close the 
    // connection to the controller:
    socket.on('disconnect', function () {
        console.log('User disconnected');
        console.log('Closing port');
        if (myPort)
            myPort.close();
         connected = false;
        portOpen = false;
    });
    
    socket.on('openport', function(data) {
        console.log('Port open request for port name ' + data);
        // data contains connection type: IP or Serial
        // and the port name or IP address.
        //  This opens the serial port:
        if (myPort)
            myPort.close();
        myPort = new SerialPort(data, {
            baudRate: 9600,
            dataBits: 8,
            parity: 'none',
            stopBits: 1,
            flowControl: false,
            // look for return and newline at the end of each data packet:
            parser: serialport.parsers.readline("\r\n")
        });
        myPort.flush();
        console.log('Result of port open attempt: ' + myPort);
        
        // Callback once the port is actually open: 
       myPort.on("open", function () {
           console.log('Port open');
           var successCtr = 0;
           // listen for new serial data:
           myPort.on('data', function (data) {
           try {
             if (Debug) console.log('Raw input:\n' + Hexdump.dump(data));
             // Clean our input data to improve chances of JSON parser not complaining
             // remove all non-ascii:
             data = data.replace(/[^A-Za-z 0-9\.,\?""!@#\$%\^&\*\(\)-_=\+;:<>\/\\\|\}\{\[\]`~]*/g, '');
             // Convert the string into a JSON object:
             var serialData = JSON.parse(data);
             // send a serial event to the web client with the data:
             socket.emit('serialEvent', serialData);
             if (!portOpen && successCtr > 4) { // Only declare open once we undersand what the
                                                // controller is sending
                portOpen = true;
                socket.emit('status', {portopen: portOpen});
              } else if (successCtr < 5) { // avoid a wrap after a few hours...
                  successCtr++;
              }
            } catch (err) {
                console.log('Serial input - json format error');
            }                   
           });
       });
        
        myPort.on("close", function() {
            portOpen = false;
            socket.emit('status', {portopen: portOpen});
        });
    });
        
    socket.on('closeport', function(data) {
        // TODO: support multiple ports, right now we
        // discard 'data' completely.
        // I assume closing the port will remove
        // the listeners ?? NOPE!
        console.log('Closing port');
        if (myPort)
            myPort.close();
    });
    
    socket.on('portstatus', function() {
        socket.emit('status', {portopen: portOpen});
    });
        
    socket.on('controllerCommand', function(data) {
        // TODO: do a bit of sanity checking here
        console.log('Controller command: ' + data);
        if (myPort)
            myPort.write(data + '\n');
    });
    
});
