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
        theme: "light", // Can be "light" or "dark"
        navbarColor: "#0d6efd", // Bootstrap primary color by default
        accentColor: "#0d6efd", // Color for primary buttons and accents
    }
});
