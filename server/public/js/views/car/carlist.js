window.CarListView = Backbone.View.extend({

    initialize: function (options) {
        this.render();
    },
    
    render: function () {
        var cars = this.model.models;
        var len = cars.length;
        var items = parseInt(this.options.settings.get('itemsperpage'));
        var startPos = (this.options.page - 1) * items;
        var endPos = Math.min(startPos + items, len);

        $(this.el).html('<div class="container-fluid"><div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-5 g-4" id="items-grid"></div></div>');

        for (var i = startPos; i < endPos; i++) {
            $('#items-grid', this.el).append($('<div class="col"></div>').append(new CarListItemView({model: cars[i], settings: this.options.settings}).render().el));
        }

        $(this.el).append(new Paginator({model: this.model, page: this.options.page, items: items}).render().el);

        return this;
    }
});

window.CarListItemView = Backbone.View.extend({

    tagName: "div",

    initialize: function () {
        this.model.bind("change", this.render, this);
        this.model.bind("destroy", this.close, this);
    },

    render: function () {
        $(this.el).html(this.template(this.model.toJSON()));
        return this;
    },
        
});