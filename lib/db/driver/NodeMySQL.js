module.exports  = function (db_config) {
    var mysql   = require('mysql');
        
    return {
        'create': function (callback) {
			var db	= mysql.createConnection(db_config);
			
			db.connect(function (err) {
				if (err) {
					throw "Unable to connect to the database: " + err.code;
				}
				callback(db);
			});
        },
        'destroy': function (db) {
            db.end(function (err) {
				if (err) {
					console.log(err);
				}
				db.destroy();
			});
        }
    };
};