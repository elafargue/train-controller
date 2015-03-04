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


var dbs = require('../db'),
    debug = require('debug')('tc:locomotives'),
    fs = require('fs');


exports.findById = function (req, res) {
    var id = req.params.id;
    console.log('Retrieving loco: ' + id);
    var id = req.params.id;
    dbs.locomotives.get(id, function (err, item) {
        res.send(item);
    });
};

exports.findAll = function (req, res) {
    dbs.locomotives.allDocs({
        include_docs: true
    }, function (err, items) {
        var resp = [];
        for (item in items.rows) {
            resp.push(items.rows[item].doc);
        }
        res.send(resp);
    });
};

exports.addLoco = function (req, res) {
    var loco = req.body;
    console.log('Adding loco: ' + JSON.stringify(loco));
    dbs.locomotives.post(req.body, function (err, result) {
        if (err) {
            res.send({
                'error': 'An error has occurred'
            });
        } else {
            res.send({
                _id: result.id,
                _rev: result.rev
            });
        }
    });
};

exports.updateLoco = function (req, res) {
    var id = req.params.id;
    var loco = req.body;
    console.log('Updating loco: ' + id);
    console.log(JSON.stringify(loco));
    dbs.locomotives.put(req.body, function (err, result) {
        if (err) {
            debug('Error updating locomotive: ' + err);
            res.send({
                'error': 'An error has occurred'
            });
        } else {
            res.send({
                _id: result.id,
                _rev: result.rev
            });
        }
    });
}

exports.deleteLoco = function (req, res) {
    var id = req.params.id;
    console.log('Deleting loco: ' + id);
    dbs.locomotives.get(id, function (err, ins) {
        if (err) {
            debug('Error - ' + err);
            res.send({
                'error': 'An error has occurred - ' + err
            });
        } else {
            dbs.locomotives.remove(ins, function (err, result) {
                if (err) {
                    res.send({
                        'error': 'An error has occurred - ' + err
                    });
                } else {
                    res.send(req.body);
                }
            });
        }
    });
}

exports.uploadPic = function (req, res) {
    var id = req.params.id;
    if (req.files) {
        console.log('Will save picture ' + JSON.stringify(req.files) + ' for Loco ID: ' + id);
        // We use an 'upload' dir on our server to ensure we're on the same FS
        var filenameExt = req.files.file.path.split(".").pop();
        console.log('Debug: ' + './public/pics/locos/' + id + '.' + filenameExt);
        // Note: we reference the target filename relative to the path where the server
        // was started:
        fs.rename(req.files.file.path, './public/pics/locos/' + id + '.' + filenameExt,
            function (err) {
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