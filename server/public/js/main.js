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
        "graph"             : "graph",
        "settings"          : "settings",
        "about"             : "about"
    },
    
    // A simple view switcher, to make clean transitions.
    // AFAIK Backbone does not provide anything like this out of the box...
    currentView: null,
    
    switchView: function(view) {
        if (this.currentView) {
            this.currentView.remove();
            if (this.currentView.onClose){
                    this.currentView.onClose();
            }
        }
        $('#content').html(view.el);
        view.render();
        this.currentView = view;
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
            self.switchView(new LocoListView({model: locoList, settings: self.settings, page: p}));
        }});
        this.headerView.selectMenuItem('menu-loco');
    },

    locoDetails: function (id) {
        var self = this;
        var loco = new Loco({_id: id});
        loco.fetch({success: function(){
            self.switchView(new LocoView({model: loco}));
        }});
        this.headerView.selectMenuItem();
    },

	addLoco: function() {
        var loco = new Loco();
        this.switchView(new LocoView({model: loco}));
        this.headerView.selectMenuItem('add-menu');
	},

	listCars: function(page) {
        console.log("Switching to Cars list");
        var self = this;
        var p = page ? parseInt(page, 10) : 1;
        var carList = new CarCollection();
        carList.fetch({success: function(){
            self.switchView(new CarListView({model: carList, settings: self.settings, page: p}));
        }});
        this.headerView.selectMenuItem('menu-car');
    },

    carDetails: function (id) {
        var self = this;
        var car = new Car({_id: id});
        car.fetch({success: function(){
            self.switchView(new CarView({model: car}));
        }});
        this.headerView.selectMenuItem();
    },

	addCar: function() {
        var car = new Car();
        this.switchView(new CarView({model: car}));
        this.headerView.selectMenuItem('add-menu');
	},
    
	listLayouts: function(page) {
        var self = this;
        var p = page ? parseInt(page, 10) : 1;
        var layoutList = new LayoutCollection();
        layoutList.fetch({success: function(){
            self.switchView(new LayoutListView({model: layoutList, settings: self.settings, page: p}));
        }});
        this.headerView.selectMenuItem('menu-layout');
    },

    layoutDetails: function (id) {
        var self = this;
        var layout = new Layout({_id: id});
        layout.fetch({success: function(){
            self.switchView(new LayoutView({model: layout, lm:self.linkManager}));
        }});
        this.headerView.selectMenuItem();
    },

	addLayout: function() {
        var layout = new Layout();
        this.switchView(new LayoutView({model: layout, lm:self.linkManager}));
        this.headerView.selectMenuItem('add-menu');
	},


    diagnostics: function () {
        this.switchView(new DiagnosticsView({model: this.settings, lm: this.linkManager}));
        this.headerView.selectMenuItem('home-menu');
    },
    
    about: function () {
        this.switchView(new AboutView());
        this.headerView.selectMenuItem('about-menu');
    },

    settings: function () {
        this.switchView(new SettingsView({model: this.settings}));
        this.headerView.selectMenuItem('settings-menu');
    },
    
    graph: function() {
        var view = new GraphView({model:this.settings, lm:this.linkManager});
        this.switchView(view);
        view.addPlot();
    },

});

utils.loadTemplate(['HomeView', 'HeaderView', 'AboutView', 'LocoView', 'LocoListItemView', 'LayoutListItemView', 'LayoutView',
                    'ControllerDetailsView', 'SettingsView', 'LayoutRunView', 'LocoRunView', 'ControllerRunView', 'AccessoryDetailsView',
                    'AccessoryItemView', 'DiagnosticsView', 'AccessoryItemDiagView', 'CarListItemView', 'CarView', 'GraphView'
                   ], function() {
    app = new AppRouter();
    Backbone.history.start();
});
