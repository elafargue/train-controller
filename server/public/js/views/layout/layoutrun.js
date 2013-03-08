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
        "dragover .accessoryitem" : "dragOver",
        "dragleave #layoutpic"    : "dragLeave",
        "drop #layoutpic"         : "dropHandler",
        "drop .accessoryitem"     : "dropHandler"
    },

    
    d2: function(event) {
        return false;
    },
    dragOver: function(event) {
        $("#layoutpic").addClass("hover");
        // Snap to grid here:
        this.dm.style.left = Math.floor((event.originalEvent.pageX - this.imgOffset.left-this.myOffsetLeft+5)/10)*10 + 'px';
        this.dm.style.top =  Math.floor((event.originalEvent.pageY - this.imgOffset.top-this.myOffsetTop+5)/10)*10 + 'px';
        return false;
    },
    
    dragLeave: function(event) {
        $("#layoutpic").removeClass("hover");
        return false;
    },

    
    accdragstart: function(event) {
        console.log("Drag start");
        event.originalEvent.dataTransfer.setData("text/plain",
                    event.currentTarget.id);
        // Set a few variables to speed up the drag and drop ops:
        this.imgOffset = $("#layoutpic", this.el).offset();
        this.dm = document.getElementById(event.target.id);
        // Offset within the clicked accessory (passed as part of the event context:
        this.myOffsetLeft = event.originalEvent.offsetX;
        this.myOffsetTop = event.originalEvent.offsetY;
    },
    
    dropHandler: function(event) {
        var self = this;
        console.log("Drop on layout pic");
        $("#layoutpic").removeClass("hover");
        var offset = event.originalEvent.dataTransfer.getData("text/plain").split(',');
        // Compute style in percent of the containing image, so that we can handle
        // window resizes automatically:
        var imgWidth = $("#layoutpic").width();
        var imgHeight = $("#layoutpic").height();
        // Note: most browsers round the percentage to ceil, so the DIV moves slightly
        // when converting from pixel to percentage, I don't know how to avoid this
        this.dm.style.left = parseInt(this.dm.style.left)/imgWidth*100 + '%';
        this.dm.style.top = parseInt(this.dm.style.top)/imgHeight*100 + '%';
        
        // Now save this new position: (get ID from the element's ID, since it's "acc-ID"
        var id = offset[0].substr(4);
        var accessory = new Accessory({_id: id});
        accessory.fetch({success: function(){
                accessory.save({locX: parseFloat(self.dm.style.left,10), locY: parseFloat(self.dm.style.top)});
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