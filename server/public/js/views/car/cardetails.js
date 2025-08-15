window.CarView = Backbone.View.extend({

    initialize: function () {
        this.render();
    },

    render: function () {
        $(this.el).html(this.template(this.model.toJSON()));
        return this;
    },
    
    events: {
        "change"        : "change",
        "click .save"   : "beforeSave",
        "click .delete" : "deleteCar",
        "dragover #picture"     : "dragOver",
        "dragleave #picture"     : "dragLeave",
        "drop #picture" : "dropHandler",
        "click .change-picture" : "triggerFileInput",
        "change #picture-input" : "handleFileSelect",
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
        var check = this.model.validateAll();
        if (check.isValid === false) {
            utils.displayValidationErrors(check.messages);
            return false;
        }
        // In case we have a new car, we must save it first
        // so that the car ID is populated, since the ID is used by the
        // picture save below:
        if (!this.model.id) {
            // Force async here: not ideal in terms of performance, but
            // this is not really a big deal, this is a short operation.
            this.model.save(null, {async:false});
        }
       // Upload picture file if a new file was dropped in the drop area
        if (this.pictureFile) {
            utils.uploadFile('cars/' + this.model.id + '/picture', this.pictureFile,
                function () {
                    // The server will rename the file to the ID of the loco,
                    // so let's set the picture accordingly and keep the
                    // filename extension:
                    self.model.set("picture", self.model.id + '.' + self.pictureFile.name.split(".").pop());
                    self.saveCar();
                }
            );
        } else {
            this.saveCar();
        }
        return false;
    },

    saveCar: function () {
        var self = this;
        console.log('Saving car...');
        this.model.save(null, {
            success: function (model) {
                self.render();
                app.navigate('cars/' + model.id, false);
                utils.showAlert('Success!', 'Car saved successfully', 'alert-success');
            },
            error: function () {
                utils.showAlert('Error', 'An error occurred while trying to save (delete?) this item', 'alert-error');
            }
        });
    },

    deleteCar: function () {
        var self = this;
        // The Bootbox library manages modal dialogs in bootstrap
        // and makes our life easier:
        bootbox.confirm("Delete this car, are you sure?", "Cancel",  "Delete", function(result) {
                         if (result) {
                           self.model.destroy({
                                success: function () {
                                window.history.back();
                                }});
                       }});
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
        $("#picture").removeClass("hover");
        console.log('File dropped');
        var e = event.originalEvent;
        e.dataTransfer.dropEffect = 'copy';
        this.pictureFile = e.dataTransfer.files[0];

        // Read the image file from the local file system and display it in the img tag
        var reader = new FileReader();
        reader.onloadend = function () {
            $('#picture').attr('src', reader.result);
        };
        reader.readAsDataURL(this.pictureFile);
    },

    triggerFileInput: function(event) {
        event.preventDefault();
        $('#picture-input').click();
    },

    handleFileSelect: function(event) {
        const file = event.target.files[0];
        if (file) {
            this.pictureFile = file;
            const reader = new FileReader();
            reader.onloadend = function () {
                $('#picture').attr('src', reader.result);
            };
            reader.readAsDataURL(file);
        }
    },

});