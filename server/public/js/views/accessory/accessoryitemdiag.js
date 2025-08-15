window.AccessoryItemDiagView = Backbone.View.extend({

    className: 'col-md-3 col-sm-4 col-6 mb-3',

    initialize: function (options) {
        this.options = options || {};
        this.linkManager = this.options.lm;
    },

    render: function () {
        console.log("Render accessory diag item");
        $(this.el).html(this.template(this.model.toJSON()));
        return this;
    },

    events: {
        "click .buttonA": "command",
        "click .buttonB": "command"
    },

    command: function(event) {
        console.log("Accessory diag: Take action on click");
        var address = this.model.get('controllerAddress');
        var port = ($(event.target).hasClass('buttonA')) ? 0 : 1;
        this.linkManager.controllerCommand.accessoryCmd(address,port,'p');
    },
        
});