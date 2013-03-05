/**
 * This is a view of a layout in running/operations mode.
 *
 */

window.LayoutRunView = Backbone.View.extend({

    initialize: function () {
        console.log('Layout Run View Initialize');
        this.linkManager = this.options.lm;
        // Unbind before rebinding, to avoid double subscriptions
        this.linkManager.off('status', this.updatestatus);
        this.linkManager.on('status', this.updatestatus, this);
        this.render();
    },

    render: function () {
        this.$el.html(this.template(this.model.toJSON()));
        // Get the connection status of the controller:
        this.linkManager.requestStatus();
        return this;
    },
    
    close: function() {
        console.log('Layout Run View closing...');
    },
    
    events: {
        "click .ctrl-connect":  "ctrlConnect",
        "remove": "onRemove"
    },
    
    onRemove: function() {
        console.log("Removing layout run view");
    },
    
    updatestatus: function(data) {
        // Depending on port status, update our controller
        // connect button:
        if (this.linkManager.connected) {
            $('.ctrl-connect', this.el).html("Disconnect controller.")
                .removeClass('btn-danger').addClass('btn-success').removeClass('btn-warning').removeAttr('disabled');
        } else {
            $('.ctrl-connect', this.el).html("Connect to controller.")
                .addClass('btn-danger').removeClass('btn-success').removeClass('btn-warning').removeAttr('disabled');
        }
    },
    
    ctrlConnect: function() {
        var self = this;
        if ($('.ctrl-connect', this.el).attr('disabled'))
            return;
        $('.ctrl-connect', this.el).html("Connect to controller.").addClass('btn-warning').removeClass('btn-success')
                                   .removeClass('btn-danger').attr('disabled', true);
        // First, get controller settings (assume Serial for now)
        var controllers = this.model.get('controllers');
        if (controllers.length) {
            var controller = new Controller({_id:controllers[0]});
            controller.fetch({success: function() {
                if (!self.linkManager.connected) {
                    self.linkManager.openPort(controller.get('port'));
                } else {
                    self.linkManager.closePort(controller.get('port'));
                }
             }});
        }
    }
    
});