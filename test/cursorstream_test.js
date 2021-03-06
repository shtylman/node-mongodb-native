var mongodb = process.env['TEST_NATIVE'] != null ? require('../lib/mongodb').native() : require('../lib/mongodb').pure();
var useSSL = process.env['USE_SSL'] != null ? true : false;

var testCase = require('nodeunit').testCase,
  debug = require('util').debug,
  inspect = require('util').inspect,
  nodeunit = require('nodeunit'),
  gleak = require('../dev/tools/gleak'),
  Db = mongodb.Db,
  Cursor = mongodb.Cursor,
  Collection = mongodb.Collection,
  Binary = mongodb.Binary,
  fs = require('fs'),
  Server = mongodb.Server;

var MONGODB = 'integration_tests';
var native_parser = (process.env['TEST_NATIVE'] != null);
var client = null;

/**
 * Retrieve the server information for the current
 * instance of the db client
 *
 * @ignore
 */
exports.setUp = function(callback) {
  var self = exports;
  client = new Db(MONGODB, new Server("127.0.0.1", 27017, {auto_reconnect: true, poolSize: 4, ssl:useSSL}), {w:0, native_parser: (process.env['TEST_NATIVE'] != null)});
  client.open(function(err, db_p) {
    if(numberOfTestsRun == (Object.keys(self).length)) {
      // If first test drop the db
      client.dropDatabase(function(err, done) {
        callback();
      });
    } else {
      return callback();
    }
  });
}

/**
 * Retrieve the server information for the current
 * instance of the db client
 *
 * @ignore
 */
exports.tearDown = function(callback) {
  var self = this;
  numberOfTestsRun = numberOfTestsRun - 1;
  // Close connection
  client.close();
  callback();
}

/**
 * A simple example showing the use of the cursorstream pause function.
 *
 * @_class cursorstream
 * @_function pause
 * @ignore
 */
exports.shouldStreamDocumentsUsingTheCursorStreamPauseFunction = function(test) {
  var db = new Db('integration_tests', new Server("127.0.0.1", 27017,
   {auto_reconnect: false, poolSize: 1, ssl:useSSL}), {w:0, native_parser: native_parser});

  // Establish connection to db
  db.open(function(err, db) {

    // Create a lot of documents to insert
    var docs = []
    for(var i = 0; i < 1; i++) {
      docs.push({'a':i})
    }

    // Create a collection
    db.createCollection('test_cursorstream_pause', function(err, collection) {
      test.equal(null, err);

      // Insert documents into collection
      collection.insert(docs, {w:1}, function(err, ids) {
        // Peform a find to get a cursor
        var stream = collection.find().stream();

        // For each data item
        stream.on("data", function(item) {
          // Check if cursor is paused
          test.equal(false, stream.paused);
          // Pause stream
          stream.pause();
          // Check if cursor is paused
          test.equal(true, stream.paused);

          // Restart the stream after 1 miliscecond
          setTimeout(function() {
            stream.resume();
            // Check if cursor is paused
            process.nextTick(function() {
              test.equal(false, stream.paused);
            })
          }, 1);
        });

        // When the stream is done
        stream.on("close", function() {
          db.close();
          test.done();
        });
      });
    });
  });
}

/**
 * A simple example showing the use of the cursorstream resume function.
 *
 * @_class cursorstream
 * @_function resume
 * @ignore
 */
exports.shouldStreamDocumentsUsingTheCursorStreamResumeFunction = function(test) {
  var db = new Db('integration_tests', new Server("127.0.0.1", 27017,
   {auto_reconnect: false, poolSize: 1, ssl:useSSL}), {w:0, native_parser: native_parser});

  // Establish connection to db
  db.open(function(err, db) {

    // Create a lot of documents to insert
    var docs = []
    for(var i = 0; i < 1; i++) {
      docs.push({'a':i})
    }

    // Create a collection
    db.createCollection('test_cursorstream_resume', function(err, collection) {
      test.equal(null, err);

      // Insert documents into collection
      collection.insert(docs, {w:1}, function(err, ids) {
        // Peform a find to get a cursor
        var stream = collection.find().stream();

        // For each data item
        stream.on("data", function(item) {
          // Check if cursor is paused
          test.equal(false, stream.paused);
          // Pause stream
          stream.pause();
          // Check if cursor is paused
          test.equal(true, stream.paused);

          // Restart the stream after 1 miliscecond
          setTimeout(function() {

            // Resume the stream
            stream.resume();

            // Check if cursor is paused
            process.nextTick(function() {
              test.equal(false, stream.paused);
            });
          }, 1);
        });

        // When the stream is done
        stream.on("close", function() {
          db.close();
          test.done();
        });
      });
    });
  });
}

/**
 * A simple example showing the use of the cursorstream resume function.
 *
 * @_class cursorstream
 * @_function destroy
 * @ignore
 */
exports.shouldStreamDocumentsUsingTheCursorStreamDestroyFunction = function(test) {
  var db = new Db('integration_tests', new Server("127.0.0.1", 27017,
   {auto_reconnect: false, poolSize: 1, ssl:useSSL}), {w:0, native_parser: native_parser});

  // Establish connection to db
  db.open(function(err, db) {

    // Create a lot of documents to insert
    var docs = []
    for(var i = 0; i < 1; i++) {
      docs.push({'a':i})
    }

    // Create a collection
    db.createCollection('test_cursorstream_destroy', function(err, collection) {
      test.equal(null, err);

      // Insert documents into collection
      collection.insert(docs, {w:1}, function(err, ids) {
        // Peform a find to get a cursor
        var stream = collection.find().stream();

        // For each data item
        stream.on("data", function(item) {
          // Destroy stream
          stream.destroy();
        });

        // When the stream is done
        stream.on("close", function() {
          db.close();
          test.done();
        });
      });
    });
  });
}

exports.shouldStreamDocumentsWithPauseAndResumeForFetching = function(test) {
  var docs = []

  for(var i = 0; i < 3000; i++) {
    docs.push({'a':i})
  }

  var db = new Db('integration_tests', new Server("127.0.0.1", 27017,
   {auto_reconnect: false, poolSize: 5, ssl:useSSL}), {w:0, native_parser: native_parser});

  // Establish connection to db
  db.open(function(err, db) {
    db.createCollection('test_streaming_function_with_limit_for_fetching', function(err, collection) {
      test.ok(collection instanceof Collection);

      collection.insert(docs, {w:1}, function(err, ids) {
        // Peform a find to get a cursor
        var stream = collection.find({}).stream();
        var data = [];

        // For each data item
        stream.on("data", function(item) {
          stream.pause()

          collection.findOne({}, function(err, result) {
            data.push(1);
            stream.resume();
          })
        });

        // When the stream is done
        stream.on("close", function() {
          test.equal(3000, data.length);
          db.close();
          test.done();
        });
      });
    });
  });
}

exports.shouldStream10KDocuments = function(test) {
  var docs = []

  for(var i = 0; i < 10000; i++) {
    docs.push({'a':i, bin: new Binary(new Buffer(256))})
  }

  var db = new Db('integration_tests', new Server("127.0.0.1", 27017,
   {auto_reconnect: false, poolSize: 5, ssl:useSSL}), {w:0, native_parser: native_parser});

  // Establish connection to db
  db.open(function(err, db) {
    db.createCollection('test_streaming_function_with_limit_for_fetching_2', function(err, collection) {
      test.ok(collection instanceof Collection);

      collection.insert(docs, {w:1}, function(err, ids) {
        // Peform a find to get a cursor
        var stream = collection.find({}).stream();
        var data = [];

        // For each data item
        stream.on("data", function(item) {
          stream.pause()

          collection.findOne({}, function(err, result) {
            data.push(1);
            stream.resume();
          })
        });

        // When the stream is done
        stream.on("close", function() {
          test.equal(10000, data.length);
          db.close();
          test.done();
        });
      });
    });
  });
}

exports.shouldTriggerMassiveAmountOfGetMores = function(test) {
  var docs = []
  var counter = 0;
  var counter2 = 0;

  for(var i = 0; i < 1000; i++) {
    docs.push({'a':i, bin: new Binary(new Buffer(256))})
  }

  var db = new Db('integration_tests', new Server("127.0.0.1", 27017,
   {auto_reconnect: false, poolSize: 5, ssl:useSSL}), {w:0, native_parser: native_parser});

  // Establish connection to db
  db.open(function(err, db) {
    db.createCollection('test_streaming_function_with_limit_for_fetching_3', function(err, collection) {
      test.ok(collection instanceof Collection);

      collection.insert(docs, {w:1}, function(err, ids) {
        // Peform a find to get a cursor
        var stream = collection.find({}).stream();
        var data = [];

        // For each data item
        stream.on("data", function(item) {
          counter++;
          stream.pause()
          stream.resume();
          counter2++;
        });

        // When the stream is done
        stream.on("close", function() {
          test.equal(1000, counter);
          test.equal(1000, counter2);
          db.close();
          test.done();
        });
      });
    });
  });
}


/**
 * Retrieve the server information for the current
 * instance of the db client
 *
 * @ignore
 */
exports.noGlobalsLeaked = function(test) {
  var leaks = gleak.detectNew();
  test.equal(0, leaks.length, "global var leak detected: " + leaks.join(', '));
  test.done();
}

/**
 * Retrieve the server information for the current
 * instance of the db client
 *
 * @ignore
 */
var numberOfTestsRun = Object.keys(this).length - 2;