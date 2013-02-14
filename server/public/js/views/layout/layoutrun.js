/**
 * This is a view of a layout in running/operations mode.
 *
 */

window.LayoutRunView = Backbone.View.extend({

    initialize: function () {
        this.render();
    },

    render: function () {
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    },
    
});