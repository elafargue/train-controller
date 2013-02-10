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

exports.findAll = function(req,res) {
    res.send([{name:'Loco 1'}, {name:'Loco 2'}, {name: 'Loco 3'}]);
};

exports.findById = function(req,res) {
    res.send({id:req.params.id, name: "The Name", description: "description"});
};
