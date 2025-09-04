window.LocoView = Backbone.View.extend({

    initialize: function () {
        
    },

    render: function () {
        var self = this;
        $(this.el).html(this.template(this.model.toJSON()));
        
        // Initialize logbook if not already done or if it's empty
        this.ensureLogbookLoaded(function() {
            self.fillLogbook();
        });
        
        // Add Bootstrap 5 modal event handler to refresh logbook when modal is shown
        $('#logbookModal', this.el).on('show.bs.modal', function () {
            self.ensureLogbookLoaded(function() {
                self.fillLogbook();
            });
        });
        
        return this;
    },
    
    ensureLogbookLoaded: function(callback) {
        var self = this;
        if (!this.model.logbook || this.model.logbook.url !== '/locos/' + this.model.id + '/logbook') {
            console.log('Initializing logbook for locomotive', this.model.id);
            this.model.logbook = new Logbook();
            this.model.logbook.url = '/locos/' + this.model.id + '/logbook';
            this.model.logbook.fetch({
                success: function() {
                    console.log('Logbook loaded successfully');
                    if (callback) callback();
                },
                error: function() {
                    console.log('Error loading logbook');
                    if (callback) callback(); // Still call callback to prevent hanging
                }
            });
        } else {
            // Logbook already loaded
            if (callback) callback();
        }
    },
    
    fillLogbook: function() {
        var self = this;
        var logbook = this.model.logbook;
        
        // Safety check - ensure logbook exists and DOM elements are available
        if (!logbook) {
            console.log('Logbook not available yet, will try again when modal is shown');
            return;
        }
        
        // Ensure DOM elements exist
        if ($('#logbook', this.el).length === 0 || $('#logbook-list', this.el).length === 0) {
            console.log('Logbook DOM elements not ready yet');
            return;
        }
        
        $('#logbook', this.el).empty().append("<tr><th>Date</th><th>Runtime</th><th>Comment</th><th>Delete</th></tr>");
        $('#logbook-list', this.el).empty().append("<tr><th>Date</th><th>Runtime</th><th>Comment</th></tr>");
        
        for (var i=0; i< logbook.length; i++) {
            var entry = logbook.at(i);
            var d = new Date(entry.get('date'));
            $('#logbook', this.el).append('<tr><td><small>' +
                                          d.toLocaleString() + '</small></td><td>' +
                                          utils.hms(entry.get('runtime')) + '</td><td>' +
                                          '<input type="text" name="lb-'+i+'" value="' +entry.get('comment') + '"></td><td class="text-center"><a href="#" title="Delete" role="button" class="btn btn-danger btn-mini deleteentry" name="'+ i +'"><i class="icon-remove-sign"></i></a></td></tr>');
            $('#logbook-list', this.el).append('<tr><td><small>' +
                                          d.toLocaleString() + '</small></td><td>' +
                                          utils.hms(entry.get('runtime')) + '</td><td>' +
                                          entry.get('comment') + '</td></tr>');
        }
    },

    events: {
        "change"        : "change",
        "click .save"   : "beforeSave",
        "click .delete" : "deleteLoco",
        "dragover #picture"     : "dragOver",
        "dragleave #picture"     : "dragLeave",
        "drop #picture" : "dropHandler",
        "dragover #manual-section"     : "dragOverManual",
        "dragleave #manual-section"     : "dragLeaveManual",
        "drop #manual-section" : "dropHandlerManual",
        "click .addentry" : "addEntry",
        "click .deleteentry": "deleteEntry",
        "click .change-picture" : "triggerFileInput",
        "change #picture-input" : "handleFileSelect",
        "click .change-manual" : "triggerManualInput",
        "change #manual-input" : "handleManualSelect",
    },

    change: function (event) {
        // Remove any existing alert message
        utils.hideAlert();

        // Apply the change to the model
        var target = event.target;
        var change = {};
        
        // Special case: if the name starts with "lb-" then we got a change for
        // an update to a logbook entry comment: save change immediately
        if (target.name.substr(0,3) == 'lb-') {
            var i = target.name.substr(3);
            this.model.logbook.at(i).save('comment',target.value);
            this.fillLogbook();
        } else {
        
            change[target.name] = target.value;
            this.model.set(change);
    
            // Run validation rule (if any) on changed item
            var check = this.model.validateItem(target.id);
            if (check.isValid === false) {
                utils.addValidationError(target.id, check.message);
            } else {
                utils.removeValidationError(target.id);
            }
        }
    },

    beforeSave: function () {
        var self = this;
        var check = this.model.validateAll();
        if (check.isValid === false) {
            utils.displayValidationErrors(check.messages);
            return false;
        }
        
        // Show loading message
        var hasUploads = this.pictureFile || this.manualFile;
        var uploadMessage = hasUploads ? 'Uploading files and saving locomotive...' : 'Please wait...';
        utils.showLoadingAlert(uploadMessage);
        
        // In case we have a new loco, we must save it first
        // so that the loco ID is populated, since the ID is used by the
        // picture save below:
        if (!this.model.id) {
            // Force async here: not ideal in terms of performance, but
            // this is not really a big deal, this is a short operation.
            this.model.save(null, {async:false});
        }
        
        var uploads = [];
        
        // Upload picture file if a new file was dropped in the drop area
        if (this.pictureFile) {
            uploads.push(new Promise((resolve, reject) => {
                utils.uploadFile('locos/' + self.model.id + '/picture', self.pictureFile,
                    function () {
                        // The server will rename the file to the ID of the loco,
                        // so let's set the picture accordingly and keep the
                        // filename extension:
                        self.model.set("picture", self.model.id + '.' + self.pictureFile.name.split(".").pop());
                        resolve();
                    },
                    function(error) {
                        reject(error);
                    }
                );
            }));
        }
        
        // Upload manual file if a new file was selected
        if (this.manualFile) {
            uploads.push(new Promise((resolve, reject) => {
                utils.uploadFile('locos/' + self.model.id + '/manual', self.manualFile,
                    function () {
                        // The server will rename the file to the ID of the loco
                        self.model.set("documentation", self.model.id + '.pdf');
                        resolve();
                    },
                    function(error) {
                        reject(error);
                    }
                );
            }));
        }
        
        // Wait for all uploads to complete, then save the model
        if (uploads.length > 0) {
            Promise.all(uploads).then(() => {
                self.saveLoco();
            }).catch((error) => {
                console.error('Upload error:', error);
                utils.showAlert('Error', 'An error occurred while uploading files', 'alert-error');
            });
        } else {
            this.saveLoco();
        }
        return false;
    },

    saveLoco: function () {
        var self = this;
        console.log('Saving loco...');
        this.model.save(null, {
            success: function (model) {
                // Clear any file references since they're now uploaded
                self.pictureFile = null;
                self.manualFile = null;
                self.render();
                app.navigate('locos/' + model.id, false);
                utils.showAlert('Success!', 'Locomotive saved successfully', 'alert-success');
            },
            error: function () {
                utils.showAlert('Error', 'An error occurred while trying to save this item', 'alert-error');
            }
        });
    },

    deleteLoco: function () {
        var self = this;
        // The Bootbox library manages modal dialogs in bootstrap
        // and makes our life easier:
        bootbox.confirm({
            message: "Delete this locomotive, are you sure?",
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
                    self.model.logbook.set([]);
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
        this.updatePictureDisplay();
    },
    
    addEntry: function(event) {
        var entry = new LogbookEntry();
        entry.set('locoid', this.model.id);
        entry.set('runtime', this.model.get('runtime'));
        this.model.logbook.create(entry);   
        this.fillLogbook();
        return false;
    },
    
    deleteEntry: function(event) {
        this.model.logbook.remove(this.model.logbook.at(event.currentTarget.name));
        this.fillLogbook();
        return false;
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
            this.updatePictureDisplay();
        }
    },

    dragOverManual: function(event) {
        console.log('Manual getting dragged in here');
        $("#manual-section").addClass("hover");
        return false;
    },
    
    dragLeaveManual: function(event) {
        $("#manual-section").removeClass("hover");
        return false;
    },

    dropHandlerManual: function (event) {
        event.stopPropagation();
        event.preventDefault();
        $("#manual-section").removeClass("hover");
        console.log('Manual file dropped');
        var e = event.originalEvent;
        e.dataTransfer.dropEffect = 'copy';
        var file = e.dataTransfer.files[0];
        
        // Check if it's a PDF file
        if (file && file.type === 'application/pdf') {
            this.manualFile = file;
            this.updateManualDisplay();
        } else {
            utils.showAlert('Error', 'Please select a PDF file for the manual.', 'alert-error');
        }
    },

    triggerManualInput: function(event) {
        event.preventDefault();
        $('#manual-input').click();
    },

    handleManualSelect: function(event) {
        const file = event.target.files[0];
        if (file) {
            if (file.type === 'application/pdf') {
                this.manualFile = file;
                this.updateManualDisplay();
            } else {
                utils.showAlert('Error', 'Please select a PDF file for the manual.', 'alert-error');
            }
        }
    },

    updateManualDisplay: function() {
        // Update the UI to show that a manual is ready to be uploaded
        var manualSection = $('#manual-section');
        manualSection.html(`
            <div class="mb-3">
                <i class="bi bi-file-earmark-pdf" style="font-size: 3rem; color: #dc3545;"></i>
                <p class="mt-2 mb-2 text-success">
                    <strong>Ready to upload:</strong><br>
                    <small>${this.manualFile.name}</small>
                </p>
            </div>
        `);
        $('.change-manual').html('<i class="bi bi-upload"></i> Change Manual');
    },

    updatePictureDisplay: function() {
        // Update the UI to show that a picture is ready to be uploaded
        // Find the help text and replace it with upload status
        var helpText = $('#picture').closest('.card-body').find('p.text-muted');
        if (helpText.length > 0) {
            helpText.removeClass('text-muted').addClass('text-success').html(`
                <strong>Ready to upload:</strong> ${this.pictureFile.name}<br>
                <small class="text-muted">Click Save to upload the new picture.</small>
            `);
        }
        
        // Update button text
        $('.change-picture').html('<i class="bi bi-image"></i> Change Image');
    },

});