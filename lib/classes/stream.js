'use strict';
const _ = require('lodash');
const Twit = require('twit');
const redis = require('redis');

// TODO: when a user deauths, remove from DB
// NOTE: we don't know when a user deauths! but we probably get some errors
// when that happens, so we should test that out manually, catch the error
// message, and delete (though I guess it's possible for someone's auth to just
// run out, too?)

class Stream {
  constructor(profile, secret, app, UNMUTE) {
    let client = app.get('client');
    this.stream = null;
    this.app = app;
    // A stream is a userid and a set of keys
    // This needs to be stored in redis
    // Let's serialize the keys as a JSON blob and then put the 
    // the blob in a hash where the key is the... let's do TWITTER ID
    // instead of userid since username can change

    /* In this constructor, we're going to check if
    "HEXISTS supermute-users ${profile.id_str}"
    and if does NOT, then we create a new entry,
    "HSET supermute-users {$profile.id_str} json-blob".

    Either way, we then instantiate local variables and we fire up this stream.
    */

    client.hexists(`supermute-users`, profile.id_str, (err, exists) => {
      let userdata = {
        credentials: {
          access_token: profile.access_token,
          access_token_secret: profile.access_token_secret
        },
        supermutes: []
      };
      this.userid = profile.id_str;
      let creds = userdata.credentials;
      // use the application's consumer stuff but the user's access stuff
      creds.consumer_key = this.app.get('twitterCredentials').consumer_key;
      creds.consumer_secret = this.app.get('twitterCredentials').consumer_secret;
      console.log(creds);
      this.T = new Twit(creds);

      // This user doesn't exist in the DB yet so we create a blank entry
      // and include the new keyword and expiration date
      // mutedUsers and isExpired are empty because we're intializing
      if (!exists) {
        console.log(`writing ${profile.id_str} to database...`);
        // TODO hash our application credentials???? maybe??
        client.hset(`supermute-users`, profile.id_str, JSON.stringify(userdata), redis.print);
        // save our userdata to this stream object
        this.userdata = userdata;
      }
      else {
        // do nothing
      }

      // start the stream
      this.start(UNMUTE);
    });
  }

  start() {
    // if our stream is running, stop it. then start it up again regardless.
    if (this.stream && typeof this.stream.stop === 'function') {
      this.stream.stop();
      console.log('stopping stream...');
    }

    // start listening for mentions of our bot name
    console.log('starting stream...');
    this.stream = this.T.stream('user', { });

    let client = this.app.get('client');
    client.hget(`supermute-users`, this.userid, (err, userdataDb) => {
      this.userdata = JSON.parse(userdataDb);
    });

    this.stream.on('tweet', eventMsg => {
      console.log(eventMsg);
      // get all our different defined keywords
      let activeSupermutes = this.userdata.supermutes.filter(supermute => !supermute.isExpired);
      let keywords = activeSupermutes.map(supermute => supermute.keyword.toLowerCase());
      console.log('active keywords',this.userid, keywords);

      const text = eventMsg.text.toLowerCase();
      let user = eventMsg.user.screen_name.toLowerCase();
      let userid = eventMsg.user.id_str;
      // if this is a retweet, the user is actually the retweeted user
      if (eventMsg.retweeted_status) {
        userid = eventMsg.retweeted_status.user.id_str;
        user = eventMsg.retweeted_status.user.screen_name.toLowerCase();
      }

      // If this is US, do nothing (we don't mute ourselves, though Twitter would throw an error anyway)
      if (userid === this.userid) {
        // do nothing
      }
      // otherwise, we go ahead with our main logic
      else {
        // check if there's a keyword in the tweet that came to us (undefined if nothing)
        const wordFound = _.find(keywords, keyword => text.indexOf(keyword) !== -1);
        if (wordFound) {
          console.log(`Muting now`,user,text);
          this.T.post('mutes/users/create', { screen_name: user }, (err, data, response) => {
            if (err) {
              console.log('err',err);
            } 
            else {
              console.log(err,data);
              if (data.muting) {
                console.log(`not muting ${user} because they are already muted for ${this.userid}`);
              }
              else {
                console.log(`muting ${user} for ${this.userid}!`);
                let supermute = this.userdata.supermutes.filter(mute => mute.keyword.toLowerCase() === wordFound.toLowerCase())[0];
                let mute_list = supermute.mutedUsers;
                // we muted! add the muted user to the database
                const client = this.app.get('client');
                mute_list.push(user);
                mute_list = _.uniq(mute_list);
                supermute.mutedUsers = mute_list;
                console.log('pushing',mute_list.length,'unique people');
                // set the blob with the new value 
                client.hset(`supermute-users`, this.userid, JSON.stringify(this.userdata), (err,resp) => {
                  if (err) {
                    console.log('err:', err);
                  }
                  else {
                    console.log(`Updated ${this.userid}!`);
                  }
                });
              }
            }
          });
        } // end if(wordFound)
      }
    }); // end stream.on('tweet')
  } // end start()
} // end Stream

module.exports = {
  Stream
};
