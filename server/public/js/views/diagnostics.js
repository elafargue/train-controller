window.DiagnosticsView = Backbone.View.extend({

    initialize:function () {
        this.linkManager = this.options.lm;
        
        // Check the controller is connected
        
        // Query the controller for:
        // - POST result
        // - Memory
        // Request an accessory port test
        // Query accessory port test results
        this.linkManager.off('input', this.showInput);
        this.linkManager.on('input', this.showInput, this);

        this.render();
    },
    
    events: {
        "click .refresh": "refresh",
        "click #accpset": "setAccPulse",
        "click #accmset": "setAccMaxOn",
    },

    render:function () {
        var self = this;
        this.$el.html(this.template(this.model.toJSON()));
        
        // Create 16 accessories manually for testing:
        for (var i=1; i<= 16; i++) {
            var newAccessory = new Accessory();
            newAccessory.set('_id',-1);
            newAccessory.set('controllerAddress', i);
            newAccessory.set('name', i);
            $('#accessoryarea', self.el).append(new AccessoryItemDiagView({model: newAccessory, lm:self.linkManager}).render().el);
        }
        
        this.refresh();
        return this;
    },
    
    refresh: function() {
        $('#accessorydetect',this.el).empty();
        $('#post',this.el).removeClass('badge-success').removeClass('badge-important');
        $('#post',this.el).html("Waiting...");
        $('#post2',this.el).html('');
        // Query controller for POST result and memory:
        this.queriesDone = false;
        if (this.linkManager.connected) {
            this.linkManager.controllerCommand.getPOST();
        }
    },
    
    setAccPulse: function() {
        var p = $('#accp', this.el).val();
        this.linkManager.controllerCommand.setAccPulse(p);
    },
    
    setAccMaxOn: function() {
        var p = $('#accm', this.el).val();
        this.linkManager.controllerCommand.setAccMaxOn(p);
    },
    
    showInput: function(data) {
        // Blink the indicator to show we're getting data
        $('.comlink', this.el).toggleClass('btn-success');
        var i = $('#input',this.el);
        i.val(i.val() + JSON.stringify(data) + '\n');
        // Autoscroll:
        i.scrollTop(i[0].scrollHeight - i.height());
        if (typeof data.ack != 'undefined') {
        }
        if (typeof data.freeram != 'undefined') 
            $('#freeram',this.el).html(data.freeram + " bytes");
        if (typeof data.bemf != 'undefined') {
            var b = parseFloat(data.bemf);
            var bemf = b*5/1024;
            $('#bemf',this.el).html(bemf.toFixed(3) + "&nbsp;V - raw: " + b.toFixed(1));
        }
        if (typeof data.post != 'undefined') {
            $('#post',this.el).html(data.post);
            if (data.post === "PASS") {
                $('#post',this.el).addClass('badge-success').removeClass('badge-important');
                $('#post2',this.el).html('');
                $('#port-diags',this.el).css({opacity: 1.0});
            }
            if (data.post === "FAIL") {
                $('#post',this.el).removeClass('badge-success').addClass('badge-important');
                $('#post2',this.el).html(" - " + data.err);
                if (data.err === "SPI") $('#port-diags',this.el).css({opacity: 0.3});
            }
           if (!this.queriesDone) {
               this.linkManager.controllerCommand.portTest();
           }
        }
        if (typeof data.ports != 'undefined') {
            // Create a report of open-closed accessories
            for (var i= 0; i < data.ports.length; i++) {
                $('#accessorydetect',this.el).append('<div class="thumbnail glowthumbnail accessorydiagitem" ><h6>'+(i+1)+'</h6><div>' +
                '<span class="badge ' + ((data.ports[i]) ? 'badge-success' : 'badge-important') + '">&nbsp</span></div></div>');
            }
           if (!this.queriesDone) {
                this.linkManager.controllerCommand.getAccPulse();
           }
        }
        if (typeof data.accp != 'undefined') {
            $('#accp',this.el).val(data.accp);
            if (!this.queriesDone) {
                this.queriesDone = true;
                this.linkManager.controllerCommand.getAccMaxOn();
           }
        }
        if (typeof data.accm != 'undefined') {
            $('#accm',this.el).val(data.accm);
        }
    }
});