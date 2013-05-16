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
        "cars"              : "listCars",
        "cars/page/:page"	: "listCars",
        "cars/add"          : "addCar",
        "cars/:id"          : "carDetails",
        "diagnostics"       : "diagnostics",
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
        
        // Create our link manager: it is in charge of talking
        // to the server-side controller interface through a socket.io
        // web socket. It is passed to all views who need it.
        this.linkManager =  new linkManager();
    },

    home: function (id) {
        console.log("Switching to home view");
        // Though other views are lightweight and can - and should
        // be disposable, we have more in the home views, including
        // connection to our controller, so we want to preserve it,
        // which is why we don't re-create it...
        if (!this.homeView) {
            this.homeView = new HomeView({model: this.settings, lm: this.linkManager});
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

	listCars: function(page) {
        console.log("Switching to Cars list");
        var self = this;
        var p = page ? parseInt(page, 10) : 1;
        var carList = new CarCollection();
        carList.fetch({success: function(){
            $("#content").html(new CarListView({model: carList, settings: self.settings, page: p}).el);
        }});
        this.headerView.selectMenuItem('menu-car');
    },

    carDetails: function (id) {
        var car = new Car({_id: id});
        car.fetch({success: function(){
            $("#content").html(new CarView({model: car}).el);
        }});
        this.headerView.selectMenuItem();
    },

	addCar: function() {
        var car = new Car();
        $('#content').html(new CarView({model: car}).el);
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
        var self = this;
        var layout = new Layout({_id: id});
        layout.fetch({success: function(){
            $("#content").html(new LayoutView({model: layout, lm:self.linkManager}).el);
        }});
        this.headerView.selectMenuItem();
    },

	addLayout: function() {
        var layout = new Layout();
        $('#content').html(new LayoutView({model: layout, lm:self.linkManager}).el);
        this.headerView.selectMenuItem('add-menu');
	},


    diagnostics: function () {
        $("#content").html(new DiagnosticsView({model: this.settings, lm: this.linkManager}).el);
        this.headerView.selectMenuItem('home-menu');
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
                    'ControllerDetailsView', 'SettingsView', 'LayoutRunView', 'LocoRunView', 'ControllerRunView', 'AccessoryDetailsView',
                    'AccessoryItemView', 'DiagnosticsView', 'AccessoryItemDiagView', 'CarListItemView', 'CarView',
                   ], function() {
    app = new AppRouter();
    Backbone.history.start();
});
