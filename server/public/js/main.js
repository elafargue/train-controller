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
        this.headerView = new HeaderView();
        $('.header').html(this.headerView.el);
    },

    home: function (id) {
        if (!this.homeView) {
            var settings = new Settings();
            settings.fetch({success: function(){
                this.homeView = new HomeView({model: settings});
                $('#content').html(this.homeView.el);
                }
                           });
        } else {
            // TODO: get the settings object to tell the home view
            // about the currently selected layout & loco
            $('#content').html(this.homeView.el);
        }
        this.headerView.selectMenuItem('home-menu');
    },

	listLocos: function(page) {
        var p = page ? parseInt(page, 10) : 1;
        var locoList = new LocoCollection();
        locoList.fetch({success: function(){
            $("#content").html(new LocoListView({model: locoList, page: p}).el);
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
        var p = page ? parseInt(page, 10) : 1;
        var layoutList = new LayoutCollection();
        layoutList.fetch({success: function(){
            $("#content").html(new LayoutListView({model: layoutList, page: p}).el);
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
        var settings = new Settings();
        settings.fetch({success: function(){
            $("#content").html(new SettingsView({model: settings}).el);
        }});
        this.headerView.selectMenuItem('settings-menu');
    }

});

utils.loadTemplate(['HomeView', 'HeaderView', 'AboutView', 'LocoView', 'LocoListItemView', 'LayoutListItemView', 'LayoutView',
                    'ControllerDetailsView', 'SettingsView', 'LayoutRunView', 'LocoRunView', 'ControllerRunView'
                   ], function() {
    app = new AppRouter();
    Backbone.history.start();
});