/**
 * This is a view of a layout in running/operations mode.
 *
 */
window.ControllerRunView = Backbone.View.extend({

    initialize: function () {
        console.log("Initialize controller run view");
        this.linkManager = this.options.lm;
        this.settings = this.options.settings;
        this.powersliderstyle = this.settings.get('powersliderstyle');
        // Need to explicitely remove before added to avoid
        // double bindings
        this.linkManager.off('input', this.showInput);
        this.linkManager.off('status',this.updateStatus);
        this.linkManager.on('input', this.showInput, this);
        this.linkManager.on('status', this.updateStatus, this);
        
        // Save original PID values upon creation, so that we can
        // reset those if we want to:
        this.origkp = this.model.get('pidkp');
        this.origki = this.model.get('pidki');
        this.origkd = this.model.get('pidkd');
        this.origsample = this.model.get('pidsample');
        
        // Variables for throttling PID updates so that our
        // controller can keep up: don't send updates faster
        // than every XXXms
        this.pidstamp = new Date().getTime();
        this.pidupdatepending = false;
        this.pidupdateneeded = true;
        this.pidwd = null;
        
        // Also throttle sending speed udpates to the controller
        this.speedstamp = new Date().getTime();
        
        this.render();
    },

    render: function () {
        var self = this;
        console.log("Rendering our controller Run View");
        $(this.el).html(this.template(this.model.toJSON()));
        // Activate Bootstrap progressbar extended funtionality:
        $('.progress .bar', this.el).progressbar();
        this.fillspinners();
        
        $('.dial', this.el).knob({'change': function(v) { self.powerknob(v,self);}});
        
        $('.pidquery', this.el).tooltip({delay:1200, placement:'bottom'});
        return this;
    },
    
    fillspinners: function() {
        var options = {
            minimum: 0,
            maximum: 10,
            step: 0.1,
            numberOfDecimals: 2,
            value: this.model.get('pidkp')
        };
        
        $('#kp', this.el).spinedit(options);
        options.value = this.model.get('pidki');
        $('#ki', this.el).spinedit(options);
        options.value = this.model.get('pidkd');
        $('#kd', this.el).spinedit(options);
        options = { step: 10,
                    minimum: 60,
                    maximum: 600,
                    numberOfDecimals: 0,
                    value: this.model.get('pidsample'),
                  };
        $('#sample', this.el).spinedit(options);

    },
    
    events: {
        "valueChanged #kp": "updatepid",
        "valueChanged #ki": "updatepid",
        "valueChanged #kd": "updatepid",
        "valueChanged #sample" : "updatepid",
        "click .pidreset" : "resetpid",
        "click .pidsave"  : "savepid",
        "click .pidquery" : "querypid",
        "click .dir-back": "direction",
        "click .dir-fwd": "direction",
        "click .dir-stop": "direction",
        "click .power" : "power",
        "touchmove .power": "power",
        "remove": "onRemove",
    },
    
    updatepid: function(event) {
        console.log("PID Value changed: " + event.value + " for " + event.target.id);
        // Apply the change to the model
        var target = event.target;
        var change = {};
        // Our Spinedit control returns values as strings even
        // when they are numbers (uses jQuery's .val() in the setvalue method),
        // so we have to attempt to convert it back to a number if it makes
        // sense:
        var numval = parseFloat(target.value);
        change[target.name] = isNaN(numval) ? target.value : numval;
        this.model.set(change);
        if (this.pidupdatepending) {
            // With the below, we'll sometimes send an update twice, but
            // we are sure the controller will always be in sync.
            this.pidupdateneeded = true;
            return;
        }
        this.pidupdatepending = true;
        var stamp = new Date().getTime()/1000;
        if (stamp - this.pidstamp > 400) {
            this.pidstamp = stamp;
            this.sendPIDupdate();
        } else {
            // Set a timer to delay the PID update command:
            console.log("Controller run view: throttle PID updates");
            this.pidwd = setTimeout(this.sendPIDupdate.bind(this), 400);
        }
    },
    
    sendPIDupdate: function() {
        var self = this;
        this.linkManager.controllerCommand.setPID(this.model.get('pidkp'),
                                this.model.get('pidki'),
                                this.model.get('pidkd'),
                                this.model.get('pidsample'));
        // Now we'll wait for an ACK to come from the controller...
        // but we put a timeout still
        setTimeout(function() {self.pidupdatepending = false;}, 1000);
    },
    
    resetpid: function() {
        console.log('Reset to initial PID values');
        // Note: the spinedit setValue function will trigger
        // a 'change' signal, caught by 'updatepid' above.
        $('#kp', this.el).spinedit('setValue', this.origkp);
        $('#ki', this.el).spinedit('setValue', this.origki);
        $('#kd', this.el).spinedit('setValue', this.origkd);
    },
    
    savepid: function() {
        // Note: we don't monitor success here, we probably should
        // but it is not absolutely critical - risk is to loose
        // PID settings updates, though.
        this.model.save();
    },
    
    querypid: function() {
        this.linkManager.controllerCommand.getPID();        
    },
        
    direction: function(event) {
        event.stopPropagation(); // We have 2 divs with ".dir-XXX" class, so
                                 // if the inner div gets the even, we don't want the
                                 // outer div to get it again, hence the stopPropagation.
        if ($(event.target).hasClass('dir-fwd')) {
            console.log("Go forward");
            this.linkManager.controllerCommand.forward();
        } else if ($(event.target).hasClass('dir-back')) {
            console.log("Go backwards");
            this.linkManager.controllerCommand.backward();
        } else if ($(event.target).hasClass('dir-stop')) {
            console.log("Stop train");
            this.linkManager.controllerCommand.speed(0);
            // Give it 2 seconds before setting controller to stop:
            setTimeout(2000, this.linkManager.controllerCommand.stop());
        }
    },
    
    power: function(event) {
        if (!this.linkManager.connected)
            return;
        // Detect if we're on a tablet and behave accordingly:
        if (event.type === "touchmove") {
            event.preventDefault(); // block finger scrolling of the page
            // Assume we only have one finger on the screen, ok ?
            var touch = event.originalEvent.touches[0];
            event.pageY = touch.pageY; // Yeah, hack the jQuery event!
        }
        var percentage = Math.floor((event.currentTarget.clientHeight - (event.pageY-event.currentTarget.offsetTop))/event.currentTarget.clientHeight*100);
        var stamp = new Date().getTime();
        if ((stamp - this.speedstamp) < 400)
            return;
        this.speedstamp = stamp;
        console.log("Power click at " + percentage + "%");
        $('.progress .bar', this.el).attr('data-percentage',
                                          percentage
                                         ).progressbar();
        this.linkManager.controllerCommand.speed(percentage);
    },

    powerknob: function(value,self) {
        if (!self.linkManager.connected)
            return;
        var stamp = new Date().getTime();
        if ((stamp - self.speedstamp) < 800)
            return;
        self.speedstamp = stamp;
        console.log("Power knob click at " + value + "%");
        this.linkManager.controllerCommand.speed(value);
    },

    
    onRemove: function() {
        console.log("Controller run view remove");
    },
        
    showInput: function(data) {
        // Blink the indicator to show we're getting data
        $('.comlink', this.el).toggleClass('btn-success');
        if (typeof data.ack != 'undefined') {
            if (data.cmd === "pid") {
                if (data.ack) {
                    clearTimeout(this.pidwd);
                    this.pidupdatepending = false;
                    if (this.pidupdateneeded) {
                        this.pidupdateneeded = false;
                        this.sendPIDupdate();
                    }
                } else {
                    // Retry...
                    this.sendPIDupdate();
                }
            }
        }
        if (data.dir) { // Controller replays each command it receives, handy!
            $('.power', this.el).removeAttr('disabled');
            switch(data.dir) {
                    case 'f':
                        $('.btn-group > .dir-fwd',this.el).addClass("btn-success");
                        $('.btn-group > .dir-back',this.el).removeClass("btn-success");
                        break;
                    case 'b':
                        $('.btn-group > .dir-back',this.el).addClass("btn-success");
                        $('.btn-group > .dir-fwd',this.el).removeClass("btn-success");
                        break;
                    case 's':
                        $('.btn-group > .dir-fwd',this.el).removeClass("btn-success");
                        $('.btn-group > .dir-back',this.el).removeClass("btn-success");
                        break;
            }
        }

        var rateVal = parseInt(data.rate);
        if (!isNaN(rateVal)) {
            $('.progress .bar', self.el).attr('data-percentage',rateVal/800*100).progressbar();
            $('.dial', this.el).val(rateVal/800*100).trigger('change');
            if (rateVal < 10) { // We consider the train stopped under a PWM rate of 10.
                $('.btn-group > .dir-stop',this.el).addClass("btn-danger");
            } else {
                $('.btn-group > .dir-stop',this.el).removeClass("btn-danger");
            }
        }
        
        var kp = parseFloat(data.kp);
        if (!isNaN(kp)) {
            var ki = parseFloat(data.ki);
            var kd = parseFloat(data.kd);
            var sample = parseInt(data.sample);
            this.model.set('pidkp', kp);
            this.model.set('pidki', ki);
            this.model.set('pidkd', kd);
            this.model.set('pidsample', sample);
            $('#kp', this.el).spinedit('setValueSilent', kp);
            $('#ki', this.el).spinedit('setValueSilent', ki);
            $('#kd', this.el).spinedit('setValueSilent', kd);
            $('#sample', this.el).spinedit('setValueSilent', sample);

        }
    },

    updateStatus: function(data) {
        if (this.linkManager.connected) {
            // TODO: right now, we're retrieving from the
            // controller, when should we be setting ?
            this.linkManager.controllerCommand.getPID();
            $(':button', this.el).removeAttr('disabled');
            $(':input', this.el).removeAttr('disabled');
            // Weird bug: if you disable the slider, then it becomes draggable across
            // the whole page! Probably bad interaction with the touch patch
            // $(".power", this.el).slider('option', 'disabled', false);
        } else {
            $(':button', this.el).attr('disabled', true);
            $(':input', this.el).attr('disabled', true);
            $('.power', this.el).attr('disabled', true);
            $('.btn-group > .dir-back',this.el).removeClass("btn-success");
            $('.btn-group > .dir-fwd',this.el).removeClass("btn-success");
            $('.btn-group > .dir-stop',this.el).removeClass("btn-danger");
            // $(".power", this.el).slider('option', 'disabled', true);
        }
    },
    
    
});