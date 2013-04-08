/**
 * Use the 'spawn' module to interact with mongodb for
 * backup/restore operations
 */
var spawn = require('child_process').spawn;


exports.generateBackup = function(req, res) {
    console.log('Launching backup');
    var args = ['--db', 'traindb'],
        options= { cwd: path.resolve(__dirname, '/public/pics/tmp/'),
                    env: process.env
                },
        mongodump = spawn('/usr/local/bin/mongodb/bin/mongodump', args);
    mongodump.stdout.on('data', function (data) {
      console.log('stdout: ' + data);
    });
    mongodump.stderr.on('data', function (data) {
      console.log('stderr: ' + data);
    });
    mongodump.on('exit', function (code) {
      console.log('mongodump exited with code ' + code);
    });
};

exports.restoreBackup = function(req, res) {
    if (req.files) {
        console.log('Restore backup  ' + JSON.stringify(req.files));
        // We use an 'upload' dir on our server to ensure we're on the same FS
    } else {
        res.send(false);
    }
};