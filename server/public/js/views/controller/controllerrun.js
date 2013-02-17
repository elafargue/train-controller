/**
 * This is a view of a layout in running/operations mode.
 *
 */

window.ControllerRunView = Backbone.View.extend({

    initialize: function () {
        this.socket = this.options.socket;
        this.socket.on('serialEvent', this.showInput);

        this.render();
        // Initialize the jQuery UI vertical slider for power:
        $(".power", this.el).slider({
                        orientation:"vertical",
                        animate: true});
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
        "click .dir-stop": "direction"
    },
    
    direction: function(event) {
        if ($(event.target).hasClass('dir-fwd')) {
            console.log("Go forward");
        } else if ($(event.target).hasClass('dir-back')) {
            console.log("Go backwards");
        } else if ($(event.target).hasClass('dir-stop')) {
            console.log("Stop train");
        }
    },
    
    showInput: function(data) {
        console.log('Controller run: ' + data);
    },

    
    
});