/**
 * Where we are storing our database configuration and schemas.
 */

var mongoose = require( 'mongoose' );
var Schema   = mongoose.Schema;


/**
 * Our data schema for the application is defined here
 */

/**
 * TO DO or possibilities:
 * - Loco runtime
 * - Loco response curves (bemf/power) over time.
 *     -> In a separate document?
 * - Historical notes, personal notes
 * - Controller settings for the loco ?
 * - PDF documentation (one PDF or several ?)
 * - Portfolio for the loco: several pictures & PDFs
 *
 */
var LocoSchema = new Schema({
        name: String,
        year: Date,
        reference: String,
        description: String,
        picture: String
});
 
// Compile the schema by issuing the below:
mongoose.model('Loco', LocoSchema );

/**
 * Train controllers. Unfortunate naming convention since
 * it has nothing to do with MVC Controllers, but here you go
 */
var ControllerSchema = new Schema({
    name: String,
    type: String,
    port: String,
    pidparams: {kp: Number, ki: Number, kd: Number, sample: Number}
});

mongoose.model('Controller', ControllerSchema);

/**
 * Accessories. Can be a point, or something else.
 * accessories have an adress on a controller, and are located
 * on layouts
 */
var AccessorySchema = new Schema({
                name: String,
                loc : { x:Number, y:Number},
                controllerId: {type: Schema.Types.ObjectId, ref:'Controller', default:null},
                controllerAddress: Number
});

mongoose.model('Accessory', AccessorySchema);

/**
 * We never manage controllers and accessories outside of
 * layouts, so no need to define separate schemas for those.
 *
 * This schema supports multiple controllers.
 */
var LayoutSchema = new Schema({
        name: String,
        controllers: [{type: Schema.Types.ObjectId, ref:'Controller', default:null}],
        accessories: [{type: Schema.Types.ObjectId, ref:'Accessory', default:null}],
        description: String,
        picture: String
});


mongoose.model('Layout', LayoutSchema);


/**
 * Settings: global application settings.
 *
 * For now: ID of the current layout, and current loco
 */
var ApplicationSettingsSchema = new Schema({
    currentLayout: {type: Schema.Types.ObjectId, ref:'Layout', default:null},
    currentLoco: {type: Schema.Types.ObjectId, ref:'Loco', default:null}
});

mongoose.model('Settings',ApplicationSettingsSchema);


mongoose.connect( 'mongodb://localhost/traindb' );