window.LayoutView = Backbone.View.extend({

    initialize: function () {
        this.render();
    },

    render: function () {
        $(this.el).html(this.template(this.model.toJSON()));
        // TODO: get all existing controllers and add the
        // relevant - and populated data into the view
        var controllers = this.model.get('controllers');
        console.log('We have ' + controllers.length + ' controllers for this layout');
        for(var controller in controllers) {
            console.log('This layout contains a controller: ' + controller.get('name'));
        }
        return this;
    },

    events: {
        "change"        : "change",
        "click .save"   : "beforeSave",
        "click .delete" : "deleteLayout",
        "click .addctrl": "addController",
//        "click .delctrl": "deleteController",
        "dragover #picture"     : "dragOver",
        "dragleave #picture"     : "dragLeave",
        "drop #picture" : "dropHandler"
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
        console.log('before save');
        var check = this.model.validateAll();
        if (check.isValid === false) {
            utils.displayValidationErrors(check.messages);
            return false;
        }
               // Upload picture file if a new file was dropped in the drop area
        if (this.pictureFile) {
            utils.uploadFile("layouts/" + this.model.id, this.pictureFile,
                function () {
                    // The server will rename the file to the ID of the loco,
                    // so let's set the picture accordingly and keep the
                    // filename extension:
                    self.model.set("picture", self.model.id + '.' + self.pictureFile.name.split(".").pop());
                    self.saveLayout();
                }
            );
        } else {
            this.saveLayout();
        }
        return false;
    },

    saveLayout: function () {
        var self = this;
        this.model.save(null, {
            success: function (model) {
                self.render();
                app.navigate('layouts/' + model.id, false);
                utils.showAlert('Success!', 'Layout saved successfully', 'alert-success');
            },
            error: function () {
                utils.showAlert('Error', 'An error occurred while trying to save (delete?) this item', 'alert-error');
            }
        });
    },

    deleteLayout: function () {
        this.model.destroy({
            success: function () {
                alert('Layout deleted successfully');
                window.history.back();
            }
        });
        return false;
    },
    
    addController: function() {
        // Add a new controller view in our form:
        var newController = new Controller();
        var newControllerDetailsView = new ControllerDetailsView({model: newController});
        $('#controllers', this.el).append(newControllerDetailsView.render().el);
        utils.showAlert('Success!', 'Controller created successfully', 'alert-success');
        return false;

    },
    
    dragOver: function(event) {
        console.log('Something gettting dragged in here');
        $("#picture").addClass("hover");
        return false;
    },
    
    dragLeave: function(event) {
        $("#picture").removeClass("hover");
        return false;
    },


    dropHandler: function (event) {
        event.stopPropagation();
        event.preventDefault();
        var e = event.originalEvent;
        e.dataTransfer.dropEffect = 'copy';
        this.pictureFile = e.dataTransfer.files[0];

        // Read the image file from the local file system and display it in the img tag
        var reader = new FileReader();
        reader.onloadend = function () {
            $('#picture').attr('src', reader.result);
        };
        reader.readAsDataURL(this.pictureFile);
    }

});