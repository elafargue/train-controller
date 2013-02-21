/**
 * This is a view of a layout in running/operations mode.
 *
 */

window.LocoRunView = Backbone.View.extend({

    initialize: function () {
        this.totalPoints = 150;
        this.bemf = []; // Table of all BEMF readings
        for (var i=0; i< this.totalPoints; i++) {
            this.bemf.push(0);
        }
        this.socket = this.options.socket;
        this.socket.on('serialEvent', this.showInput.bind(this));
        this.render();
    },

    render: function () {
        $(this.el).html(this.template(this.model.toJSON()));
        // Now initialize the plot area:
        var options = {
            series: { shadowSize: 0 }, // drawing is faster without shadows
            yaxis: { min: 0, max: 900 },
            xaxis: { show: false },
            legend: { position: "sw" }
        };
        console.log('Loco chart size: ' + this.$('.locochart').width());
        this.plot = $.plot($(".locochart", this.el), [ this.packData(this.bemf)], options);
        return this;
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
        var bemfVal = parseInt(data.bemf);
        console.log('Loco run: ' + bemfVal);
        var targetVal = parseInt(data.target);
        var rateVal = parseInt(data.rate);
        
        if (this.plot) {
            this.bemf = this.bemf.slice(1);
            this.bemf.push(bemfVal);
            this.plot.setData([this.packData(this.bemf)]);
            this.plot.draw();
        }
    },
    
});