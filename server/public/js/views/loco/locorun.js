/**
 * This is a view of a layout in running/operations mode.
 *
 */

window.LocoRunView = Backbone.View.extend({

    initialize: function () {
        this.totalPoints = 150;
        this.bemf = []; // Table of all BEMF readings
        this.rate = [];
        this.targetbemf = [];
        this.current = [];
        this.running = false;
        this.prevStamp = 0;
        this.logbookFetched = false;
        for (var i=0; i< this.totalPoints; i++) {
            this.bemf.push(0);
            this.rate.push(0);
            this.current.push(0);
            this.targetbemf.push(0);
        }
        this.linkManager = this.options.lm;
        this.linkManager.off('input', this.showInput);
        this.linkManager.on('input', this.showInput, this);
        // Create a timer that updates the running time while power is above zero
        // (cleared when view is removed)
        this.timer = setInterval(this.updateRuntime.bind(this), 1000);
        this.render();
    },
    
    events: {
        "remove": "onRemove",
    },
    
    onRemove: function() {
        console.log("Loco run view remove");
        this.model.save(); // save runtime in particular.
        clearInterval(this.timer);
    },

    render: function () {
        $(this.el).html(this.template(this.model.toJSON()));
        // Update last maintenance entry here:
        this.fillMaintenance();
        
        return this;
    },
    
    fillMaintenance: function() {
        var self = this;
        var logbook = this.model.logbook;
        $('#maintenance', this.el).empty();
        var fill = function() {
            var entry = logbook.at(logbook.length-1);
            var d = new Date(entry.get('date'));
            $('#maintenance', this.el).html(utils.hms(entry.get('runtime')));
            self.logbookFetched = true;
        };
        if (this.logbookFetched) {
            fill();
            
        } else {
            logbook.fetch({success:function() {fill();}
                          });
        }
    },

    
    updateRuntime: function() {
        if (this.running) {
            var stamp = new Date().getTime()/1000;
            var runtime = parseInt(this.model.get('runtime'))+stamp-this.prevStamp;
            this.model.set({"runtime": runtime});
            $('#runtime',this.el).html(utils.hms(runtime));
            this.prevStamp = stamp;
            if (!this.linkManager.connected) {
                this.running = false;
                this.model.save();
            }
        }
    },
    
    // We can only add the plot once the view has finished rendering and its el is
    // attached to the DOM, so this function has to be called from the home view.
    addPlot: function() {
        // Now initialize the plot area:
        var options = {
            series: { shadowSize: 0 }, // drawing is faster without shadows
            yaxes: [ {  min:0, max:3300 },
                     {position: "right", alignTicksWithAxis: 1 , min:0, max:900},
                     { min:0, max: 1000}
                   ],
            xaxes: [ { show: false } ],
            legend: { position: "ne" }
        };
        console.log('Loco chart size: ' + this.$('.locochart').width());
        this.plot = $.plot($(".locochart", this.el), [ { data:this.packData(this.bemf), label: "RPM" },
                                                      { data:this.packData(this.rate), label: "Power", yaxis: 2},
                                                      { data:this.packData(this.current), label:"Current", yaxis: 3},
                                                      { data:this.packData(this.targetbemf), color: "rgba(127,127,127,0.3)" }], options);
    },
    
    packData: function(table) {
        // zip the our table of Y values with the x values
        var ret = [];
        for (var i = 0; i < this.totalPoints; ++i){
            ret.push([i, table[i]]);
        }
        return ret;
    },
    
    showInput: function(data) {
        // TODO : scaling is arbitrary at this stage...
        var bemfVal = parseFloat(data.bemf);
        var targetVal = parseFloat(data.target);
        var rateVal = parseInt(data.rate);
        var currentVal = parseFloat(data.current);
        if (!isNaN(data.rate)) {
            if (rateVal > 10) {
                if (!this.running) {
                    this.prevStamp = new Date().getTime()/1000;
                    this.running = true;
                    $('#runtime',this.el).addClass("text-success");
                }
            } else if (this.running) {
                this.updateRuntime();
                this.running = false;
                $('#runtime',this.el).removeClass("text-success");
                this.model.save();
            }
            if (this.plot) {
                this.bemf = this.bemf.slice(1);
                this.bemf.push(bemfVal);
                this.rate = this.rate.slice(1);
                this.rate.push(rateVal);
                this.targetbemf = this.targetbemf.slice(1);
                this.targetbemf.push(targetVal);
                this.current = this.current.slice(1);
                this.current.push(currentVal);
                this.plot.setData([ { data:this.packData(this.bemf), label: "RPM" },
                                    { data:this.packData(this.rate), label: "Power", yaxis: 2},
                                    { data:this.packData(this.current), label:"Current", yaxis: 3},
                                    { data:this.packData(this.targetbemf), color: "rgba(127,127,127,0.3)" }]);
                this.plot.draw();
            }
        }
    },
    
});