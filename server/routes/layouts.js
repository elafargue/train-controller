/**
 * REST API to manage layouts.
 *
 * A layout contains:
 *   - One or more controllers
 *   - A layout picture
 *   - List of Accessories (turnouts, etc)
 */

exports.findAll = function(req,res) {
    res.send([{name:'Layout 1'}, {name:'Layout 2'}, {name: 'Layout 3'}]);
};

exports.findById = function(req,res) {
    res.send({id:req.params.id, name: "Local", description: "my Z scale layout"});
};
