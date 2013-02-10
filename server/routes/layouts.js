/**
 * REST API to manage layouts.
 *
 * A layout contains:
 *   - One or more controllers
 *   - A layout picture
 *   - List of Accessories (turnouts, etc)
 */


var mongoose = require('mongoose');
var Layout = mongoose.model('Layout');


exports.findById = function(req, res) {
    var id = req.params.id;
    console.log('Retrieving layout: ' + id);
    db.collection('layouts', function(err, collection) {
        collection.findOne({'_id':new BSON.ObjectID(id)}, function(err, item) {
            res.send(item);
        });
    });
};

exports.findAll = function(req, res) {
    db.collection('layouts', function(err, collection) {
        collection.find().toArray(function(err, items) {
            res.send(items);
        });
    });
};

exports.addLayout = function(req, res) {
    var layout = req.body;
    console.log('Adding layout: ' + JSON.stringify(loco));
    db.collection('layouts', function(err, collection) {
        collection.insert(layout, {safe:true}, function(err, result) {
            if (err) {
                res.send({'error':'An error has occurred'});
            } else {
                console.log('Success: ' + JSON.stringify(result[0]));
                res.send(result[0]);
            }
        });
    });
}

exports.updateLayout = function(req, res) {
    var id = req.params.id;
    var layout = req.body;
    delete layout._id;
    console.log('Updating layout: ' + id);
    console.log(JSON.stringify(layout));
    db.collection('layouts', function(err, collection) {
        collection.update({'_id':new BSON.ObjectID(id)}, layout, {safe:true}, function(err, result) {
            if (err) {
                console.log('Error updating layout: ' + err);
                res.send({'error':'An error has occurred'});
            } else {
                console.log('' + result + ' document(s) updated');
                res.send(layout);
            }
        });
    });
}

exports.deleteLayout = function(req, res) {
    var id = req.params.id;
    console.log('Deleting layout: ' + id);
    db.collection('layouts', function(err, collection) {
        collection.remove({'_id':new BSON.ObjectID(id)}, {safe:true}, function(err, result) {
            if (err) {
                res.send({'error':'An error has occurred - ' + err});
            } else {
                console.log('' + result + ' document(s) deleted');
                res.send(req.body);
            }
        });
    });
}

/*--------------------------------------------------------------------------------------------------------------------*/
// Populate database with default data -- Only used once: the first time the application is started.
//
    // TODO: finalise the fields for locos.
    
var populateDB = function() {

    var layouts = [
    {
        name: "Default Layout",
        controller: 0,
        description: "You can add your notes on this layout here.",
        picture: "generic.jpg"
    }];

    db.collection('layouts', function(err, collection) {
        collection.insert(layouts, {safe:true}, function(err, result) {});
    });

};