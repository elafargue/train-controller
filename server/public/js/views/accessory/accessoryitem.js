window.AccessoryItemView = Backbone.View.extend({

    initialize: function () {
        //this.render();
    },

    render: function () {
        console.log("Render accessory item");
        $(this.el).html(this.template(this.model.toJSON()));
        return this;
    },

    events: {
        "change"        : "change",
    },

    change: function (event) {
        console.log("Accessory item: change event");
    },
        
});