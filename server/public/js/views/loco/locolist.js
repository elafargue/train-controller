window.LocoListView = Backbone.View.extend({

    initialize: function () {
        this.render();
    },
    
    render: function () {
        var locos = this.model.models;
        var len = locos.length;
        var startPos = (this.options.page - 1) * 8;
        var endPos = Math.min(startPos + 8, len);

        $(this.el).html('<ul class="thumbnails"></ul>');

        for (var i = startPos; i < endPos; i++) {
            $('.thumbnails', this.el).append(new LocoListItemView({model: locos[i]}).render().el);
        }

        $(this.el).append(new Paginator({model: this.model, page: this.options.page}).render().el);

        return this;
    }
});

window.LocoListItemView = Backbone.View.extend({

    tagName: "li",

    initialize: function () {
        this.model.bind("change", this.render, this);
        this.model.bind("destroy", this.close, this);
    },

    events: {
        "click .select" : "selectLoco"
    },

    
    render: function () {
        $(this.el).html(this.template(this.model.toJSON()));
        return this;
    },
    
    selectLoco: function() {
        console.log('Loco selected: ' + this.model.id);
        var theID = this.model.id;
        // TODO: this is very bad, there must be a better way...
        settings = new Settings();
        settings.fetch({success: function(){
                // Now store the loco ID in our settings:
                settings.set({currentLoco:theID});
                settings.save();
        }});
        return true;
    }

});