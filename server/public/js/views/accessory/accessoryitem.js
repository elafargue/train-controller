window.AccessoryItemView = Backbone.View.extend({

    initialize: function () {
        this.linkManager = this.options.lm;
    },

    render: function () {
        console.log("Render accessory item");
        $(this.el).html(this.template(this.model.toJSON()));
        return this;
    },

    events: {
        "change"        : "change",
        "click .buttonA": "command",
        "click .buttonB": "command"
    },

    change: function (event) {
        console.log("Accessory item: change event");
    },
    
    command: function(event) {
        console.log("Accessory: Take action on click");
        var address = this.model.get('controllerAddress');
        if (this.model.get('type') == 'Isolating') {
            var op = ($(event.target).hasClass('buttonA')) ? 'off' : 'on';
            this.linkManager.controllerCommand.relayCmd(address, op );
        } else {
            var port = ($(event.target).hasClass('buttonA')) ? 0 : 1;
            if (this.model.get('reverse')) port = 1-port;
            this.linkManager.controllerCommand.accessoryCmd(address,port,'p');
        }
    },
        
});