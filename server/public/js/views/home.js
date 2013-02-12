window.HomeView = Backbone.View.extend({

    initialize:function () {
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
                            }
                        });            
        }
        return this;
    },
                                       
    change: function(event) {
        console.log('Home view: settings changed');
        this.render();
    }

});