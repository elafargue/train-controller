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
        "layouts"           : "listLayouts",
        "layouts/page/:page": "listLayouts",
        "layouts/add"       : "addLayout",
        "layouts/:id"       : "layoutDetails",
        "settings"          : "settings",
        "about"             : "about"
    },

    initialize: function () {
        console.log("Initializing application");
        this.headerView = new HeaderView();
        $('.header').html(this.headerView.el);
        // Get our settings here, and
        // share them afterwards, rather than requesting it
        // everytime...
        this.settings = new Settings();
        // We need to be sure the settings are fetched before moving
        // further, so we add the Ajax option "async" below.
        this.settings.fetch({async:false});
    },

    home: function (id) {
        console.log("Switching to home view");
        // Though other views are lightweight and can - and should
        // be disposable, we have more in the home views, including
        // connection to our controller, so we want to preserve it,
        // which is why we don't re-create it...
        if (!this.homeView) {
            this.homeView = new HomeView({model: this.settings});
            $('#content').html(this.homeView.el);
        } else {
            $('#content').html(this.homeView.el);
            this.homeView.render(); // We need this to rebind our events...
        }
        this.headerView.selectMenuItem('home-menu');
    },

	listLocos: function(page) {
        console.log("Switching to Loco list");
        var self = this;
        var p = page ? parseInt(page, 10) : 1;
        var locoList = new LocoCollection();
        locoList.fetch({success: function(){
            $("#content").html(new LocoListView({model: locoList, settings: self.settings, page: p}).el);
        }});
        this.headerView.selectMenuItem('menu-loco');
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
    
	listLayouts: function(page) {
        var self = this;
        var p = page ? parseInt(page, 10) : 1;
        var layoutList = new LayoutCollection();
        layoutList.fetch({success: function(){
            $("#content").html(new LayoutListView({model: layoutList, settings: self.settings, page: p}).el);
        }});
        this.headerView.selectMenuItem('menu-layout');
    },

    layoutDetails: function (id) {
        var layout = new Layout({_id: id});
        layout.fetch({success: function(){
            $("#content").html(new LayoutView({model: layout}).el);
        }});
        this.headerView.selectMenuItem();
    },

	addLayout: function() {
        var layout = new Layout();
        $('#content').html(new LayoutView({model: layout}).el);
        this.headerView.selectMenuItem('add-menu');
	},
    
    about: function () {
        if (!this.aboutView) {
            this.aboutView = new AboutView();
        }
        $('#content').html(this.aboutView.el);
        this.headerView.selectMenuItem('about-menu');
    },

    settings: function () {
        $("#content").html(new SettingsView({model: this.settings}).el);
        this.headerView.selectMenuItem('settings-menu');
    }

});

utils.loadTemplate(['HomeView', 'HeaderView', 'AboutView', 'LocoView', 'LocoListItemView', 'LayoutListItemView', 'LayoutView',
                    'ControllerDetailsView', 'SettingsView', 'LayoutRunView', 'LocoRunView', 'ControllerRunView'
                   ], function() {
    app = new AppRouter();
    Backbone.history.start();
});