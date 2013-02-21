/**
 * This is a view of a layout in running/operations mode.
 *
 */

window.LocoRunView = Backbone.View.extend({

    initialize: function () {
        this.totalPoints = 150;
        this.bemf = []; // Table of all BEMF readings
        for (var i=0; i< this.totalPoints; i++) {
            this.bemf.push(10);
        }
        this.socket = this.options.socket;
        this.socket.on('serialEvent', this.showInput);
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
        for (var i = 0; i < this.totalPoints; ++i){
            table.push([i, table[i]]);
        }
        return table;
    },
    
    showInput: function(data) {
        var bemfVal = parseInt(data.bemf);
        console.log('Loco run: ' + bemfVal);
        var targetVal = parseInt(data.target);
        var rateVal = parseInt(data.rate);
        
        if (this.plot) {
            this.bemf.slice(1).push(bemfVal);
            this.plot.setData([this.packData(this.bemf)]);
        }
    },
    
});