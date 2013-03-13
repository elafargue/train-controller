window.AccessoryDetailsView = Backbone.View.extend({

    initialize: function () {
        this.linkManager = this.options.lm;
    },

    render: function () {
        var self = this;
        console.log("Render accessory details");
        $(this.el).html(this.template(this.model.toJSON()));
        
        // Populate address dropdown based on controller properties
        if (this.linkManager.connected) {
            this.linkManager.once('turnouts',function(tn) {
                // fill in
                console.log("Turnouts: " + tn);
                $('#tn_ids', self.el).empty().removeAttr('disabled');
                for (var i=0; i < tn; i++) {
                    $('#tn_ids', self.el).append('<option' +
                                                 ((i == self.model.get('controllerAddress')) ? ' selected': '') + '>'+i+'</option>');
                }
                if (self.model.get('type') === 'Uncoupler') {
                    $('#portA',self.el).removeAttr('disabled');
                    $('#portB',self.el).removeAttr('disabled');
                    switch (self.model.get('controllerSubAddress')) {
                            case 0:
                                $('#portA', self.el).button('toggle');
                                break;
                            case 1:
                                $('#portB', self.el).button('toggle');
                                break;
                    }
                }
            });
            this.linkManager.controllerCommand.getTurnouts();
        }
        return this;
    },

    events: {
        "change"        : "change",
        "click .accessory-save"   : "beforeSave",
        "click .accessory-delete": "deleteAccessory",
        "click .portButton": "updateAccessoryPort",
    },
    
    updateAccessoryPort: function(event) {
        switch (event.target.id) {
                case 'portA':
                    this.model.set('controllerSubAddress', 0);
                    break;
                case 'portB':
                    this.model.set('controllerSubAddress', 1);
                    break;
        }
    },

    change: function (event) {
        // Remove any existing alert message
        utils.hideAlert();
        console.log("Model Changed");

        // Apply the change to the model
        var target = event.target;
        var change = {};
        change[target.name] = target.value;
        this.model.set(change);

        // Run validation rule (if any) on changed item
        var check = this.model.validateItem(target.id);
        if (check.isValid === false) {
            utils.addValidationError(target.id, check.message);
        } else {
            utils.removeValidationError(target.id);
        }
        
        if (this.model.get('type') === 'Uncoupler') {
            $('#portA',this.el).removeAttr('disabled');
            $('#portB',this.el).removeAttr('disabled');
            switch (this.model.get('controllerSubAddress')) {
                case 0:
                    $('#portA', this.el).button('toggle');
                    break;
                case 1:
                    $('#portB', this.el).button('toggle');
                    break;
            }
        }
        
        // TODO: is this right ?
        // This view is embedded into another view, so change events
        // are going to bubble up to the upper view and change attributes
        // with the same name, so we stop event propagation here:
        event.stopPropagation();
    },

    beforeSave: function () {
        var self = this;
        console.log('Controller: before save for accessory ' + this.model.id);
        var check = this.model.validateAll();
        if (check.isValid === false) {
            utils.displayValidationErrors(check.messages);
            return false;
        }
        this.saveAccessory();
        return false;
    },

    saveAccessory: function () {
        var self = this;
        // Upon save, we need to save the data into the layout
        this.model.save(null, {
            success: function (model) {
                // Dismiss the modal (containts ID since we can have
                // several controller views on the same page for different
                // controllers:
                $('#accModal-' + self.model.id).modal('hide');
                // Wait until modal finishes hiding...
                $('#accModal-' + self.model.id).on('hidden', function () {
                    console.log('Hidden modal');
                    // ... and trigger a render since the name might have changed
                    // (there should be a better way of doing this?)
                    self.render();                
                });
            },
            error: function () {
                console.log('Controller: error saving');
                // utils.showAlert('Error', 'An error occurred while trying to save controller config', 'alert-error');
            }
        });
    },

    deleteAccessory: function () {
        self = this;
        console.log("Delete accessory " + this.model.id);
        this.model.destroy({
            success: function () {
                //alert('Controller deleted successfully');
                self.remove();
                //this.render();
                return false;
            }
        });
        return false;
    },
        
});