/**
 * REST API to talk to Log books.
 *
 * The REST API lets us:
 * - Edit logbook entries
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
    _ = require('underscore'),
    debug = require('debug')('tc:logbooks');

exports.findByLocoId = function (req, res) {
    var id = req.params.id;
    console.log('Retrieving Logbook entres for loco ID: ' + id);
    dbs.logbookentries.query('by_loco', {
        key: id,
        include_docs: true
    }, function (err, items) {
        if (err && err.status == 404) {
            res.send([]);
            return;
        }
        var resp = [];
        if (items.rows && items.rows.length == 0) {
            res.send([]);
            return;
        }
        var sendResp = function () {
            res.send(resp);
        }
        var af = _.after(items.rows.length, sendResp);
        _.each(items.rows, function (item) {
            // Double check there is a doc. In the extreme case something happened
            // at log creation where no keys were stored in the log, we can have an
            // empty entry (seen this in production).
            if (item.doc) {
                    resp.push(item.doc);
                    af();
            } else {
                af();
            }
        });
    });
};

exports.findAll = function (req, res) {
    dbs.logbookentries.allDocs({
        include_docs: true
    }, function (err, items) {
        var resp = [];
        for (item in items.rows) {
            debug(item);
            resp.push(items.rows[item].doc);
        }
        debug(resp);
        res.send(resp);
    });
};

exports.addEntry = function (req, res) {
    var entry = req.body;
    console.log('Adding log entry for Loco ID: ' + entry.locoid + ' - ' + JSON.stringify(entry));
    dbs.logbookentries.post(req.body, function (err, result) {
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

exports.updateEntry = function (req, res) {
    var id = req.params.id;
    var entry = req.body;
    console.log('Updating logbook entry: ' + id);
    console.log(JSON.stringify(entry));
    dbs.logbookentries.put(req.body, function (err, result) {
        if (err) {
            debug('Error updating logbook entry: ' + err);
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

exports.deleteEntry = function (req, res) {
    var id = req.params.id;
    console.log('Deleting logbook entry: ' + id);
    dbs.logbookentries.get(id, function (err, ins) {
        if (err) {
            debug('Error - ' + err);
            res.send({
                'error': 'An error has occurred - ' + err
            });
        } else {
            dbs.logbookentries.remove(ins, function (err, result) {
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