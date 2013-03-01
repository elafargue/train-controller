window.LocoListView = Backbone.View.extend({

    initialize: function (options) {
        this.render();
    },
    
    render: function () {
        var locos = this.model.models;
        var len = locos.length;
        var startPos = (this.options.page - 1) * 8;
        var endPos = Math.min(startPos + 8, len);

        $(this.el).html('<ul class="thumbnails"></ul>');

        for (var i = startPos; i < endPos; i++) {
            $('.thumbnails', this.el).append(new LocoListItemView({model: locos[i], settings: this.options.settings}).render().el);
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
        // Somehow, once switching to FuelUX, I had to explicitely make
        // the app navigate to the correct URL, because stopping event prop
        // then also stopped the <a> from working too. Weird.
        var url = event.target.href.substr(event.target.baseURI.length);
        app.navigate(url, {trigger: true});
        event.stopPropagation();
    },
    
    selectLoco: function() {
        console.log('Loco selected: ' + this.model.id);
        var theID = this.model.id;
        // Now store the loco ID in our settings:
        this.options.settings.set({currentLoco:theID});
        this.options.settings.save();
        app.navigate('/', true);
        return false;
    }

});