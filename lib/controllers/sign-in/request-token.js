'use strict';
const Twitter = require('twitter-oauth-agent');
module.exports = function(app) {
  const secret = app.get('twitterCredentials'),
        callback_url = app.get('callbackUrl');
  app.get('/request-token', function(req, res) {
    new Twitter({
      consumer_key: secret.consumer_key,
      consumer_secret: secret.consumer_secret,
      callback: callback_url
    }, function(err, requestToken) {
      if (err) {
        res.status(500).send(err);
      }
      else {
        res.redirect('https://api.twitter.com/oauth/authenticate?oauth_token=' + requestToken.oauth_token);
      }
    });
  });
};
