/**
 * Where we are storing our database configuration and schemas.
 */

var mongoose = require( 'mongoose' );
var Schema   = mongoose.Schema;


/**
 * Our data schema for the application is defined here
 *
The permitted SchemaTypes are

String
Number
Date
Buffer
Boolean
Mixed
ObjectId
Array
 */

var LocoSchema = new Schema({
        name: String,
        year: Date,
        reference: String,
        description: String,
        picture: String
});
 
mongoose.model('Loco', LocoSchema );

/**
 * We never manager controllers and accessories outside of
 * layouts, so no need to define separate schemas for those.
 *
 * This schema supports multiple controllers.
 */
var LayoutSchema = new Schema({
        name: String,
        controllers: [{
                name: String,
                type: String,
                port: String }],
        accessories: [{
                name: String,
                loc : { x:Number, y:Number},
                controllerIdx: Number,    /* Index in the controllers array above */
                controllerAddress: Number
        }],
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
    currentLayout: Schema.Types.ObjectId,
    currentController: Schema.Types.ObjectId
});

mongoose.model('Settings',ApplicationSettingsSchema);


mongoose.connect( 'mongodb://localhost/traindb' );