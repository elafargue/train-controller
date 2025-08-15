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
    debug = require('debug')('tc:server'),
    PouchDB = require('pouchdb');

const { ReadlineParser } = require('@serialport/parser-readline')

// Utility function to get a Hex dump
var Hexdump = require('./hexdump.js');
var Debug = true;


/**
 * Debug: get a list of available serial
 * ports on the server - we'll use this later
 * to populate options on controller settings
 * on the application
 */
/*
serialport.list(function (err, ports) {
    ports.forEach(function (port) {
        console.log(port.comName);
        console.log(port.pnpId);
        console.log(port.manufacturer);
    });
});
*/

/**
 * Setup Db connection before anything else
 */
/**
 * Setup Db connection before anything else
 */
// Returns an object containing all databases we use
var dbs = require('./db.js');


/**
 * Setup the HTTP server and routes
 */
var express = require('express'),
    bodyParser = require('body-parser'),
    fileUpload = require('express-fileupload'),
    locos = require('./routes/locomotives.js'),
    cars = require('./routes/cars.js'),
    logbook = require('./routes/logbooks.js'),
    controllers = require('./routes/controllers.js'),
    accessories = require('./routes/accessories.js'),
    layouts = require('./routes/layouts.js'),
    settings = require('./routes/settings.js'),
    backup = require('./routes/backup.js');

var app = express(),
    server = require('http').Server(app),
    io = require('socket.io')(server, {
        log: false
    });

// Parse application/json and application/x-www-form-urlencoded
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Enable file upload
app.use(fileUpload({
    createParentPath: true,
    useTempFiles: true,
    tempFileDir: __dirname + "/public/pics/tmp"
}));



// Before starting our server, make sure we reset any stale authentication token:
dbs.settings.get('coresettings', function (err, item) {
    debug("Getting settings: " + item);
    if (err) {
        debug('Issue finding my own settings ' + err);
    }
    if (item == null) {
        item = dbs.defaults.settings;
    }

    item.token = "_invalid_";

    dbs.settings.put(item, function (err, response) {
        if (err) {
            console.log('***** WARNING ****** Could not reset socket.io session token at server startup');
            console.log(err);
            return;
        }
        debug(response);
    });

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
 * Interface for managing the locomotives
 */
app.get('/cars', cars.findAll);
app.get('/cars/:id', cars.findById);
app.post('/cars', cars.addCar);
app.post('/cars/:id/picture', cars.uploadPic);
app.put('/cars/:id', cars.updateCar);
app.delete('/cars/:id', cars.deleteCar);


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
 * API endpoint to get available serial ports
 */
app.get('/api/serialports', function(req, res) {
    serialport.list().then(
        ports => {
            // Add TEST controller as an option
            const portList = ports.map(port => ({
                path: port.path,
                manufacturer: port.manufacturer || 'Unknown',
                serialNumber: port.serialNumber || '',
                pnpId: port.pnpId || '',
                locationId: port.locationId || '',
                productId: port.productId || '',
                vendorId: port.vendorId || ''
            }));
            
            // Add TEST controller as first option
            portList.unshift({
                path: 'TEST',
                manufacturer: 'Virtual',
                serialNumber: 'TEST001',
                pnpId: 'TEST',
                locationId: '',
                productId: '',
                vendorId: ''
            });
            
            res.json(portList);
        },
        err => {
            console.error('Error listing serial ports:', err);
            // Fallback to just TEST controller if serial port enumeration fails
            res.json([{
                path: 'TEST',
                manufacturer: 'Virtual',
                serialNumber: 'TEST001',
                pnpId: 'TEST',
                locationId: '',
                productId: '',
                vendorId: ''
            }]);
        }
    );
});

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
const TestController = require('./testcontroller.js');
var controller;
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
        console.log('Closing controller');
        if (controller) {
            if (controller.isOpen) {
                controller.close();
            } else if (controller.close) {
                controller.close();
            }
        }
        connected = false;
        portOpen = false;
    });

    socket.on('openport', function (data) {
        console.log('Port open request for port name ' + data);
        
        // Close existing controller if any
        if (controller) {
            if (controller.isOpen) {
                controller.close();
            } else if (controller.close) {
                controller.close();
            }
        }

        // Check if this is a request for the test controller
        if (data === 'TEST') {
            console.log('Creating test controller');
            controller = new TestController();
            controller.onData = function(data) {
                socket.emit('serialEvent', data);
            };
            controller.start(); // Start the test controller
            portOpen = true;
            socket.emit('status', { portopen: true });
            return;
        }

        // Regular serial port controller
        controller = new serialport(data, {
            baudRate: 9600,
            dataBits: 8,
            parity: 'none',
            stopBits: 1,
            flowControl: false,
        });
        console.log('Result of port open attempt: ', controller);

        controller.on("error", function (err) {
            console.log('Port error', err);
            portOpen = false;
            // Send error details to client
            socket.emit('status', { 
                portopen: false, 
                error: true,
                errorMessage: err.message || 'Unknown serial port error',
                errorType: 'connection'
            });
        });

        const parser = controller.pipe(new ReadlineParser({ delimiter: '\r\n' }))

        // Callback once the port is actually open: 
        controller.on("open", function () {
            console.log('Port open');
            controller.flush();
            var successCtr = 0;
            // listen for new serial data:
            parser.on('data', function (data) {
                try {
                    data = data.toString();
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
                        socket.emit('status', {
                            portopen: portOpen
                        });
                    } else if (successCtr < 5) { // avoid a wrap after a few hours...
                        successCtr++;
                    }
                } catch (err) {
                    console.log('Serial input - json format error',err);
                }
            });
        });

        controller.on("close", function () {
            portOpen = false;
            socket.emit('status', {
                portopen: portOpen
            });
        });
    });

    socket.on('closeport', function (data) {
        // TODO: support multiple ports, right now we
        // discard 'data' completely.
        console.log('Closing port');
        if (controller) {
            if (controller.isOpen) {
                controller.close();
            } else if (controller.close) {
                controller.close();
            }
            // Update status immediately for reliable UI feedback
            // The controller's 'close' event should also trigger this, but this ensures it happens
            portOpen = false;
            socket.emit('status', {
                portopen: portOpen
            });
        }
    });

    socket.on('portstatus', function () {
        socket.emit('status', {
            portopen: portOpen
        });
    });

    socket.on('controllerCommand', function (data) {
        // TODO: do a bit of sanity checking here
        console.log('Controller command: ' + data);
        
        if (!controller) return;

        // Handle test controller commands
        if (controller instanceof TestController) {
            // Use the new processCommand method for proper JSON protocol handling
            controller.processCommand(data);
            return;
        }

        // Handle hardware controller commands
        if (controller.isOpen) {
            controller.write(data + '\n');
        }
    });

});
