window.LocoListView = Backbone.View.extend({

    initialize: function (options) {
        this.options = options || {};
    },
    
    render: function () {
        var locos = this.model.models;
        var len = locos.length;
        var items = parseInt(this.options.settings.get('itemsperpage'));
        var startPos = (this.options.page - 1) * items;
        var endPos = Math.min(startPos + items, len);

        $(this.el).html('<div class="container-fluid"><div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-5 g-4" id="items-grid"></div></div>');

        for (var i = startPos; i < endPos; i++) {
            $('#items-grid', this.el).append($('<div class="col"></div>').append(new LocoListItemView({model: locos[i], settings: this.options.settings}).render().el));
        }

        $(this.el).append(new Paginator({model: this.model, page: this.options.page, items: items, baseUrl: 'locos'}).render().el);

        return this;
    }
});

window.LocoListItemView = Backbone.View.extend({

    tagName: "div",

    initialize: function (options) {
        this.options = options || {};
        this.model.on("change", this.render, this);
        this.model.on("destroy", this.close, this);
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