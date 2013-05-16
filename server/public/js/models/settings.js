/**
 * Where we define the settings
 */

window.Settings = Backbone.Model.extend({

    urlRoot: "/settings",

    idAttribute: "_id",

    initialize: function () {
    },

    defaults: {
        currentLayout: null,
        currentLoco: null,
        powersliderstyle: "slider", // Can be "slider" or "knob"
        itemsperpage: 8,
    }
});
