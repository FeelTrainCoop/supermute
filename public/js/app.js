var credentials = JSON.parse(localStorage.getItem('credentials'));
var oauthInLocation = (location.search.indexOf('oauth_token') > -1) && credentials === null;
if (!credentials && !oauthInLocation) {
  $('#login').show();
}
// if we have an oauth token, get our access token and show our stuff
else if (oauthInLocation) {
  var url = "access-token" + location.search;
  console.log('url:', url);
  $.get(url).done(function(user) {
    $('#userinfo').show();
    console.log(user);
    credentials = {
      access_token: user.access_token,
      access_token_secret: user.access_token_secret,
      name: user.name,
      screen_name: user.screen_name,
      id_str: user.id_str
    };
    localStorage.setItem('credentials', JSON.stringify(credentials));
    $('#status').text("You've authenticated!");
    $('#profile').html("<p>" + user.name + ", @" + user.screen_name + "</p>");
    $.get(`get-mutes?id=${user.id_str}&access_token=${user.access_token}&access_token_secret=${user.access_token_secret}`).done(function(userdata) {
      console.log(userdata);
      var keywords = userdata.supermutes.map(supermute => supermute.keyword);
      renderMutes(userdata.supermutes);
    });
  });
}
else {
  $('#userinfo').show();
  $('#status').text("Welcome back!");
  $('#profile').html("<p>" + credentials.name + ", @" + credentials.screen_name + ` &mdash; <a href="#!" class="logout">Logout</a></p>`);
  $.get(`get-mutes?id=${credentials.id_str}&access_token=${credentials.access_token}&access_token_secret=${credentials.access_token_secret}`).done(function(userdata) {
    console.log(userdata);
    var keywords = userdata.supermutes.map(supermute => supermute.keyword);
    renderMutes(userdata.supermutes);
  });
}

function renderMutes(mutes) {
  console.log(mutes);
  $('#userdata').html('');
  mutes = mutes.filter(mute => !mute.isExpired);
  for (var mute of mutes) {
    var now = new Date();
    var d = new Date(mute.expirationDate);
    var hoursLeft = ((d-now)/1000/60/60).toPrecision(3);
    var mutedList = mute.mutedUsers
      .map(user => `<a href="https://twitter.com/${user}">${user}</a>`)
      .join('<br>');
    if (mutedList === '') {
      mutedList = `(Nobody's muted yet!)`;
    }
    var div = `<div class="mute" data-keyword="${mute.keyword}" data-time="${(mute.mutedUsers.length*2/60).toPrecision(3)}">You've muted <a href="#!" class="showMutedList">${mute.mutedUsers.length} users</a> for saying ${mute.keyword}. Mute will last another ${hoursLeft} hours. <a href="#!" class="cancelMute" >(undo?)</a> <div class="mutedList hide">${mutedList}</div></div>`;
    $('#userdata').append(div);
  }
  $('.showMutedList').on('click', function() {
    $(this).parent().find('.mutedList').toggle();
  });
  $('.cancelMute').on('click', function() {
    var word = $(this).parent().data('keyword');
    var time = $(this).parent().data('time');
    if (window.confirm(`Really unmute the phrase "${word}"? It will take about ${time} minutes to unmute everyone.`)) {
      var url = `delete-mute?word=${word}&id=${credentials.id_str}&access_token=${credentials.access_token}&access_token_secret=${credentials.access_token_secret}`;
      console.log(url);
      $.get(url).done(function(userdata) {
        renderMutes(userdata.supermutes);
      });
    }
  });
}

// button handlers
$(function() {
  $('#login > button').on('click', function() {
    window.location.href = 'request-token';
  });

  $('.what').on('click', function() {
    $('#info').toggle();
  });

  $('.logout').on('click', function() {
    localStorage.removeItem('credentials');
    window.location = '/';
  });

  $('#supermute').on('click', function() {
    var word = $('#phrase').val();
    var hours = $('#hours :selected').val();
    var url = `set-mute?word=${word}&hours=${hours}&id=${credentials.id_str}&access_token=${credentials.access_token}&access_token_secret=${credentials.access_token_secret}`;
    console.log(url);
    $.get(url).done(function(userdata) {
      renderMutes(userdata.supermutes);
    });
  });
});
