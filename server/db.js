/**
 * Where we are storing our database configuration
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

var Loco = new Schema({
        name: String,
        year: Date,
        reference: String,
        description: String,
        picture: String
});
 
mongoose.model('Loco', Loco );

var Layout = new Schema({
        name: String,
        controllerId: Schema.Types.ObjectId,
        description: String,
        picture: String
});

mongoose.model('Layout', Layout);


mongoose.connect( 'mongodb://localhost/traindb' );