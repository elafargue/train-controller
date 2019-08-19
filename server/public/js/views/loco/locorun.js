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
        
        // My own nice color palette:
        this.palette = ["#e27c48", "#acbe80",  "#f1ca4f",  "#77b1a7", "#858485", "#d9c7ad", "#5a3037", ],

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
            var runtime = this.startTime+stamp-this.startStamp;
            this.model.set({"runtime": runtime});
            $('#runtime',this.el).html(utils.hms(runtime));
            // Force save of runtime every 10 seconds so that we never lose more
            // than 10s of runtime in the database, no matter what happens:
            if (stamp - this.prevSave > 10) {
                        this.model.save();
                        this.prevSave = stamp;
                        }
            if (!this.linkManager.connected) {
                this.running = false;
                this.model.save();
            }
        }
    },
    
    // We can only add the plot once the view has finished rendering and its el is
    // attached to the DOM, so this function has to be called from the home view.
    addPlot: function() {
        var self = this;
        // Now initialize the plot area:
        var options = {
            series: { shadowSize: 0 }, // drawing is faster without shadows
            yaxes: [ {  min:0, max:6000, font: {color: this.palette[0]} },
                     {position: "right", alignTicksWithAxis: 1 , min:0, max:900, font: {color: this.palette[1]}},
                     { min:0, max: 1000, font: {color: this.palette[2]}}
                   ],
            xaxes: [ { show: false } ],
            legend: { position: "ne" },
//            crosshair: {
//				mode: "x"
//			},
//            grid: {
//				hoverable: true,
//				autoHighlight: false
//			},
            colors: this.palette,
        };
        console.log('Loco chart size: ' + $('.locochart').width());
        this.plot = $.plot($('.locochart', this.el), [ { data:this.packData(this.bemf), label: "RPM (mV)" },
                                                      { data:this.packData(this.rate), label: "Power (%)", yaxis: 2},
                                                      { data:this.packData(this.current), label:"Current (mA)", yaxis: 3},
                                                      { data:this.packData(this.targetbemf), color: "rgba(127,127,127,0.3)" }], options);
        
//        var legends = $(".locochart .legendLabel", this.el);
//        var updateLegendTimeout = null;
//        var latestPosition = null;
//	    function updateLegend() {
//           updateLegendTimeout = null;
//           var pos = latestPosition;
//
//			var axes = self.plot.getAxes();
//			if (pos.x < axes.xaxis.min || pos.x > axes.xaxis.max ||
//				pos.y < axes.yaxis.min || pos.y > axes.yaxis.max) {
//				return;
//			}
//
//			var i, j, dataset = self.plot.getData();
//			for (i = 0; i < dataset.length; ++i) {
//				var series = dataset[i];
//				// Find the nearest points, x-wise
//				for (j = 0; j < series.data.length; ++j) {
//					if (series.data[j][0] > pos.x) {
//						break;
//					}
//				}
//				// Now Interpolate
//				var y,
//					p1 = series.data[j - 1],
//					p2 = series.data[j];
//
//				if (p1 == null) {
//					y = p2[1];
//				} else if (p2 == null) {
//					y = p1[1];
//				} else {
//					y = p1[1] + (p2[1] - p1[1]) * (pos.x - p1[0]) / (p2[0] - p1[0]);
//				}
//                if (typeof(series.label) != 'undefined')
//                    legends.eq(i).text(series.label.replace(/=.*/, "= " + y.toFixed(2)));
//			}
//
//		}
//
//		$('.locochart', this.el).bind("plothover",  function (event, pos, item) {
//			latestPosition = pos;
//			if (!updateLegendTimeout) {
//				updateLegendTimeout = setTimeout(updateLegend, 50);
//			}
//		});

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
        
        var bemfVal = parseFloat(data.bemf);
        var targetVal = parseFloat(data.target);
        var rateVal = parseInt(data.rate);
        var currentVal = parseFloat(data.current);
        if (!isNaN(data.rate)) {
            if (rateVal > 10) {
                if (!this.running) {
                    this.startTime = parseFloat(this.model.get('runtime'));
                    this.startStamp = new Date().getTime()/1000;
                    this.prevSave = this.startStamp - 10;
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
                // TODO: user feedback + make the threshold a setting.
                // Failsafe: if current goes about 900mA, we just stop the
                // loco so that we don't burn things down:
                if (currentVal > 900) {
                    this.linkManager.controllerCommand.stop();
                    this.linkManager.controllerCommand.speed(0);
                }

                this.plot.setData([ { data:this.packData(this.bemf), label: "RPM (mV)" },
                                    { data:this.packData(this.rate), label: "Power (%)", yaxis: 2},
                                    { data:this.packData(this.current), label:"Current (mA)", yaxis: 3},
                                    { data:this.packData(this.targetbemf), color: "rgba(127,127,127,0.3)" }]);
                this.plot.draw();
            }
        }
    },
    
});
