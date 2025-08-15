window.DiagnosticsView = Backbone.View.extend({

    initialize:function (options) {
        this.options = options || {};
        this.linkManager = this.options.lm;
        // Query the controller for:
        // - POST result
        // - Memory
        // Request an accessory port test
        // Query accessory port test results
        this.linkManager.on('input', this.showInput, this);
    },
    
    onClose: function() {
        this.linkManager.off('input', this.showInput);
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
            $('#bemf',this.el).html(b.toFixed(3) + "&nbsp;mV");
        }
        if (typeof data.current != 'undefined') {
            var b = parseFloat(data.current);
            $('#current',this.el).html(b.toFixed(3) + "&nbsp;mA");
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
                var portNumber = Math.ceil((i+1)/2);
                var portSuffix = ((Math.ceil((i+1)/2) != (i+1)/2) ? 'a': 'b');
                var badgeClass = ((data.ports[i]) ? 'bg-success' : 'bg-danger');
                
                $('#accessorydetect',this.el).append(
                    '<div class="col-3 mb-2">' +
                        '<div class="card text-center accessorydiagitem">' +
                            '<div class="card-body p-2">' +
                                '<h6 class="card-title mb-1">' + portNumber + portSuffix + '</h6>' +
                                '<span class="badge ' + badgeClass + '">&nbsp;</span>' +
                            '</div>' +
                        '</div>' +
                    '</div>'
                );
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