/**
 * This is a view of a layout in running/operations mode.
 *
 */

var controllerCommand = {
    forward: function() {
        return '{"dir":"f"}';
    },
    backward: function() {
        return '{"dir":"b"}';
    },
    stop: function() {
        return '{"dir":"s"}';
    },
    speed: function(val) {
        return '{"speed":' + val + '}';
    }
};

window.ControllerRunView = Backbone.View.extend({

    initialize: function () {
        var self = this;
        this.socket = this.options.socket;
        this.socket.on('serialEvent', this.showInput);

        this.render();
        // Initialize the jQuery UI vertical slider for power:
        $(".power", this.el).slider({
                        orientation:"vertical",
                        animate: true,
                        // slide: this.power,
                        stop: function(event,ui) {
                            // Gotta pass the context below, otherwise
                            // this is the jQuery context in "power", and not
                            // our view's context:
                            self.power.call(self,event,ui);
                        },
                    });
    },

    render: function () {
        $(this.el).html(this.template(this.model.toJSON()));
        // TODO: get all existing controllers and add the
        // relevant - and populated data into the view
        return this;
    },
    
    events: {
        "click .dir-back": "direction",
        "click .dir-fwd": "direction",
        "click .dir-stop": "direction",
    },
        
    direction: function(event) {
        if ($(event.target).hasClass('dir-fwd')) {
            console.log("Go forward");
            this.socket.emit('controllerCommand', controllerCommand.forward());
        } else if ($(event.target).hasClass('dir-back')) {
            console.log("Go backwards");
            this.socket.emit('controllerCommand', controllerCommand.backward());
        } else if ($(event.target).hasClass('dir-stop')) {
            console.log("Stop train");
            this.socket.emit('controllerCommand', controllerCommand.stop());
        }
    },
    
    power: function(event, ui) {
        console.log('Power change to ' + ui.value);
        this.socket.emit('controllerCommand',controllerCommand.speed(ui.value));
    },
    
    showInput: function(data) {
        console.log('Controller run: ' + data);
    },

    
    
});