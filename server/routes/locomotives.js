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


var mongoose = require('mongoose');
var Loco = mongoose.model('Loco');
var fs = require('fs');


exports.findById = function(req, res) {
    var id = req.params.id;
    console.log('Retrieving loco: ' + id);
    Loco.findById(id, function(err,item) {
        res.send(item);
    });
};

exports.findAll = function(req, res) {
    Loco.find({}, function(err, items) {
        // TODO: if we find no  item, then create an initial sample
        // loco here.
        res.send(items);
    });
};

exports.addLoco = function(req, res) {
    var loco = req.body;
    console.log('Adding loco: ' + JSON.stringify(loco));
    new Loco(loco).save( function(err, result) {
            if (err) {
                res.send({'error':'An error has occurred'});
            } else {
                console.log('Success: ' + JSON.stringify(result[0]));
                res.send(result[0]);
            }
    });
    
};

exports.updateLoco = function(req, res) {
    var id = req.params.id;
    var loco = req.body;
    delete loco._id;
    console.log('Updating loco: ' + id);
    console.log(JSON.stringify(loco));
    Loco.findByIdAndUpdate(id, loco, {safe:true}, function(err, result) {
            if (err) {
                console.log('Error updating loco: ' + err);
                res.send({'error':'An error has occurred'});
            } else {
                console.log('' + result + ' document(s) updated');
                res.send(loco);
            }
    });    
}

exports.deleteLoco = function(req, res) {
    var id = req.params.id;
    console.log('Deleting loco: ' + id);
    Loco.findByIdAndRemove(id, {safe:true}, function(err,result) {
            if (err) {
                res.send({'error':'An error has occurred - ' + err});
            } else {
                console.log('' + result + ' document(s) deleted');
                res.send(req.body);
            }
    });    
}
    
exports.uploadPic = function(req,res) {
    var id= req.params.id;
    if (req.files) {
        console.log('Will save picture ' + JSON.stringify(req.files) + ' for Loco ID: ' + id);
        // We use an 'upload' dir on our server to ensure we're on the same FS
        var filenameExt = req.files.file.path.split(".").pop();
        console.log('Debug: ' + './public/pics/locos/' + id + '.' + filenameExt);
        // Note: we reference the target filename relative to the path where the server
        // was started:
        fs.rename(req.files.file.path, './public/pics/locos/' + id + '.' + filenameExt,
                 function(err) {
                    if (err) {
                        fs.unlinkSync(req.files.file.path);
                        console.log('Error saving file, deleted temporary upload');                        
                    } else
                        res.send(true);
                 }
        );
    } else {
        res.send(false);
    }
}