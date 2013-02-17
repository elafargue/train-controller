/**
 * This is a view of a layout in running/operations mode.
 *
 */

window.LayoutRunView = Backbone.View.extend({

    initialize: function () {
        this.socket = this.options.socket;
        this.connected = false;
        this.render();
    },

    render: function () {
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    },
    
    events: {
        "click .ctrl-connect":  "ctrlConnect",
    },
    
    ctrlConnect: function() {
        var self = this;
        if (!this.connected) {
            console.log("Connecting controller port");
            // First, get controller settings (assume Serial for now)
            var controllers = this.model.get('controllers');
            if (controllers.length) {
                var controller = new Controller({_id:controllers[0]});
                controller.fetch({success: function() {
                    self.socket.emit('openport', controller.get('port'));
                    $('.ctrl-connect', self.el).html("Disconnect controller.").removeClass('btn-danger').addClass('btn-success');
                    self.connected = true;
                    }
                 });
            }
        } else {
            // Disconnect our controller
        }
    }
    
});