/**
 * REST API to manage locomotives
 */

exports.findAll = function(req,res) {
    res.send([{name:'Loco 1'}, {name:'Loco 2'}, {name: 'Loco 3'}]);
};

exports.findById = function(req,res) {
    res.send({id:req.params.id, name: "The Name", description: "description"});
};
