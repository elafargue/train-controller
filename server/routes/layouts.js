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
    if (req.files) {
        console.log('Will save picture ' + JSON.stringify(req.files) + ' for Layout ID: ' + id);
        // We use an 'upload' dir on our server to ensure we're on the same FS
        var filenameExt = req.files.file.path.split(".").pop();
        // Note: we reference the target filename relative to the path where the server
        // was started:
        fs.rename(req.files.file.path, './public/pics/layouts/' + id + '.' + filenameExt,
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