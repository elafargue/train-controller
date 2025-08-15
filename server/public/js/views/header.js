window.HeaderView = Backbone.View.extend({

    initialize: function (options) {
        this.settings = options ? options.settings : null;
        if (this.settings) {
            this.settings.on('change:navbarColor', this.render, this);
        }
        this.render();
    },

    onClose: function() {
        if (this.settings) {
            this.settings.off('change:navbarColor', this.render, this);
        }
    },

    render: function () {
        $(this.el).html(this.template({ settings: this.settings }));
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