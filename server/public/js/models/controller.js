/**
 * Controllers are saved as a field inside layouts on the server
 * but we need to define a model here to manage them more easily
 */

window.Controller = Backbone.Model.extend({

    urlRoot: "/controllers",

    idAttribute: "_id",

    initialize: function () {
        this.validators = {};

        this.validators.name = function (value) {
            return value.length > 0 ? {isValid: true} : {isValid: false, message: "You must enter a name"};
        };

        /** TODO: validate we have one controller at least **/
        
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
        name: "Default name",
        type: "AVR",
        port: "/dev/tty.usb1234",
        pidkp: 0.1,
        pidki: 0.1,
        pidkd: 0.01,
        pidsample: 100,
        updaterate: 300,
        accessorypulse: 20,
    }
});

window.ControllerCollection = Backbone.Collection.extend({

    model: Controller,

    url: "/controllers"

});