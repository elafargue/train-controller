/**
 * The controller communication manager:
 *  - manages the socket.io link
 *  - provides API to the train controller to use by views
 *
 * TODO: abstract the controller type to support multiple protocols.
 */


/**
 * Abstract event binding, adatped from https://gist.github.com/ismasan/464257
 *
 *   Example:
 *
 *    var MyEventEmitter = function(){};
 *    MyEventEmitter.prototype = new AbstractEventsDispatcher;
 * 
 *    var emitter = new MyEventEmitter();
 * 
 *    // Bind to single event
 *    emitter.on('foo_event', function(data){ alert(data)} );
 * 
 *    // Bind to all
 *    emitter.bind_all(function(event_name, data){ alert(data) });
 * 
 *    // Bind to all except some
 *    emitter.bind_all_except(['except_this_one', 'and_this_one'], function(event_name, data){ alert(data) });
 */
var AbstractEventsDispatcher = function(){};
AbstractEventsDispatcher.prototype = {
  callbacks: {},
  global_callbacks: [],
  
  on: function(event_name, callback){
    this.callbacks[event_name] = this.callbacks[event_name] || [];
    this.callbacks[event_name].push(callback);
    return this;// chainable
  },
  
  emit: function(event_name, data){
    this.dispatch(event_name, data);
    this.dispatch_global(event_name, data);
    return this;
  },
    
  removeListener: function(event_name, callback) {
      var list = this.callbacks[event_name] || [];
      if (list.length) { // Do we have listeners for this event?
          var idx = -1;
          // Go through all callbacks on this event, see if we find
          // the one we're looking for
          for (var i=0; i < list.length; i++) {
              if (list[i] === callback) {
                  idx = i;
                  break;
              }
          }
          if (idx < 0)
              return this;
          list.splice(idx,1);
          if (!list.length)
              delete this.callbacks[event_name];
      }
      return this;
  },

    /*
  bind_all: function(callback){
    this.global_callbacks.push(callback);
    return this;
  },
  
  bind_all_except: function(except, handler){
    this.bind_all(function(event_name, event_data){
      if(except.indexOf(event_name) > -1) return false;
      handler(event_name, event_data)
    });
    return this
  },
  */
  
  dispatch: function(event_name, data){
    var chain = this.callbacks[event_name];
    if(typeof chain == 'undefined') return; // no callbacks for this event
    for(var i = 0; i < chain.length; i++){
      chain[i]( data )
    }
  },
  
  dispatch_global: function(event_name, data){
    for(var i = 0; i < this.global_callbacks.length; i++){
      this.global_callbacks[i]( event_name, data )
    }
  }
  
};


var linkManager = function() {

    var self = this;
    this.socket = io.connect(); // (we connect on same host, we don't need a URL)
    
    this.connected = false;
    this.lastInput = 0;
    
    // Careful: in those functions, "this" is the socket.io context,
    // hence the use of self.
    this.processInput = function(data) {
//        if (typeof data.bemf != 'undefined')
            self.emit('input', data); // Only send this signal if we have BEMF value
        if (typeof data.ack != 'undefined' )
            self.emit('ack', data.ack);
        self.lastInput = new Date().getTime();
    };
    
    this.processStatus = function(data) {
        if (data.portopen) {
            self.connected = true;
        } else {
            self.connected = false;
        }
        // Tell anyone who would be listening that status is updated
        self.emit('status', data);
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
        if ((ts-this.lastInput) > 3000)
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
    };

    // Initialization code:
    this.socket.on('serialEvent', this.processInput);
    this.socket.on('status', this.processStatus);
    // Initialize connexion status on the remote controller
    this.socket.emit('portstatus','');
    // Start a 3-seconds interval watchdog to listen for input:
    // if no input in the last 2 seconds, then request port status
    this.watchdog = setInterval(this.wdCall.bind(this), 3100);    
}

// Add the "on" and "emit" methods to our link manager
linkManager.prototype = new AbstractEventsDispatcher;