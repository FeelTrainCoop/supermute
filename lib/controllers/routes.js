'use strict';
const redis = require('redis');

module.exports = function(app) {
  app.get('/set-mute', function(req, res) {
    console.log(req.query.word, req.query.id);
    const id = req.query.id;
    const keyword = req.query.word;
    if (keyword.length < 3) {
      // maybe send an error if you have a 1 or 2 char word

    }
    // maximum 7 days
    const hours = Math.min(+req.query.hours, 7*24);
    let client = app.get('client');
    // get the current data for this user
    client.hget(`supermute-users`, id, (err, userdataDb) => {
      let userdata;
      if (userdataDb) {
        userdata = JSON.parse(userdataDb);
      }
      if (userdata &&
        userdata.supermutes &&
        userdata.credentials.access_token === req.query.access_token &&
        userdata.credentials.access_token_secret === req.query.access_token_secret) {
        // test if the keyword already exists (not expired) for one of the object,
        // if it does, don't set it!!
        const keywordExists = userdata.supermutes
          .filter(supermute => (supermute.keyword.toLowerCase() === keyword.toLowerCase()) && !supermute.isExpired).length > 0;
        if (!keywordExists) {
          let d = new Date();
          d.setHours(d.getHours()+hours);
          const supermute = {
            keyword,
            mutedUsers: [],
            expirationDate: d,
            isExpired: false
          };
          userdata.supermutes.push(supermute);
          console.log('hi', userdata);
          // TODO: this still isn't restarting when I submit a new thing. the active keywords
          // are still empty. need to reboot process but whyhj
          client.hset(`supermute-users`, id, JSON.stringify(userdata), (err, result) => {
            // restart the stream for this user!!
            let streams = app.get('streams');
            const userStream = streams.filter(stream => stream.userid === id)[0];
            userStream.start();
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'X-Requested-With'); 
            delete userdata.credentials;
            res.json(userdata);
          });
        }
        else {
          console.log('already exists!');
          res.header('Access-Control-Allow-Origin', '*');
          res.header('Access-Control-Allow-Headers', 'X-Requested-With'); 
          res.sendStatus(400);
        }
      }
      else if (userdata &&
      userdata.credentials.access_token !== req.query.access_token &&
      userdata.credentials.access_token_secret !== req.query.access_token_secret) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'X-Requested-With'); 
        res.sendStatus(401);
      }
      else {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'X-Requested-With'); 
        res.sendStatus(500);
      }
    });
  });

  app.get('/get-mutes', function(req, res) {
    console.log(req.query.id);
    const id = req.query.id;
    let client = app.get('client');
    // get the current data for this user
    client.hget(`supermute-users`, id, (err, userdataDb) => {
      let userdata = userdataDb ? JSON.parse(userdataDb) : undefined;
      if (userdata &&
        userdata.credentials.access_token === req.query.access_token &&
        userdata.credentials.access_token_secret === req.query.access_token_secret) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'X-Requested-With'); 
        delete userdata.credentials;
        res.json(userdata);
      }
      else {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'X-Requested-With'); 
        res.sendStatus(401);
      }
    });
  });

  app.get('/delete-mute', function(req, res) {
    console.log(req.query.word, req.query.id);
    const id = req.query.id;
    const keyword = req.query.word;
    // maximum 7 days
    const hours = Math.min(+req.query.hours, 7*24);
    let client = app.get('client');
    // get the current data for this user
    client.hget(`supermute-users`, id, (err, userdataDb) => {
      let userdata;
      if (userdataDb) {
        userdata = JSON.parse(userdataDb);
      }
      if (userdata &&
        userdata.supermutes &&
        userdata.credentials.access_token === req.query.access_token &&
        userdata.credentials.access_token_secret === req.query.access_token_secret) {
        // test if the unexpired keyword already exists for one of the object,
        // if it does, run an unmute on the keyword and replace the userdata with the new userdata
        const mutesFound = userdata.supermutes.filter(supermute => !supermute.isExpired && (supermute.keyword.toLowerCase() === keyword.toLowerCase()));
        const mutesRemaining = userdata.supermutes.filter(supermute => supermute.isExpired || (supermute.keyword.toLowerCase() !== keyword.toLowerCase()));
        if (mutesFound.length > 0) {
          app.get('unmute')(id, mutesFound[0]);
          res.header('Access-Control-Allow-Origin', '*');
          res.header('Access-Control-Allow-Headers', 'X-Requested-With'); 
          delete userdata.credentials;
          userdata.supermutes = mutesRemaining;
          res.json(userdata);
        }
        else {
          console.log('doesn\'t exist!');
          res.header('Access-Control-Allow-Origin', '*');
          res.header('Access-Control-Allow-Headers', 'X-Requested-With'); 
          res.sendStatus(404);
        }
      }
      else if (userdata &&
      userdata.credentials.access_token !== req.query.access_token &&
      userdata.credentials.access_token_secret !== req.query.access_token_secret) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'X-Requested-With'); 
        res.sendStatus(401);
      }
      else {
        console.log('doesn\'t exist!');
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'X-Requested-With'); 
        res.sendStatus(404);
      }
    });
  });
};
