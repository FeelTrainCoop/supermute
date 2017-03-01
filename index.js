'use strict';
var fs = require('fs');
var _ = require('underscore');
var express = require('express'),
	controllers = require(__dirname + '/lib/controllers'),
	config = require(__dirname + '/lib/config'),
  Stream = require(__dirname + '/lib/classes/stream').Stream,
  secret = require(__dirname + '/lib/secret');
var redis = require('redis'), client = redis.createClient(process.env.REDIS_URL || 6379);
var Twit = require('twit');
var conf = {
  consumer_key: process.env.CONSUMER_KEY || secret.consumer_key,
  consumer_secret: process.env.CONSUMER_SECRET || secret.consumer_secret,
  access_token: process.env.ACCESS_TOKEN || secret.access_token,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET || secret.access_token_secret,
};
var callback_url = process.env.CALLBACK_URL || secret.callback_url;

var globalT = new Twit(conf);
var keywords = [],
    replies = [];

var app = express();
app.use(express.static('public'));
app.set('twitterCredentials', conf);
app.set('callbackUrl', callback_url);
controllers(app);
app.set('port', (process.env.PORT || 5000));
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

Array.prototype.pick = function() {
  return this[Math.floor(Math.random()*this.length)];
};

// Start up with an empty list of streams
app.set('streams', []);
app.set('client', client);

var UNMUTE = false;
var streams = app.get('streams');
client.exists(`supermute-users`, (err, exists) => {
  if (exists) {
    client.hgetall(`supermute-users`, (err, users) => {
      console.log(`Total permanent users: ${Object.keys(users).length}`);
      // go through each of our users and set up a stream for them with a full profile
      _.each(users, (blob, id_str) => {
        var userdata = JSON.parse(blob);
        var profile = {
          id_str,
          access_token: userdata.credentials.access_token,
          access_token_secret: userdata.credentials.access_token_secret
        };
        streams.push(new Stream(profile, secret, app, UNMUTE));
      });
      app.set('streams', streams);
    });
  }
  else {
    console.log('No users found in database!');
  }
});

function unmute(id, supermute) {
  console.log(id, supermute);
  // get the stream object for our user
  let stream = app.get('streams').filter(stream => stream.userid === id)[0];
  if (stream.userdata !== undefined) {
    let permanentMuteRecord = stream.userdata.supermutes.filter(mute => (mute.keyword === supermute.keyword) && !mute.isExpired)[0];
    permanentMuteRecord.isExpired = true;
    client.hset(`supermute-users`, id, JSON.stringify(stream.userdata), redis.print);
    // user this user's individual stream and set off a delayed cascade of mutes
    let count = 0;
    const delayMillis = 2000;
    // keep a running list of unmuted users. at the end we'll subtract these from the mutedUsers list
    for (let mutedUser of supermute.mutedUsers) {
      setTimeout(function() {
        console.log('now unmuting', mutedUser);
        stream.T.post('mutes/users/destroy', { screen_name: mutedUser }, (err, data, response) => {
          // if there's no error, or if the error is we've already unmuted them, remove the user from the mute list in the database!
          if (!err || +err.code === 272) {
            // we unmuted!
            console.log(`unmuted ${mutedUser} for ${id}!`);
            // remove this user from the permanent record and then update the DB with the new userdata
            permanentMuteRecord.mutedUsers.splice(permanentMuteRecord.mutedUsers.indexOf(mutedUser),1);
            client.hset(`supermute-users`, id, JSON.stringify(stream.userdata), redis.print);
          }
          else {
            console.log('err!',err);
          }
        });
      }, delayMillis*count, mutedUser); // this sets up one mute every two seconds
      count++;
    }
  }
}
app.set('unmute',unmute);

// Function to scan every entry in the DB and updated isExpired
function updateExpirations() {
  client.hgetall(`supermute-users`, (err, users) => { if (users) {
    const now = new Date();
    _.each(users, (blob, id_str) => {
      var userdata = JSON.parse(blob);
      if (userdata.supermutes) {
        // remove any records that are muting no users (all unmuted)
        userdata.supermutes = userdata.supermutes
          .filter(supermute => ((supermute.mutedUsers.length > 0) || !supermute.isExpired));
        client.hset(`supermute-users`, id_str, JSON.stringify(userdata), (err, resp) => {
          // do nothing
        });

        // go through the rest and unmute as needed
        for (var supermute of userdata.supermutes) {
          var d = new Date(supermute.expirationDate);
          if ((now > d)) {
            //supermute.isExpired = true;
            unmute(id_str, supermute);
          }
        }
      }
    });
  }});
  setTimeout(updateExpirations, 1000*60*10);
}

// Check for expired mutes. First about a minute after startup, then every ten minutes
setTimeout(updateExpirations, 1000*60);
