window.LayoutListView = Backbone.View.extend({

    initialize: function (options) {
        this.options = options || {};
    },

    render: function () {
        var layouts = this.model.models;
        var len = layouts.length;
        var items = parseInt(this.options.settings.get('itemsperpage'));
        var startPos = (this.options.page - 1) * items;
        var endPos = Math.min(startPos + items, len);

        $(this.el).html('<div class="container-fluid"><div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-5 g-4" id="items-grid"></div></div>');

        for (var i = startPos; i < endPos; i++) {
            $('#items-grid', this.el).append($('<div class="col"></div>').append(new LayoutListItemView({model: layouts[i], settings: this.options.settings}).render().el));
        }

        $(this.el).append(new Paginator({model: this.model, page: this.options.page, items: items}).render().el);

        return this;
    }
});

window.LayoutListItemView = Backbone.View.extend({

    tagName: "div",

    initialize: function (options) {
        this.options = options || {};
        this.model.on("change", this.render, this);
        this.model.on("destroy", this.close, this);
    },

    render: function () {
        $(this.el).html(this.template(this.model.toJSON()));
        return this;
    },
    
    events: {
        "click .select" : "selectLayout",
        "click .edit": "editLayout"

    },
    
    editLayout: function(event) {
        // Cf locolist.js for explanation
        var url = event.target.href.substr(event.target.baseURI.length);
        app.navigate(url, {trigger: true});
        event.stopPropagation();
    },
        
    selectLayout: function() {
        console.log('Layout selected: ' + this.model.id);
        var theID = this.model.id;
        // Now store the loco ID in our settings:
        this.options.settings.set({currentLayout:theID});
        this.options.settings.save();
        app.navigate('/', true);
        return false;
    }


});