/**
 * Use the 'spawn' module to interact with mongodb for
 * backup/restore operations
 */
var spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');


/**
 * A few utility functions
 */

// http://www.geedew.com/2012/10/24/remove-a-directory-that-is-not-empty-in-nodejs/
var deleteDirectoryRecursive = function(dirpath) {
    if( fs.existsSync(dirpath) ) {
        console.log("deleteDirectoryRecursive starting");
      fs.readdirSync(dirpath).forEach(function(file,index){
        var curPath = dirpath + "/" + file;
        if(fs.statSync(curPath).isDirectory()) { // recurse
          deleteDirectoryRecursive(curPath);
        } else { // delete file
          fs.unlinkSync(curPath);
        }
      });
    fs.rmdirSync(dirpath);
  }
};


exports.generateBackup = function(req, res) {
    console.log('Launching backup');
    // Phase Zero: clean up the tmp directory for any old backup...
    var tmpdir = path.resolve(__dirname, '../public/pics/tmp');
    fs.readdirSync(tmpdir).forEach(function(file,index) {
        if (file.indexOf('backup-') > -1) {
            console.log('Clean up stale backup file: ' + file);
            fs.unlinkSync(tmpdir + '/' + file);
        }
    });
    
    // Phase I: dump the database
    var args = ['--db', 'traindb'],
        options= { cwd: path.resolve(__dirname, '../public/pics/'),
                    env: process.env
                };
    var mongodump = spawn('mongodump', args, options);
    /*
    mongodump.stdout.on('data', function (data) {
      console.log('stdout: ' + data);
    });
    */
    mongodump.stderr.on('data', function (data) {
      console.log('stderr: ' + data);
    });
    mongodump.on('exit', function (code) {
      console.log('mongodump exited with code ' + code);
      // Phase II: add a tag in the file to validate upon restore
      args = ['valid_train_backup'];
      var touch = spawn('touch', args, options);
      touch.on('exit', function(code) {
          console.log('Touch train backup tag exit ' + code);
          var filename = 'backup-' + Date.now() + '.tar.bz2';
          console.log('Backup file name: ' + filename);
          args = [ 'cvjf', 'tmp/' + filename, 'locos', 'layouts', 'dump', 'locodocs', 'cars', 'valid_train_backup'];
          // Phase II: create a tarfile in 'tmp' with the whole backup:
          var maketar = spawn('tar', args, options);
          maketar.on('exit', function(code) {
          res.redirect('/pics/tmp/' + filename);        
        });
      });
    });
    

};

exports.restoreBackup = function(req, res) {
    if (req.files) {
        console.log('Restore backup  ' + JSON.stringify(req.files));
        // We use an 'upload' dir on our server to ensure we're on the same FS
        var filename = req.files.file.path;
        // Phase I: check that we have a "valid_train_backup" tag in the
        // tar backup:
        var args = ['tjf', filename, 'valid_train_backup'],
            options= { cwd: path.resolve(__dirname, '../public/pics/'),
                       env: process.env
                     };
        var check = spawn('tar', args, options);
        check.on('exit', function(code) {
            console.log('Backup file check: ' + code);
            if (code != 0) {
                // Could not find the "valid_train_backup" file in the archive; bail out
                res.send("Invalid");
                fs.unlinkSync(req.files.file.path);
                console.log("Invalid backup file, deleting...");
            } else {
                // Phase II: clean up current image directories
                var dirpath = path.resolve(__dirname, '../public/pics/locos/');
                console.log("Deleting " + dirpath);
                deleteDirectoryRecursive(dirpath);
                dirpath = path.resolve(__dirname, '../public/pics/locodocs/');
                deleteDirectoryRecursive(dirpath);
                dirpath = path.resolve(__dirname, '../public/pics/layouts/');
                deleteDirectoryRecursive(dirpath);
                dirpath = path.resolve(__dirname, '../public/pics/dump/');
                deleteDirectoryRecursive(dirpath);
                dirpath = path.resolve(__dirname, '../public/pics/cars/');
                deleteDirectoryRecursive(dirpath);
                // Phase III: Restore images files
                args = ['xjf', filename];
                check = spawn('tar', args, options);
                check.on('exit', function(code) {
                    // Phase IV: restore database
                    args = ['--drop', 'dump' ];
                    check = spawn('mongorestore', args, options);
                    check.on('exit', function(code) {
                        // Phase V: remove backup file
                        fs.unlinkSync(req.files.file.path);                
                        res.send(true);
                    });                    
                });
            }
        });
    } else {
        res.send(false);
    }
};