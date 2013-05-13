/**
 * Controllers are saved as a field inside layouts on the server
 * but we need to define a model here to manage them more easily
 */

window.Accessory = Backbone.Model.extend({

    urlRoot: "/accessories",

    idAttribute: "_id",

    initialize: function () {
        this.validators = {};

        this.validators.name = function (value) {
            return value.length > 0 ? {isValid: true} : {isValid: false, message: "You must enter a name"};
        };
        
    },

    validateItem: function (key) {
        return (this.validators[key]) ? this.validators[key](this.get(key)) : {isValid: true};
    },

    // TODO: Implement Backbone's standard validate() method instead.
    validateAll: function () {

        var messages = {};

        for (var key in this.validators) {
            if(this.validators.hasOwnProperty(key)) {
                var check = this.validators[key](this.get(key));
                if (check.isValid === false) {
                    messages[key] = check.message;
                }
            }
        }

        return _.size(messages) > 0 ? {isValid: false, messages: messages} : {isValid: true};
    },

    defaults: {
                name: "Default",
                locX: 0,
                locY: 0,
                symbol: "turnout-right",
                type: "Turnout",
                controllerAddress: 0,
                controllerSubAddress: -1,
                reverse: false,            // Software switch inversion
    }
});

window.AccessoryCollection = Backbone.Collection.extend({

    model: Accessory,

    url: "/accessoriess"

});