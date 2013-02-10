/**
 * REST API to manage locomotives.
 *
 * A locomotive contains:
 * - Name
 * - Reference
 * - Picture
 * - Notes
 * - Running time
 * - List of Response curves at various times (PWM vs BEMF)
 *
 */

var mongo = require('mongodb');

var Server = mongo.Server,
    Db = mongo.Db,
    BSON = mongo.BSONPure;

var server = new Server('localhost', 27017, {auto_reconnect: true});
db = new Db('traindb', server, {safe: true});

db.open(function(err, db) {
    if(!err) {
        console.log("Connected to 'traindb' database");
        db.collection('locos', {safe:true}, function(err, collection) {
            if (err) {
                console.log("The 'locos' collection doesn't exist. Creating it with sample data...");
                populateDB();
            }
        });
    }
});

exports.findById = function(req, res) {
    var id = req.params.id;
    console.log('Retrieving loco: ' + id);
    db.collection('locos', function(err, collection) {
        collection.findOne({'_id':new BSON.ObjectID(id)}, function(err, item) {
            res.send(item);
        });
    });
};

exports.findAll = function(req, res) {
    db.collection('locos', function(err, collection) {
        collection.find().toArray(function(err, items) {
            res.send(items);
        });
    });
};

exports.addLoco = function(req, res) {
    var loco = req.body;
    console.log('Adding loco: ' + JSON.stringify(loco));
    db.collection('locos', function(err, collection) {
        collection.insert(loco, {safe:true}, function(err, result) {
            if (err) {
                res.send({'error':'An error has occurred'});
            } else {
                console.log('Success: ' + JSON.stringify(result[0]));
                res.send(result[0]);
            }
        });
    });
}

exports.updateLoco = function(req, res) {
    var id = req.params.id;
    var loco = req.body;
    delete loco._id;
    console.log('Updating loco: ' + id);
    console.log(JSON.stringify(loco));
    db.collection('locos', function(err, collection) {
        collection.update({'_id':new BSON.ObjectID(id)}, loco, {safe:true}, function(err, result) {
            if (err) {
                console.log('Error updating loco: ' + err);
                res.send({'error':'An error has occurred'});
            } else {
                console.log('' + result + ' document(s) updated');
                res.send(loco);
            }
        });
    });
}

exports.deleteLoco = function(req, res) {
    var id = req.params.id;
    console.log('Deleting loco: ' + id);
    db.collection('locos', function(err, collection) {
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

    var locos = [
    {
        name: "Default Locomotive",
        year: "2009",
        reference: "Märklin 000000",
        description: "You can add your notes on this locomotive here.",
        picture: "generic.jpg"
    }];

    db.collection('locos', function(err, collection) {
        collection.insert(locos, {safe:true}, function(err, result) {});
    });

};