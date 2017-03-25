# Supermute
A [Feel Train](https://feeltrain.com) project

These are some quick instructions for setting up Supermute to be hosted on Heroku. Heroku is, in plain terms, a service that lets you host custom web apps on the cloud. Their free tier is certainly powerful enough to host an instance of Supermute just for you and probably a few friends.

This Readme assumes you already know the basics of deploying a Heroku app and you have a Heroku account. If you don't, you should [check out their tutorial for Node.js and Express](https://devcenter.heroku.com/articles/getting-started-with-nodejs#introduction).

*NOTE*: If you just want to use Supermute for yourself and you're not a programmer, you should just use the version that Feel Train hosts at https://supermute.feeltrain.com.

## Get your Twitter app credentials

You're going to need to register a Twitter app. Go to https://apps.twitter.com and then follow the instructions there to set up an app. Make sure to choose "read and write" as the permission level. Also _make sure that both your consumer key/secret AND your access token/secret are set to read/write permission_. Both need to have write access, otherwise the app won't work.

Also, make sure to put as the "Callback URL" `https://YOURAPPNAME.herokuapp.com`.

In the end you should have the following:

- Consumer Key
- Consumer Secret
- Access Token
- Access Token Secret
- Callback URL

In the next section we're going to store these as environment variables on Heroku.

## Set up Heroku

First, you need to [install the Heroku toolbelt](https://devcenter.heroku.com/articles/heroku-cli). Make sure you are logged in via `heroku login`.

```
$ git clone git@github.com:FeelTrainCoop/supermute.git
$ cd supermute
$ heroku apps:create YOURAPPNAME
```

Open up this url in your web browser, replacing `YOURAPPNAME` with whatever you named your app:

https://dashboard.heroku.com/apps/YOURAPPNAME

This opens the dashboard for managing the app. Click on the `Settings` tab and click `Reveal config vars`. Enter your values you got from Twitter as:

- CONSUMER_KEY
- CONSUMER_SECRET
- ACCESS_TOKEN
- ACCESS_TOKEN_SECRET
- CALLBACK_URL

You can also do this via the Heroku CLI toolbelt if you prefer!

Now we add the `heroku-redis` addon. This provides a remote Redis database for Supermute to use. The following command adds the free "hobby" tier:

```
$ heroku addons:create heroku-redis:hobby-dev --app YOURAPPNAME
```

Next, we push all the code to our Heroku remote repository (and hence, deploy it on remote). Then we turn on our web dyno so the whole thing is running!

```
$ git push heroku master
$ heroku ps:scale web=1
```

&copy; 2017 Feel Train, LLC
