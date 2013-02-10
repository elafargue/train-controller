/**
 * Where we define the routes in our Backbone application
 */

var AppRouter = Backbone.Router.extend({

    routes: {
        ""                  : "home",        /* Welcome screen */
        "locos"             : "listLocos",
        "locos/page/:page"	: "listLocos",
        "locos/add"         : "addLoco",
        "locos/:id"         : "locoDetails",
        /*
        "controllers"       : "listControllers",
        "controllers/page/:page" : "listControllers",
        "controllers/add"   : "addController",
        "controllers/:id"   : "controllerDetails",
        "layouts"           : "listLayouts",
        "layouts/page/:page": "listLayouts",
        "layouts/add"       : "addLayout",
        "layouts/:id"       : "layoutDetails",
        */
        "settings"          : "settings",
        "about"             : "about"
    },

    initialize: function () {
        this.headerView = new HeaderView();
        $('.header').html(this.headerView.el);
    },

    home: function (id) {
        if (!this.homeView) {
            this.homeView = new HomeView();
        }
        $('#content').html(this.homeView.el);
        this.headerView.selectMenuItem('home-menu');
    },

	listLocos: function(page) {
        var p = page ? parseInt(page, 10) : 1;
        var locoList = new LocoCollection();
        locoList.fetch({success: function(){
            $("#content").html(new LocoListView({model: locoList, page: p}).el);
        }});
        this.headerView.selectMenuItem('home-menu');
    },

    locoDetails: function (id) {
        var loco = new Loco({_id: id});
        loco.fetch({success: function(){
            $("#content").html(new LocoView({model: loco}).el);
        }});
        this.headerView.selectMenuItem();
    },

	addLoco: function() {
        var loco = new Loco();
        $('#content').html(new LocoView({model: loco}).el);
        this.headerView.selectMenuItem('add-menu');
	},

    about: function () {
        if (!this.aboutView) {
            this.aboutView = new AboutView();
        }
        $('#content').html(this.aboutView.el);
        this.headerView.selectMenuItem('about-menu');
    }

});

utils.loadTemplate(['HomeView', 'HeaderView', 'AboutView', 'LocoView', 'LocoListItemView'], function() {
    app = new AppRouter();
    Backbone.history.start();
});