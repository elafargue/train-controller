/**
 * This is a view of a layout in running/operations mode.
 *
 */

window.LocoRunView = Backbone.View.extend({

    initialize: function () {
        this.socket = this.options.socket;
        this.socket.on('serialEvent', this.showInput);
        this.render();
    },

    render: function () {
        $(this.el).html(this.template(this.model.toJSON()));
        // TODO: get all existing controllers and add the
        // relevant - and populated data into the view
        return this;
    },
    
    showInput: function(data) {
        console.log('Loco run: ' + data);
    },
    
});