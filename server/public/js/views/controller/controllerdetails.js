window.ControllerDetailsView = Backbone.View.extend({

    initialize: function () {
        this.render();
    },

    render: function () {
        $(this.el).html(this.template(this.model.toJSON()));
        return this;
    },

    events: {
        "change"        : "change",
        "click .controller-save"   : "beforeSave",
//        "click .delctrl": "deleteController",
    },

    change: function (event) {
        // Remove any existing alert message
        utils.hideAlert();

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
                // Trigger a render since the name might have changed
                // (there should be a better way of doing this?)
                self.render();
            },
            error: function () {
                console.log('Controller: error saving');
                // utils.showAlert('Error', 'An error occurred while trying to save controller config', 'alert-error');
            }
        });
    },

    deleteController: function () {
        this.model.destroy({
            success: function () {
                alert('Controller deleted successfully');
                //window.history.back();
            }
        });
        return false;
    },
    
});