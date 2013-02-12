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
        "click .select" : "selectLoco",
        "click .edit": "editLoco"
    },

    
    render: function () {
        $(this.el).html(this.template(this.model.toJSON()));
        return this;
    },
    
    editLoco: function(event) {
        // We need this because otherwise the enclosing logo thumbnail
        // will get the click, the loco will get selected and we'll end
        // up redirected to the home page.
        event.stopPropagation();
    },
    
    selectLoco: function() {
        console.log('Loco selected: ' + this.model.id);
        var theID = this.model.id;
        // TODO: this is very bad, there must be a better way...
        var settings = new Settings();
        settings.fetch({success: function(){
                // Now store the loco ID in our settings:
                settings.set({currentLoco:theID});
                settings.save();
                app.navigate('/', true);
        }});
        return false;
    }

});