window.AccessoryItemView = Backbone.View.extend({

    initialize: function (options) {
        this.options = options || {};
        this.linkManager = this.options.lm;
    },

    render: function () {
        console.log("Render accessory item");
        $(this.el).html(this.template(this.model.toJSON()));
        
        // Auto-adjust font size based on text length
        this.adjustTitleFontSize();
        
        return this;
    },
    
    adjustTitleFontSize: function() {
        var $title = $('.card-title', this.el);
        var text = $title.text();
        var baseSize = 1; // 1rem
        
        // Adjust font size based on text length
        if (text.length > 12) {
            $title.css('font-size', '0.6rem');
        } else if (text.length > 8) {
            $title.css('font-size', '0.65rem');
        } else {
            $title.css('font-size', baseSize + 'rem');
        }
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
            var op = ($(event.target).hasClass('buttonX')) ? 'on' : 'p';
            if (this.model.get('reverse')) port = 1-port;
            this.linkManager.controllerCommand.accessoryCmd(address,port,op);
        }
    },
        
});