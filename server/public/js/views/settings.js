window.SettingsView = Backbone.View.extend({

    initialize:function () {
        this.render();
    },

    render:function () {
        $(this.el).html(this.template(this.model.toJSON()));
        return this;
    },
    
    events: {
           "click #reset": "resetSettings"
    },

    resetSettings: function() {
        // Retrieve our global settings/state:
        settings = new Settings();
        settings.fetch({success: function(){
            settings.set('currentLayout', null);
            settings.set('currentLoco', null);
            settings.save(null, {
                success: function(model) {
                   utils.showAlert('Success', 'Settings cleared', 'alert-success');
                    return true;
                },
                error: function () {
                    utils.showAlert('Error', 'An error occurred while trying to clear the settings', 'alert-error');
            }
            });
        }});
        return false;
    }

});