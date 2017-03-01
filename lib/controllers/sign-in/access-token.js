'use strict';
const Twitter = require('twitter-oauth-agent'),
      Stream = require(__dirname + '/../../classes/stream').Stream;
module.exports = function(app) {
  const secret = app.get('twitterCredentials');
  app.get('/access-token', function(req, res) {
    const token = req.query.oauth_token,
          verifier = req.query.oauth_verifier;
    new Twitter({
      consumer_key: secret.consumer_key,
      consumer_secret: secret.consumer_secret,
      oauth_verifier: verifier,
      oauth_token: token
    }, function(err, profile) {
      // 'profile' will contain your twitter information 
      if (profile) {
        let streams = app.get('streams');
        streams.push(new Stream(profile, secret, app));
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'X-Requested-With');
        res.send(profile);
      }
      else {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'X-Requested-With');
        res.sendStatus(401);
      }
    });
  });
};
