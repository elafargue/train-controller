/**
 * REST API to manage our settings. A simple get/set.
 *
 */


var mongoose = require('mongoose');
var Settings = mongoose.model('Settings');


exports.getSettings = function(req, res) {
    Settings.findOne({}, function(err, item) {
        // We have only one settings object, so we find one and that's it.
        // TODO: make use we handle a case where there would be several ?
        if (item) {
            res.send(item);
        } else {
            // Create our default settings
            new Settings().save(function(err, result) {
                if (err) {
                    res.send({'error':'An error has occurred creating settings'});
                } else {
                    console.log('Default settings created: ' + JSON.stringify(result));
                    res.send(result);
                }
            });
        }
     
    });
};

exports.updateSettings = function(req, res) {
    var settings = req.body;
    delete settings._id;
    console.log('Updating settings.');
    console.log(JSON.stringify(settings));
    Settings.findOneAndUpdate({}, settings, {safe:true}, function(err, result) {
            if (err) {
                console.log('Error updating settings: ' + err);
                res.send({'error':'An error has occurred'});
            } else {
                console.log('' + result + ' document(s) updated');
                res.send(settings);
            }
    });    
}
