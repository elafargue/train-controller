/**
 * REST API to talk to controllers.
 *
 *
 * The REST API lets us:
 * - Edit configuration parameters
 * - Start a controller (?)
 * - Send commands : speed, direction
 * - Read status
 */

var mongoose = require('mongoose');
var Controller = mongoose.model('Controller');

exports.findById = function(req, res) {
    var id = req.params.id;
    console.log('Retrieving controller: ' + id);
    Controller.findById(id, function(err,item) {
        res.send(item);
    });
};

exports.findAll = function(req, res) {
    Controller.find({}, function(err, items) {
        res.send(items);
    });
};

exports.addController = function(req, res) {
    var controller = req.body;
    delete controller._id;  // _id is sent from Backbone and is null, we
                            // don't want that
    console.log('Adding controller: ' + JSON.stringify(controller));
    new Controller(controller).save( function(err, result) {
            if (err) {
                res.send({'error':'An error has occurred'});
            } else {
                console.log('Success - result: ' + JSON.stringify(result));
                res.send(result);
            }
    });
    
};

exports.updateController = function(req, res) {
    var id = req.params.id;
    var controller = req.body;
    delete controller._id;
    console.log('Updating controller: ' + id);
    console.log(JSON.stringify(controller));
    Controller.findByIdAndUpdate(id, controller, {safe:true}, function(err, result) {
            if (err) {
                console.log('Error updating controller: ' + err);
                res.send({'error':'An error has occurred'});
            } else {
                console.log('' + result + ' document(s) updated');
                res.send(controller);
            }
    });    
}


exports.deleteController = function(req, res) {
    var id = req.params.id;
    console.log('Deleting controller: ' + id);
    Controller.findByIdAndRemove(id, {safe:true}, function(err,result) {
            if (err) {
                res.send({'error':'An error has occurred - ' + err});
            } else {
                console.log('' + result + ' document(s) deleted');
                res.send(req.body);
            }
    });    
}

