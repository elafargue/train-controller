window.HomeView = Backbone.View.extend({

    initialize:function () {
        // When we initialize the view, we open a socket.io
        // connection to the server, that is passed
        // to all subviews when they need it. This way, we keep a single
        // connection between server and web app:
        this.socket = io.connect('http://localhost:8000');
        this.model.on('change', this.change, this);
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
                            $("#layout-area", self.el).html(new LayoutRunView({model: layout, socket: self.socket}).el);
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
                                    $('#controller-area', self.el).html(new ControllerRunView({model: controller, socket: self.socket}).el);
                                }
                                 });
            }

                            }
                        });
        }
        if (settings.get('currentLoco')) {
            var loco = new Loco({_id: settings.get('currentLoco')});
            loco.fetch({success: function() {
                            $("#loco-area", self.el).html(new LocoRunView({model: loco, socket: self.socket}).el);
            }});
        }
        return this;
    },
    
    // Hmmm....
    change: function(event) {
        console.log('Home view: settings changed');
        this.render();
    }

});