/**
 * REST API to manage layouts.
 *
 * A layout contains:
 *   - One or more controllers
 *   - A layout picture
 *   - List of Accessories (turnouts, etc)
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
    debug = require('debug')('tc:layouts'),
    fs = require('fs');


exports.findById = function (req, res) {
    var id = req.params.id;
    console.log('Retrieving layout: ' + id);
    dbs.layouts.get(id, function (err, item) {
        res.send(item);
    });
};

exports.findAll = function (req, res) {
    dbs.layouts.allDocs({
        include_docs: true
    }, function (err, items) {
        var resp = [];
        for (item in items.rows) {
            resp.push(items.rows[item].doc);
        }
        res.send(resp);
    });
};

exports.addLayout = function (req, res) {
    var layout = req.body;
    console.log('Adding layout: ' + JSON.stringify(layout));
    dbs.layouts.post(req.body, function (err, result) {
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

exports.updateLayout = function (req, res) {
    var id = req.params.id;
    var layout = req.body;
    console.log('Updating layout: ' + id);
    console.log(JSON.stringify(layout));
    dbs.layouts.put(req.body, function (err, result) {
        if (err) {
            debug('Error updating layout: ' + err);
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

exports.deleteLayout = function (req, res) {
    var id = req.params.id;
    console.log('Deleting layout: ' + id);
    dbs.layouts.get(id, function (err, ins) {
        if (err) {
            debug('Error - ' + err);
            res.send({
                'error': 'An error has occurred - ' + err
            });
        } else {
            dbs.layouts.remove(ins, function (err, result) {
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
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    const uploadedFile = req.files.file;
    console.log('Will save picture ' + uploadedFile.name + ' for Layout ID: ' + id);
    
    const filenameExt = uploadedFile.name.split('.').pop();
    const targetPath = './public/pics/layouts/' + id + '.' + filenameExt;

    uploadedFile.mv(targetPath, function(err) {
        if (err) {
            console.log('Error saving file:', err);
            return res.status(500).send(err);
        }
        res.send(true);
    });
}