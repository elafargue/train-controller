/**
 * This is a view of a layout in running/operations mode.
 *
 */

window.LayoutRunView = Backbone.View.extend({

    initialize: function () {
        console.log('Layout Run View Initialize');
        this.socket = this.options.socket;
        this.socket.on('status', this.updatestatus.bind(this));
        this.connected = false;
        // Get the connection status of the controller:
        this.socket.emit('portstatus','');
        this.render();
    },

    render: function () {
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    },
    
    close: function() {
        console.log('Layout Run View closing...');
    },
    
    events: {
        "click .ctrl-connect":  "ctrlConnect",
    },
    
    updatestatus: function(data) {
        // Depending on port status, update our controller
        // connect button:
        if (data.portopen) {
            this.connected = true;
            $('.ctrl-connect', this.el).html("Disconnect controller.").removeClass('btn-danger').addClass('btn-success');
        } else {
            this.connected = false;
            $('.ctrl-connect', this.el).html("Connect to controller.").addClass('btn-danger').removeClass('btn-success');
        }
    },
    
    ctrlConnect: function() {
        var self = this;
        // First, get controller settings (assume Serial for now)
        var controllers = this.model.get('controllers');
        if (controllers.length) {
            var controller = new Controller({_id:controllers[0]});
            controller.fetch({success: function() {
                if (!self.connected) {
                    self.socket.emit('openport', controller.get('port'));
                } else {
                    self.socket.emit('closeport', controller.get('port'));
                }
             }});
        }
    }
    
});