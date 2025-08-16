/**
 * Where we are storing our database configuration and schemas.
 *
 * (c) 2013 Edouard Lafargue, edouard@lafargue.name
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


var PouchDB = require('pouchdb'),
    debug = require('debug')('tc:db');



// Instrument
// Output
// Settings
// Log Entry
// Log
// User

// auto_compaction is important because if we update the documents,
// and P/CouchDB keeps previous revisions otherwise. This option is only
// effective for local DBs, not remote (CouchDB manages that on its own).

var locomotives = new PouchDB('./ldb/locomotives', {
    auto_compaction: true
});
var cars = new PouchDB('./ldb/cars', {
    auto_compaction: true
});
var controllers = new PouchDB('./ldb/controllers', {
    auto_compaction: true
});
var settings = new PouchDB('./ldb/settings', {
    auto_compaction: true
});
var accessories = new PouchDB('./ldb/accessories', {
    auto_compaction: true
});
var layouts = new PouchDB('./ldb/layouts', {
    auto_compaction: true
});
var logbookentries = new PouchDB('./ldb/logbookentries', {
    auto_compaction: true
});

// Create the design docs we need for our various databases in order to get
// decent performance on large datasets:

/**
 * View of logs by loco ID
 */
var logByLoco = {
  _id: '_design/by_loco',
  views: {
    'by_loco': {
      map: function (doc) { emit(doc.locoid); }.toString()
    }
  }
};

// save it
logbookentries.put(logByLoco).then(function () {
  // success!
    debug("Created Locomotives DB 'by loco' view");
}).catch(function (err) {
    debug("Error creating design doc: " + err);
    if (err.status == 409)
        debug("... but that's OK, it was there already");
});



/**
 * Defaults: we use this to initialize new documents in our Pouch
 * databases.
 */
var defaults = {
    /**
     * Settings: global application settings.
     *
     * For now: ID of the current layout, and current loco
     */
    settings: {
        _id: 'coresettings',
        currentLayout: null,
        currentLoco: null,
        powersliderstyle: '',
        itemsperpage: 8
    },

    locomotive: {
        name: '',
        year: 1980, // Year the model was produced/bought
        reference: '', // Manufacturer reference
        description: '', // Up to the user
        picture: '', // Filename in public/pics/locos
        documentation: '', // PDF doc, filename in public/pics/locodocs/
        runtime: 0 // Runtime of the loco in seconds
    },

    car: {
        name: '',
        year: 1980, // Year the model was produced/bought
        reference: '', // Manufacturer reference
        description: '', // Up to the user
        picture: '', // Filename in public/pics/locos
        documentation: '', // PDF doc, filename in public/pics/locodocs/
    },

    /**
     * Train controllers. Unfortunate naming convention since
     * it has nothing to do with MVC Controllers, but here you go
     */
    controller: {
        name: '',
        type: '',
        port: '',
        pidkp: 0,
        pidki: 0,
        pidkd: 0,
        pidsample: 0,
        updaterate: 0,
        accessorypulse: 0,
    },

    /**
     * Accessories. Can be a point, or something else.
     * accessories have an adress on a controller, and are located
     * on layouts.
     *
     * In this first revision, we only support one controller, so we don't
     * need to store the controllerId
     */
    accessory: {
        name: '',
        locX: 0, // Location (in %) on the layout drawing
        locY: 0,
        symbol: '',
        type: 'Turnout', // Can be "Turnout", "Uncoupler", "Isolating"
        //                controllerId: {type: Schema.Types.ObjectId, ref:'Controller', default:null},
        controllerAddress: 0,
        controllerSubAddress: 0, // Only used for Uncouplers right now, to indicate the port (0 or 1) directly.
        reverse: false, // Invert switch operation by software, rather than have user swap wires manually...
    },

    /**
     * We never manage controllers and accessories outside of
     * layouts, so no need to define separate schemas for those.
     *
     * This schema supports multiple controllers, but the app only supports
     * one max for now.
     */
    layout: {
        name: '',
        controllers: [],
        accessories: [],
        description: '',
        picture: ''
    },


    /**
     * Logbook entries
     */
    logbookentry: {
        locoid: 0,
        date: 0,
        runtime: 0,
        comment: ''
    }

};


module.exports = {
    locomotives: locomotives,
    cars: cars,
    controllers: controllers,
    settings: settings,
    accessories: accessories,
    layouts: layouts,
    logbookentries: logbookentries,
    
    defaults: defaults,
}