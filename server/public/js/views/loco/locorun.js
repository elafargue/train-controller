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
        for (var i=0; i< this.totalPoints; i++) {
            this.bemf.push(0);
            this.rate.push(0);
            this.targetbemf.push(0);
        }
        this.socket = this.options.socket;
        this.socket.on('serialEvent', this.showInput.bind(this));
        this.render();
    },

    render: function () {
        $(this.el).html(this.template(this.model.toJSON()));
        return this;
    },
    
    // We can only add the plot once the view has finished rendering and its el is
    // attached to the DOM, so this function has to be called from the home view.
    addPlot: function() {
        // Now initialize the plot area:
        var options = {
            series: { shadowSize: 0 }, // drawing is faster without shadows
            yaxes: [ {  min:0, max:1024 },
                     {position: "right", alignTicksWithAxis: 1 , min:0, max:900}
                   ],
            xaxes: [ { show: false } ],
            legend: { position: "ne" }
        };
        console.log('Loco chart size: ' + this.$('.locochart').width());
        this.plot = $.plot($(".locochart", this.el), [ { data:this.packData(this.bemf), label: "RPM" },
                                                      { data:this.packData(this.rate), label: "Power", yaxis: 2},
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
        // TODO: graph all values, not only BEMF... 
        // TODO : scaling is arbitrary at this stage...
        var bemfVal = parseInt(data.bemf);
        var targetVal = parseInt(data.target);
        var rateVal = parseInt(data.rate);
        
        if (this.plot) {
            this.bemf = this.bemf.slice(1);
            this.bemf.push(bemfVal);
            this.rate = this.rate.slice(1);
            this.rate.push(rateVal);
            this.targetbemf = this.targetbemf.slice(1);
            this.targetbemf.push(targetVal);
            this.plot.setData([ { data:this.packData(this.bemf), label: "RPM" },
                                                      { data:this.packData(this.rate), label: "Power", yaxis: 2},
                                                      { data:this.packData(this.targetbemf), color: "rgba(127,127,127,0.3)" }]);
            this.plot.draw();
        }
    },
    
});