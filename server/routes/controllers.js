/**
 * REST API to talk to controllers.
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
        debug = require('debug')('tc:controllers');



exports.findById = function (req, res) {
    var id = req.params.id;
    console.log('Retrieving controller: ' + id);
    dbs.controllers.get(id, function (err, item) {
        res.send(item);
    });
};

exports.findAll = function (req, res) {
    dbs.controllers.allDocs({
        include_docs: true
    }, function (err, items) {
        var resp = [];
        for (item in items.rows) {
            resp.push(items.rows[item].doc);
        }
        res.send(resp);
    });
};

exports.addController = function (req, res) {
    var controller = req.body;
    console.log('Adding controller: ' + JSON.stringify(controller));
    dbs.controllers.post(req.body, function (err, result) {
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

exports.updateController = function (req, res) {
    var id = req.params.id;
    var controller = req.body;
    console.log('Updating controller: ' + id);
    console.log(JSON.stringify(controller));
    dbs.controllers.put(req.body, function (err, result) {
        if (err) {
            debug('Error updating controller: ' + err);
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


exports.deleteController = function (req, res) {
    var id = req.params.id;
    console.log('Deleting controller: ' + id);
    dbs.controllers.get(id, function (err, ins) {
        if (err) {
            debug('Error - ' + err);
            res.send({
                'error': 'An error has occurred - ' + err
            });
        } else {
            dbs.controllers.remove(ins, function (err, result) {
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