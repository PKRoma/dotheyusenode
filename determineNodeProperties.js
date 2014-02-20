var request = require('request');
var headers = require('./checkers/headers.js');
var jsSourceCheckers = require('./checkers/needsjs');
var async = require('async');
var _ = require('underscore');
var cache = require('./cache')

function handler(url, callback) {
  var obj = {
    answer: 'Maybe, but we cannot tell',
    reasons: []
  };

  request(url, function(e,r,b) {

    function runner(task, cb) {
      task(r,b,cb);
    }

    if (e) {
      return callback(e);
    } else {
      var checkers = [
        headers,
        jsSourceCheckers
      ];

      async.map(checkers, runner, function(err, reasons) {
        obj.reasons = _.filter(_.flatten(reasons), function(r) { return r && r.found; });
        if (obj.reasons.length > 0) {
          obj.answer = 'node activity detected';
        }
        cache.set(url, JSON.stringify(obj), function() {
          callback(null, obj);
        })
      });

    }
  });
}

module.exports = function(url, callback) {
  if (url.indexOf('http') === -1) {
    url = 'http://' + url;
  }
  cache.get(url, function(err, value) {
    if (value) {
      callback(null, JSON.parse(value))
    } else {
      handler(url, callback)
    }
  })
}
