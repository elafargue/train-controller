// The main screen of our app.
// 
// TODO: this view does not manage its subviews properly at all so far, I
//        need to introduce proper subview management.
//
// Our model is the settings object.

window.HomeView = Backbone.View.extend({

    initialize:function (options) {
        this.linkManager = this.options.lm;
        this.model.on('change:currentLoco', this.change, this);
        this.model.on('change:currentLayout', this.change, this);
        this.render();
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
        var layout = new Layout({_id: this.model.get('currentLayout')});
        layout.fetch({success: function(){
            var layoutview = new LayoutRunView({model: layout, lm: self.linkManager});
            $("#layout-area", self.el).html(layoutview.el);
            // Now see whether the layout contains at least a controller, and if so
            // take the 1st controller (all we support right now) and create a running
            // view for it:
            var controllers = layout.get('controllers');
            if (controllers.length) {
                var controller = new Controller({_id:controllers[0]});
                controller.fetch({success: function() {
                    // TODO: initialize a controller object that will open the Socket.io
                    // connection + talk to the server, and will be passed to all subviews
                    // so that they can send/receive data.
                    $('#controller-area', self.el).html(new ControllerRunView({model: controller, lm: self.linkManager, settings: self.model}).el);
                }
                 });
            }
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
    
    // Now we do get a "change" event whenever our settings change,
    // because we share the same settings object amongst every view (passed
    // from the main.js app router). The model (settings in our case) is passed
    // as an argument.
    change: function(model) {
        console.log('Home view: settings changed');
        // Now: find out what changed (loco or layout) and just
        // render what's relevant rather than recreate everything:
        var changed = model.changedAttributes();
        for (var attr in changed) {
            switch(attr) {
                    case 'currentLayout':
                        console.log('Home view: we need to update the current layout view');
                        if (this.model.get('currentLayout'))
                            this.renderlayout();
                        else
                            this.render(); // Layout is null, we render the default welcome screen.
                        break;
                    case 'currentLoco':
                        console.log('Home view: we need to update the current loco view');
                        if (this.model.get('currentLoco'))
                            this.renderloco();
                        else
                            this.render(); // see above
                        break;
            }
        }
    //    this.render();
    }

});