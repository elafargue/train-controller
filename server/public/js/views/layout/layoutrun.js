/**
 * This is a view of a layout in running/operations mode.
 *
 */

window.LayoutRunView = Backbone.View.extend({

    initialize: function () {
        console.log('Layout Run View Initialize');
        this.linkManager = this.options.lm;
        // Unbind before rebinding, to avoid double subscriptions
        this.linkManager.off('status', this.updatestatus);
        this.linkManager.on('status', this.updatestatus, this);
        this.render();
    },

    render: function () {
        this.$el.html(this.template(this.model.toJSON()));
        // Populate the layout with all the accessories contained there
        var accessories = new Array().concat(this.model.get('accessories'));
        if (accessories.length) {
            console.log('We have ' + accessories.length + ' accessories for this layout');
            // We are going to start a recursive creation of all accessory views:
            this.renderNextAccessory(accessories.pop(), accessories);
        }

        // Get the connection status of the controller:
        this.linkManager.requestStatus();
        return this;
    },
    
    renderNextAccessory: function(nextId, accessoryIdList) {
        var self = this;
        var newAccessory = new Accessory({_id: nextId});
        newAccessory.fetch({success: function(){
                var newAccessoryItemView = new AccessoryItemView({model: newAccessory, lm:self.linkManager});
                $('#layoutarea', self.el).append(newAccessoryItemView.render().el);
                if (accessoryIdList.length) {
                    self.renderNextAccessory(accessoryIdList.pop(), accessoryIdList);
                }
                            },
                            error: function() {
                                // Somehow the accessory Id we got in the array was not
                                // valid: move on to the next one (the layout edit view
                                // goes further and deletes the wrong reference)
                                console.log('Skipping ghost accessory');
                                if(accessoryIdList.length) {
                                    self.renderNextAccessory(accessoryIdList.pop(), accessoryIdList);
                                }
                            }});
    },
        
    events: {
        "click .ctrl-connect":  "ctrlConnect",
        "remove": "onRemove",
        "dragstart .accessoryitem": "accdragstart",
        "dragover #layoutpic"     : "dragOver",
        "dragleave #layoutpic"    : "dragLeave",
        "drop #layoutpic"         : "dropHandler"
    },

    dragOver: function(event) {
        //console.log('Something gettting dragged in here');
        $("#layoutpic").addClass("hover");
        return false;
    },
    
    dragLeave: function(event) {
        $("#layoutpic").removeClass("hover");
        return false;
    },

    
    accdragstart: function(event) {
        console.log("Drag start");
        var style = window.getComputedStyle(event.target, null);
        // We gotta check the unit of getPropertyValue (can be px or %)
        // Note: we assume that if 'left' is in %, then 'top' is in % too.
        var unitIsPercent = style.getPropertyValue("left").indexOf('%');
        var left = parseFloat(style.getPropertyValue("left"),10);
        var top  = parseFloat(style.getPropertyValue("top"),10)
        if (unitIsPercent>0) {
            var width  = $('#layoutpic', this.el).width();
            var height = $('#layoutpic', this.el).height();
            left = width*left/100;
            top =  height*top/100;
        } 
        event.originalEvent.dataTransfer.setData("text/plain",
                    (left - event.originalEvent.clientX) + ',' +
                    (top - event.originalEvent.clientY) + ',' +
                                                event.currentTarget.id);
    },
    
    dropHandler: function(event) {
        console.log("Drop on layout pic");
        $("#layoutpic").removeClass("hover");
        var offset = event.originalEvent.dataTransfer.getData("text/plain").split(',');
        var dm = document.getElementById(offset[2]);
        // Compute style in percent of the containing image, so that we can handle
        // window resizes automatically:
        var imgWidth = event.currentTarget.clientWidth;
        var imgHeight = event.currentTarget.clientHeight;
        dm.style.left = (event.originalEvent.clientX + parseFloat(offset[0],10))/imgWidth*100 + '%';
        dm.style.top = (event.originalEvent.clientY + parseFloat(offset[1],10))/imgHeight*100 + '%';
        
        // Now save this new position: (get ID from the element's ID, since it's "acc-ID"
        var id = offset[2].substr(4);
        var accessory = new Accessory({_id: id});
        accessory.fetch({success: function(){
                accessory.save({locX: parseFloat(dm.style.left,10), locY: parseFloat(dm.style.top)});
        }});
        event.preventDefault();
        return false;
    },
    
    onRemove: function() {
        console.log("Removing layout run view");
    },
    
    updatestatus: function(data) {
        // Depending on port status, update our controller
        // connect button:
        if (this.linkManager.connected) {
            $('.ctrl-connect', this.el).html("Disconnect controller.")
                .removeClass('btn-danger').addClass('btn-success').removeClass('btn-warning').removeAttr('disabled');
        } else {
            $('.ctrl-connect', this.el).html("Connect to controller.")
                .addClass('btn-danger').removeClass('btn-success').removeClass('btn-warning').removeAttr('disabled');
        }
    },
    
    ctrlConnect: function() {
        var self = this;
        if ($('.ctrl-connect', this.el).attr('disabled'))
            return;
        $('.ctrl-connect', this.el).html("Connect to controller.").addClass('btn-warning').removeClass('btn-success')
                                   .removeClass('btn-danger').attr('disabled', true);
        // First, get controller settings (assume Serial for now)
        var controllers = this.model.get('controllers');
        if (controllers.length) {
            var controller = new Controller({_id:controllers[0]});
            controller.fetch({success: function() {
                if (!self.linkManager.connected) {
                    self.linkManager.openPort(controller.get('port'));
                } else {
                    self.linkManager.closePort(controller.get('port'));
                }
             }});
        }
    }
    
});