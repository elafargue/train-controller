/**
 * The controller communication manager:
 *  - manages the socket.io link
 *  - provides API to the train controller to use by views
 *
 * TODO: abstract the controller type to support multiple protocols.
 */


var linkManager = function() {

    var self = this;
    this.socket = io.connect(); // (we connect on same host, we don't need a URL)
    
    this.connected = false;
    this.lastInput = 0;
    
    // Careful: in those functions, "this" is the socket.io context,
    // hence the use of self.
    this.processInput = function(data) {
//        if (typeof data.bemf != 'undefined')
            self.trigger('input', data); // Only send this signal if we have BEMF value
        if (typeof data.ack != 'undefined' )
            self.trigger('ack', data.ack);
        self.lastInput = new Date().getTime();
    };
    
    this.processStatus = function(data) {
        if (data.portopen) {
            self.connected = true;
        } else {
            self.connected = false;
        }
        // Tell anyone who would be listening that status is updated
        self.trigger('status', data);
    }
        
    this.controllerCommandResponse = function() {
    }
    
    this.requestStatus = function(data) {
        this.socket.emit('portstatus','');
    }
    
    this.openPort = function(port) {
        this.socket.emit('openport',port);
    }
    
    this.closePort = function(port) {
        this.socket.emit('closeport',port);
    }
    
    this.wdCall = function() {
        var ts = new Date().getTime();
        if ((ts-this.lastInput) > 5000)
            this.requestStatus();
    }
    
    // TODO: right now we have one type of controllerCommand. But we can
    // extend it for other types of protocols if we want to:
    this.controllerCommand = {
        forward: function() {
            self.socket.emit('controllerCommand', '{"dir":"f"}');
        },
        backward: function() {
            self.socket.emit('controllerCommand', '{"dir":"b"}');
        },
        stop: function() {
            self.socket.emit('controllerCommand','{"dir":"s"}');
        },
        speed: function(val) {
            self.socket.emit('controllerCommand','{"speed":' + val + '}');
        },
        getPID: function(val) {
            self.socket.emit('controllerCommand','{"get": "pid"}');
        },
        setPID: function(kp,ki,kd,sample) {
            // The Arduino aJson library is sensitive to presence or
            // not of "." in floats...
            self.socket.emit('controllerCommand','{"pid": {"kp":'+
                             ((kp==0) ? "0.0" : kp ) +',"ki":'+
                             ((ki==0) ? "0.0" : ki ) +',"kd":'+
                             ((kd==0) ? "0.0" : kd ) +',"sample":'+sample+'}}');
        },
    };

    // Initialization code:
    this.socket.on('serialEvent', this.processInput);
    this.socket.on('status', this.processStatus);
    // Initialize connexion status on the remote controller
    this.socket.emit('portstatus','');
    // Start a 3-seconds interval watchdog to listen for input:
    // if no input in the last 2 seconds, then request port status
    this.watchdog = setInterval(this.wdCall.bind(this), 5000);    
}

// Add event management to our link manager, from the Backbone.Events class:
_.extend(linkManager.prototype, Backbone.Events);
//  linkManager.prototype = new Backbone.Events;
// linkManager.prototype = new AbstractEventsDispatcher;