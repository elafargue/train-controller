window.HomeView = Backbone.View.extend({

    initialize:function () {
        // TODO: when we initialize the view, we should
        // check whether we have selected a layout, and if so,
        // create a TrainController object that will be passed to
        // all the child views of home, and will be the actual interface
        // to the hardware controller. This way, we have a single TrainController
        // shared with everyone:
        
        // Question: do we do this from initialize, or when we render?
        
        this.render();
    },

    render:function () {
        var self = this;
        console.log('Setting up home view from settings');
        $(this.el).html(this.template());
        var settings = this.model;
        if (settings.get('currentLayout')) {
            var layout = new Layout({_id: settings.get('currentLayout')});
            layout.fetch({success: function(){
                            $("#layout-area", self.el).html(new LayoutRunView({model: layout}).el);
                            // Now see whether the layout contains at least a controller, and if so
                            // take the 1st controller (all we support right now) and create a running
                            // view for it:
                            var controllers = layout.get('controllers');
                            if (controllers.length) {
                                var controller = new Controller({_id:controllers[0]});
                                controller.fetch({success: function() {
                                    $('#controller-area', self.el).html(new ControllerRunView({model: controller}).el);
                                }
                                 });
            }

                            }
                        });
        }
        if (settings.get('currentLoco')) {
            var loco = new Loco({_id: settings.get('currentLoco')});
            loco.fetch({success: function() {
                            $("#loco-area", self.el).html(new LocoRunView({model: loco}).el);
            }});
        }
        return this;
    },
    
    events: {
        "change": "change"
    },

    // Hmmm....
    change: function(event) {
        console.log('Home view: settings changed');
        this.render();
    }

});