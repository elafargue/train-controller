/**
 * Where we define the settings
 */

window.Settings = Backbone.Model.extend({

    urlRoot: "/settings",

    idAttribute: "_id",

    initialize: function () {
    },

    defaults: {
        _id: null,
        currentLayout: null,
        currentLoco: null
    }
});
