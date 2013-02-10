/**
 * REST API to talk to controllers.
 *
 * A controller contains:
 *
 * - Name
 * - Model
 * - Address (filename of serial port or IP address)
 * - Current parameters
 *
 * The REST API lets us:
 * - Edit configuration parameters
 * - Start a controller (?)
 * - Send commands : speed, direction
 * - Read status
 */

exports.findAll = function(req,res) {
    res.send([{name:'Serial 1'}, {name:'Remote 1'}, {name: 'Remote 2'}]);
};

exports.findById = function(req,res) {
    res.send({id:req.params.id, name: "Local", description: "arduino controller"});
};
