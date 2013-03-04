/**
 * Where we are storing our database configuration and schemas.
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
 * - Historical notes and personal notes separated ?
 * - Controller settings for the loco ?
 * - PDF documentation (one PDF document)
 * - Portfolio for the loco: several pictures & PDFs
 *
 */
var LocoSchema = new Schema({
        name: String,
        year: String,           // Year the model was produced/bought
        reference: String,      // Manufacturer reference
        description: String,    // Up to the user
        picture: String,        // Filename in public/pics/locos
        documentation: String,  // PDF doc, filename in public/pics/locodocs/
        runtime: Number,        // Runtime of the loco in seconds
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
    pidkp: Number,
    pidki: Number,
    pidkd: Number,
    pidsample: Number,
    updaterate: Number
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