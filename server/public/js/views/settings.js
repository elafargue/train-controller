window.SettingsView = Backbone.View.extend({

    initialize:function () {
        this.render();
        this.model.on('change', this.change, this);

    },

    render:function () {
        $(this.el).html(this.template(this.model.toJSON()));
        return this;
    },
    
    events: {
        "change"      : "change",
        "click #reset": "resetSettings",
        "dragover #restore-area"     : "dragOver",
        "dragleave #restore-area"     : "dragLeave",
        "drop #restore-area" : "dropHandler",

    },
    
    change: function() {
        // Apply the change to the model
        var target = event.target;
        var change = {};
        change[target.name] = target.value;
        this.model.set(change);
        this.model.save();

    },

    resetSettings: function() {
        // Clear our global settings/state:
        this.model.set({'currentLayout': null, 'currentLoco': null});
        this.model.save(null, {
                success: function(model) {
                   utils.showAlert('Success', 'Settings cleared', 'alert-success');
                   return true;
                },
                error: function () {
                    utils.showAlert('Error', 'An error occurred while trying to clear the settings', 'alert-error');
            }
        });
        return false;
    },
    
    dragOver: function(event) {
        $("#restore-area").addClass("hover");
        return false;
    },
    
    dragLeave: function(event) {
        $("#restore-area").removeClass("hover");
        return false;
    },

    dropHandler: function (event) {
        event.stopPropagation();
        event.preventDefault();
        $("#restore-area").removeClass("hover");
        console.log('File dropped');
        utils.showAlert('Hang on...', 'Restoring your settings, don\'t go away.', 'alert-warning');
        var e = event.originalEvent;
        e.dataTransfer.dropEffect = 'copy';
        this.pictureFile = e.dataTransfer.files[0];

        // Read the image file from the local file system and display it in the img tag
        $('#restore-area').attr('src', 'img/package-open-star.png');
        utils.uploadFile("/restore", this.pictureFile,
            function (value) {
                    console.log('Return value: ' + value);
                    $('#restore-area').attr('src', 'img/package-open.png');
                    if (value === "Invalid") {
                        utils.showAlert('Error', 'This backup file is invalid', 'alert-error');
                    } else {
                        utils.showAlert('Success!', 'Backup restored successfully', 'alert-success');
                    }
                }
            );

    },

    
});