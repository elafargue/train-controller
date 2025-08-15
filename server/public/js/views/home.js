// The main screen of our app.
// 
// TODO: this view does not manage its subviews properly at all so far, I
//        need to introduce proper subview management.
//
// Our model is the settings object.

window.HomeView = Backbone.View.extend({

    initialize:function (options) {
        this.options = options || {};
        this.linkManager = this.options.lm;
        this.model.on('change:currentLoco', this.modelChanged, this);
        this.model.on('change:currentLayout', this.modelChanged, this);
    },
    
    onClose: function() {
        console.log("Closing home view");
        this.model.off('change:currentLoco', this.modelChanged, this);
        this.model.off('change:currentLayout', this.modelChanged, this);
    },

    render:function () {
        var self = this;
        console.log('Main render of home view');
        $(this.el).html(this.template());
        var settings = this.model;
        if (settings.get('currentLayout')) {
            this.renderlayout();
        }
        if (settings.get('currentLoco')) {
            this.renderloco();
        }
        return this;
    },
    
    renderlayout: function() {
        var self = this;
        console.log('Rendering layout:', this.model.get('currentLayout'));
        var layout = new Layout({_id: this.model.get('currentLayout')});
        layout.fetch({
            success: function() {
                console.log('Layout fetched:', layout.toJSON());
                var layoutview = new LayoutRunView({model: layout, lm: self.linkManager});
                $("#layout-area", self.el).html(layoutview.el);
                // Now see whether the layout contains at least a controller, and if so
                // take the 1st controller (all we support right now) and create a running
                // view for it:
                var controllers = layout.get('controllers');
                console.log('Layout controllers:', controllers);
                if (controllers && controllers.length) {
                    var controller = new Controller({_id:controllers[0]});
                    controller.fetch({
                        success: function() {
                            console.log('Controller fetched:', controller.toJSON());
                            var controllerView = new ControllerRunView({
                                model: controller,
                                lm: self.linkManager,
                                settings: self.model
                            });
                            console.log('Controller view created');
                            $('#controller-area', self.el).html(controllerView.render().el);
                        },
                        error: function(model, response) {
                            console.error('Error fetching controller:', response);
                        }
                    });
                } else {
                    console.log('No controllers found in layout');
                }
            },
            error: function(model, response) {
                console.error('Error fetching layout:', response);
            }
        });
    },
    
    renderloco: function() {
        var self = this;
        var loco = new Loco({_id: this.model.get('currentLoco')});
        loco.fetch({success: function() {
            var lrv = new LocoRunView({model: loco, lm: self.linkManager});
            $("#loco-area", self.el).html(lrv.el);
            lrv.addPlot();
        }});
    },
    
    // Handler for when the settings model changes (new layout or locomotive selected)
    modelChanged: function(model) {
        console.log('Home view: settings changed');
        var changed = model.changedAttributes();
        
        for (var attr in changed) {
            switch(attr) {
                case 'currentLayout':
                    console.log('Home view: updating current layout view');
                    if (this.model.get('currentLayout')) {
                        this.renderlayout();
                    } else {
                        this.render(); // Layout is null, render the default welcome screen
                    }
                    break;
                case 'currentLoco':
                    console.log('Home view: updating current loco view');
                    if (this.model.get('currentLoco')) {
                        this.renderloco();
                    } else {
                        $("#loco-area", this.el).html('<h3>Select a locomotive to see its details here.</h3>');
                    }
                    break;
            }
        }
    }

});