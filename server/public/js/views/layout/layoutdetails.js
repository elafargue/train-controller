window.LayoutView = Backbone.View.extend({

    initialize: function (options) {
        this.options = options || {};
        this.linkManager = this.options.lm;
        
        // Listen for connection status changes
        var self = this;
        if (this.linkManager) {
            this.linkManager.on('status', function(data) {
                self.updateConnectionStatus();
            });
        }
    },

    render: function () {
        $(this.el).html(this.template(this.model.toJSON()));
        // Careful: controllers below is a reference to the model's controllers
        // attribute, which means that if we modify it, we change the model's
        // "controllers" attribute! We have to clone it:
        var controllers = new Array().concat(this.model.get('controllers'));
        if(controllers.length) {
            console.log('We have ' + controllers.length + ' controllers for this layout');
            $('.addctrl',this.el).attr('disabled',true);
            $('.addacc',this.el).removeAttr('disabled');
            // We are going to start a recursive creation of all controller views:
            this.renderNextController(controllers.pop(), controllers);
        }
        var accessories = new Array().concat(this.model.get('accessories'));
        if (accessories.length) {
            console.log('We have ' + accessories.length + ' accessories for this layout');
            // We are going to start a recursive creation of all accessory views:
            this.renderNextAccessory(accessories.pop(), accessories);
        }
        
        // Update connection status display
        this.updateConnectionStatus();
        return this;
    },
    
    updateConnectionStatus: function() {
        // Update the warning/OK label depending on whether the controller is connected
        if (this.linkManager && this.linkManager.connected) {
            $('#connection-status', this.el).removeClass('alert-warning').addClass('alert-success');
            $('#connection-icon', this.el).removeClass('bi-exclamation-triangle').addClass('bi-check-circle');
            $('#connection-label', this.el).html('CONNECTED').removeClass('bg-secondary').addClass('bg-success');
            $('#connection-note', this.el).html('Controller is connected, all accessory properties can be edited.');
        } else {
            $('#connection-status', this.el).removeClass('alert-success').addClass('alert-warning');
            $('#connection-icon', this.el).removeClass('bi-check-circle').addClass('bi-exclamation-triangle');
            $('#connection-label', this.el).html('DISCONNECTED').removeClass('bg-success').addClass('bg-secondary');
            $('#connection-note', this.el).html('Some accessory properties can only be edited if you go back to the <a href="/#" class="alert-link">home screen</a> and connect to the controller.');
        }
    },
    
    renderNextController: function(nextId, controllerIdList) {
        var self = this;
        console.log('ID to render: ' + nextId);
        var newController = new Controller({_id: nextId});
        newController.fetch({success: function(){
                console.log('Controller fetched. Remaining: ' + controllerIdList.length);        
                var newControllerDetailsView = new ControllerDetailsView({model: newController});
                var $wrapper = $('<div class="col-md-3"></div>').append(newControllerDetailsView.render().el);
                $('#controllers', self.el).append($wrapper);
                if (controllerIdList.length) {
                    self.renderNextController(controllerIdList.pop(), controllerIdList);
                } else {
                    // Ensure consistency
                    self.model.save();
                }},
                        error: function() {
                            // Somehow the controller Id we got in the array was not
                            // valid: remove it from our model, and move on to the next
                            // one
                            console.log('Deleting ghost controller');
                            var controllers = self.model.get('controllers');
                            controllers.splice(controllers.indexOf(nextId),1);
                            // No need to set again, right ? Or does Backbone expect it to
                            // know that there the controllers were changed?
                            if(controllerIdList.length) {
                                self.renderNextController(controllerIdList.pop(), controllerIdList);
                            } else {
                                self.model.save();
                            }
                        }});
    },
    
    renderNextAccessory: function(nextId, accessoryIdList) {
    var self = this;
    console.log('ID to render: ' + nextId);
    var newAccessory = new Accessory({_id: nextId});
    newAccessory.fetch({success: function(){
            console.log('Accessory fetched. Remaining: ' + accessoryIdList.length);        
            var newAccessoryDetailsView = new AccessoryDetailsView({model: newAccessory, lm:self.linkManager});
            var $wrapper = $('<div class="col-md-3"></div>').append(newAccessoryDetailsView.render().el);
            $('#accessories', self.el).append($wrapper);
            if (accessoryIdList.length) {
                self.renderNextAccessory(accessoryIdList.pop(), accessoryIdList);
            } else {
                // Ensure consistency
                self.model.save();
            }},
                        error: function() {
                            // Somehow the accessory Id we got in the array was not
                            // valid: remove it from our model, and move on to the next
                            // one
                            console.log('Deleting ghost accessory');
                            var accessories = self.model.get('accessories');
                            accessories.splice(accessories.indexOf(nextId),1);
                            // No need to set again, right ? Or does Backbone expect it to
                            // know that there the controllers were changed?
                            if(accessoryIdList.length) {
                                self.renderNextAccessory(accessoryIdList.pop(), accessoryIdList);
                            } else {
                                self.model.save();
                            }
                        }});
    },


    events: {
        "change"        : "change",
        "click .save"   : "beforeSave",
        "click .delete" : "deleteLayout",
        "click .addctrl": "addController",
        "click .addacc" : "addAccessory",
//        "click .delctrl": "deleteController",
        "dragover #picture"     : "dragOver",
        "dragleave #picture"     : "dragLeave",
        "drop #picture" : "dropHandler",
        "click .change-picture" : "triggerFileInput",
        "change #picture-input" : "handleFileSelect"
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
            utils.uploadFile("layouts/" + this.model.id + '/picture', this.pictureFile,
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
        var self = this;
        // The Bootbox library manages modal dialogs in bootstrap
        // and makes our life easier:
        bootbox.confirm({
            message: "Delete this layout, are you sure?",
            buttons: {
                confirm: {
                    label: 'Delete',
                    className: 'btn-danger'
                },
                cancel: {
                    label: 'Cancel',
                    className: 'btn-secondary'
                }
            },
            callback: function (result) {
                if (result) {
                    self.model.destroy({
                        success: function () {
                            window.history.back();
                        }
                    });
                }
            }
        });
        return false;
    },
    
    addController: function() {
        if ($('.addctrl',this.el).attr('disabled'))
            return false;
        
        self = this;
        // Add a new controller to our layout:
        // - 1: create an empty controller
        // - 2: save it to server so we get an ID
        // - 3: create the view and display it
        var newController = new Controller();
        newController.save(null, {
            success: function (newController) {
                utils.showAlert('Success!', 'Controller added successfully.', 'alert-success');
                console.log('So the controller looks like this: ' + newController.id);
                self.model.get('controllers').push(newController.id);
                // TODO: we should trigger a model save of the layout here, to be sure that
                // the reference to the controller does not get lost, but then what if
                // the layout model does not validate ?
                var newControllerDetailsView = new ControllerDetailsView({model: newController});
                var $wrapper = $('<div class="col-md-3"></div>').append(newControllerDetailsView.render().el);
                $('#controllers', self.el).append($wrapper);
                // Ensure consistency
                self.model.save();
                $('.addacc',self.el).removeAttr('disabled'); // We have a controller, we can now add accessories
            },
            error: function () {
                console.log('Controller: error saving');
                utils.showAlert('Error', 'An error occurred while trying to add a controller.', 'alert-error');
            }
        });
        $('.addctrl',this.el).attr('disabled',true);

        return false;
    },
    
    addAccessory: function() {
        if ($('.addacc',this.el).attr('disabled'))
            return false;

        self = this;
        // Add a new accessory to our layout:
        // - 1: create an empty accessory
        // - 2: save it to server so we get an ID
        // - 3: create the view and display it
        var newAccessory = new Accessory();
        newAccessory.save(null, {
            success: function (newAccessory) {
                utils.showAlert('Success!', 'Accessory created successfully.', 'alert-success');
                console.log('So the accessory looks like this: ' + newAccessory.id);
                self.model.get('accessories').push(newAccessory.id);
                // TODO: we should trigger a model save of the layout here, to be sure that
                // the reference to the accessory does not get lost, but then what if
                // the layout model does not validate ?
                var newAccessoryDetailsView = new AccessoryDetailsView({model: newAccessory, lm:self.linkManager});
                var $wrapper = $('<div class="col-md-3"></div>').append(newAccessoryDetailsView.render().el);
                $('#accessories', self.el).append($wrapper);
                // Ensure consistency
                self.model.save();
            },
            error: function () {
                console.log('Accessory: error saving');
                utils.showAlert('Error', 'An error occurred while trying to add an accessory.', 'alert-error');
            }
        });

        return false;
    },

    
    dragOver: function(event) {
        //console.log('Something gettting dragged in here');
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
    }

});