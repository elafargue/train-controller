/**
 * The Node.js backend server that communicates with the hardware and serves the
 * HTML web app.
 *
 * A this stage, not more than a simple wrapper to forward JSON-formatted serial
 * data to a web socket for
 * usage by a web app. This server also serves the HTML assets in order to make
 * it self-contained.
 *
 * (c) 2013 Edouard Lafargue
 *  License: GPLv3
 */


/**
 *   Setup the serial port
 */
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

/**
 * Setup the HTTP server
 */
var express = require("express"),
    locos = require('./routes/locomotives.js');

var app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server);

app.configure(function () {
    app.use(express.logger('dev'));     /* 'default', 'short', 'tiny', 'dev' */
    app.use(express.bodyParser());
});

server.listen(8000);
console.log("Listening for new clients on port 8000");
var connected = false;

/**
 * Interface for managing the locomotives
 */
app.get('/locos', locos.findAll);
app.get('/locos/:id', locos.findById);

/**
app.post('/locos', locos.addLoco);
app.put('/locos/:id', locos.updateLoco);
app.delete('/locos/:id', locos.deleteLoco);
*/
 
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
             myPort.write('x');
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
