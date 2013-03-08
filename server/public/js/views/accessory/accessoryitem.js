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
        "click #buttonA": "command",
        "click #buttonB": "command"
    },

    change: function (event) {
        console.log("Accessory item: change event");
    },
    
    command: function(event) {
        console.log("Accessory: Take action on click");
        var address = this.model.get('controllerAddress');
        var port = (event.target.id == 'buttonA') ? 0 : 1;
        this.linkManager.controllerCommand.accessoryCmd(address,port,'p');
    },
        
});