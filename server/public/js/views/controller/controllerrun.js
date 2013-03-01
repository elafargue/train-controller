/**
 * This is a view of a layout in running/operations mode.
 *
 */
window.ControllerRunView = Backbone.View.extend({

    initialize: function () {
        console.log("Initialize controller run view");
        this.linkManager = this.options.lm;
        // Need to explicitely remove before added to avoid
        // double bindings
        // TODO: implement this ? TbD
        this.linkManager.removeListener('input', this.showInput);
        this.linkManager.on('input', this.showInput);
        this.linkManager.on('status', this.updateStatus.bind(this));
        this.render();
    },

    render: function () {
        var self = this;
        console.log("Rendering our controller Run View");
        $(this.el).html(this.template(this.model.toJSON()));
        // Activate Bootstrap progressbar extended funtionality:
        $('.progress .bar', this.el).progressbar();
        // TODO: get all existing controllers and add the
        // relevant - and populated data into the view
        return this;
    },
    
    events: {
        "click .dir-back": "direction",
        "click .dir-fwd": "direction",
        "click .dir-stop": "direction",
        "click .power" : "power",
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
            this.linkManager.controllerCommand.stop();
        }
    },
    
    power: function(event) {
        var percentage = Math.floor((event.currentTarget.clientHeight - (event.pageY-event.currentTarget.offsetTop))/event.currentTarget.clientHeight*100);
        console.log("Power click at " + percentage + "%");
        $('.progress .bar', this.el).attr('data-percentage',
                                          percentage
                                         ).progressbar();
        if (this.linkManager.connected)
            this.linkManager.controllerCommand.speed(percentage);
    },
        
    showInput: function(data) {
        // Blink the indicator to show we're getting data
        $('.comlink', this.el).toggleClass('btn-success');
        if (data.dir) {
            switch(data.dir) {
                    case 'f':
                    $('.btn-group > .dir-fwd',this.el).addClass("btn-success");
                    $('.btn-group > .dir-back',this.el).removeClass("btn-success");
                    break;
                    case 'b':
                    $('.btn-group > .dir-back',this.el).addClass("btn-success");
                    $('.btn-group > .dir-fwd',this.el).removeClass("btn-success");
                    break;
            }
        }

        var rateVal = parseInt(data.rate);
        if (rateVal)
            $(".progress .bar", self.el).attr('data-percentage',rateVal/800*100).progressbar();
    },

    updateStatus: function(data) {
        if (this.linkManager.connected) {
            $(':button').removeAttr('disabled');
            // Weird bug: if you disable the slider, then it becomes draggable across
            // the whole page! Probably bad interaction with the touch patch
            // $(".power", this.el).slider('option', 'disabled', false);
        } else {
            $(':button', this.el).attr('disabled', true);
            // $(".power", this.el).slider('option', 'disabled', true);
        }
    },
    
    
});