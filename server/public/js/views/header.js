window.HeaderView = Backbone.View.extend({

    initialize: function () {
        this.render();
    },

    render: function () {
        $(this.el).html(this.template());
        return this;
    },

    selectMenuItem: function (menuItem) {
        $('.navbar-nav .nav-item').removeClass('active');
        $('.navbar-nav .add-option').addClass('d-none');
        if (menuItem) {
            $('.' + menuItem).addClass('active');
            $('.' + menuItem + '-add').removeClass('d-none');
        }
    }
    
});