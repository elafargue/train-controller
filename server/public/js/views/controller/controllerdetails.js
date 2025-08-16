window.ControllerDetailsView = Backbone.View.extend({

    initialize: function () {
        // Load available serial ports when initializing
        this.loadSerialPorts();
    },

    loadSerialPorts: function() {
        var self = this;
        $.ajax({
            url: '/api/serialports',
            type: 'GET',
            success: function(ports) {
                self.availablePorts = ports;
                if (self.rendered) {
                    self.populatePortDropdown();
                }
            },
            error: function(xhr, status, error) {
                console.error('Failed to load serial ports:', error);
                // Fallback to TEST only
                self.availablePorts = [{
                    path: 'TEST',
                    manufacturer: 'Virtual',
                    serialNumber: 'TEST001'
                }];
                if (self.rendered) {
                    self.populatePortDropdown();
                }
            }
        });
    },

    populatePortDropdown: function() {
        var self = this;
        var select = $('#port-select', this.el);
        var currentPort = this.model.get('port');
        
        // Clear existing options
        select.empty();
        
        // Add port options
        this.availablePorts.forEach(function(port) {
            var displayName = port.path;
            if (port.path !== 'TEST' && port.manufacturer && port.manufacturer !== 'Unknown') {
                displayName += ' (' + port.manufacturer + ')';
            }
            
            var option = $('<option></option>')
                .attr('value', port.path)
                .text(displayName);
            
            if (port.path === currentPort) {
                option.attr('selected', 'selected');
            }
            
            select.append(option);
        });
        
        // If current port is not in the list, add it as a custom option
        if (currentPort && !this.availablePorts.find(p => p.path === currentPort)) {
            var customOption = $('<option></option>')
                .attr('value', currentPort)
                .attr('selected', 'selected')
                .text(currentPort + ' (Custom)');
            select.append(customOption);
        }
    },

    render: function () {
        console.log("Render controller details");
        $(this.el).html(this.template(this.model.toJSON()));
        this.rendered = true;
        
        // Set initial values
        $('#kp', this.el).val(this.model.get('pidkp'));
        $('#ki', this.el).val(this.model.get('pidki'));
        $('#kd', this.el).val(this.model.get('pidkd'));
        $('#sample', this.el).val(this.model.get('pidsample'));

        // Populate port dropdown if ports are already loaded
        if (this.availablePorts) {
            this.populatePortDropdown();
        }

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
                // Get the modal instance
                var modalEl = document.getElementById('myModal-' + self.model.id);
                var modal = bootstrap.Modal.getInstance(modalEl);
                
                // Listen for the hidden event
                modalEl.addEventListener('hidden.bs.modal', function () {
                    console.log('Hidden modal');
                    // Trigger a render since the name might have changed
                    self.render();
                }, { once: true }); // Remove listener after first trigger
                
                // Hide the modal
                modal.hide();
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