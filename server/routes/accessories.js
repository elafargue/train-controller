/**
 * REST API to talk to accessories.
 *
 * The REST API lets us:
 * - Edit configuration parameters
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
        debug = require('debug')('tc:accessories');

exports.findById = function (req, res) {
    var id = req.params.id;
    console.log('Retrieving accessory: ' + id);
    dbs.accessories.get(id, function (err, item) {
        res.send(item);
    });
};

exports.findAll = function (req, res) {
    dbs.accessories.allDocs({
        include_docs: true
    }, function (err, items) {
        var resp = [];
        for (item in items.rows) {
            resp.push(items.rows[item].doc);
        }
        res.send(resp);
    });
};

exports.addAccessory = function (req, res) {
    var accessory = req.body;
    // don't want that
    console.log('Adding accessory: ' + JSON.stringify(accessory));
    dbs.accessories.post(req.body, function (err, result) {
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

exports.updateAccessory = function (req, res) {
    var id = req.params.id;
    var accessory = req.body;
    console.log('Updating accessory: ' + id);
    console.log(JSON.stringify(accessory));
    dbs.accessories.put(req.body, function (err, result) {
        if (err) {
            debug('Error updating accessory: ' + err);
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


exports.deleteAccessory = function (req, res) {
    var id = req.params.id;
    console.log('Deleting accessory: ' + id);
    dbs.accessories.get(id, function(err,ins) {
        if (err) {
            debug('Error - ' + err);
            res.send({'error':'An error has occurred - ' + err});
        } else {
            dbs.accessories.remove(ins, function(err,result) {
                if (err) {
                    res.send({'error':'An error has occurred - ' + err});
                } else {
                    res.send(req.body);
                }
            });
        }
    });}