window.ControllerDetailsView = Backbone.View.extend({

    initialize: function () {
        // No need to force rendering...
        //this.render();
    },

    render: function () {
        console.log("Render controller details");
        $(this.el).html(this.template(this.model.toJSON()));
        var options = {
                minimum: 0,
                maximum: 10,
                step: 0.1,
                numberOfDecimals: 2,
                value: this.model.get('pidkp')
        };
        
        $('#kp', this.el).spinedit(options);
        options.value = this.model.get('pidki');
        $('#ki', this.el).spinedit(options);
        options.value = this.model.get('pidkd');
        $('#kd', this.el).spinedit(options);

        return this;
    },

    events: {
        "change"        : "change",
        "click .controller-save"   : "beforeSave",
        "click .controller-delete": "deleteController",
    },

    change: function (event) {
        // Remove any existing alert message
        utils.hideAlert();

        // Apply the change to the model
        var target = event.target;
        var change = {};
        // Our Spinedit control returns values as strings even
        // when they are numbers (uses .val() in the setvalue method),
        // so we have to attempt to convert it back to a number if it makes
        // sense:
        var numval = parseFloat(target.value);
        console.log("Controller details value change as float: " + numval);
        change[target.name] = isNaN(numval) ? target.value : numval;
        this.model.set(change);

        // Run validation rule (if any) on changed item
        var check = this.model.validateItem(target.id);
        if (check.isValid === false) {
            utils.addValidationError(target.id, check.message);
        } else {
            utils.removeValidationError(target.id);
        }
        
        // TODO: is this right ?
        // This view is embedded into another view, so change events
        // are going to bubble up to the upper view and change attributes
        // with the same name, so we stop event propagation here:
        event.stopPropagation();
    },

    beforeSave: function () {
        var self = this;
        console.log('Controller: before save for controller ' + this.model.id);
        var check = this.model.validateAll();
        if (check.isValid === false) {
            utils.displayValidationErrors(check.messages);
            return false;
        }
        this.saveController();
        return false;
    },

    saveController: function () {
        var self = this;
        // Upon save, we need to save the data into the layout
        this.model.save(null, {
            success: function (model) {
                // Dismiss the modal (containts ID since we can have
                // several controller views on the same page for different
                // controllers:
                $('#myModal-' + self.model.id).modal('hide');
                // Wait until modal finishes hiding...
                $('#myModal-' + self.model.id).on('hidden', function () {
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

    deleteController: function () {
        self = this;
        console.log("Delete controller " + this.model.id);
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