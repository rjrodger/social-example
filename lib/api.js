"use strict";


var common = require('./common')

var twitter    = common.twitter
var facebook   = common.facebook

var config = common.config



var send_social_msg = {
  twitter: function(user, msg, callback) {
    var conf = {
      consumer_key: config.twitter.key,
      consumer_secret: config.twitter.secret,
      access_token_key: user.key,
      access_token_secret: user.secret
    }
    var twit = new twitter(conf)
        
    var start = new Date()
    twit.updateStatus(msg, function (data) {
      var end = new Date()
      var dur = end.getTime()-start.getTime()
      console.log( 'twitter tweet:'+dur+', '+JSON.stringify(data) )
      callback( data.created_at )
    })
  },

  facebook: function(user, msg, callback) {
    var start = new Date()

    var facebook_client = new facebook.FacebookClient(
      config.facebook.key,
      config.facebook.secret
    )

    facebook_client.getSessionByAccessToken( user.key )(function(facebook_session) {
      facebook_session.graphCall("/me/feed", {message:msg}, 'POST')(function(result) {
        var end = new Date()
        var dur = end.getTime()-start.getTime()
        console.log( 'facebook post:'+dur+', '+JSON.stringify(result))
        callback(!result.error)
      })
    })
  }
}



exports.get_user = function( req, res, next ) {
  var clean_user = {}

  if( req.user ) {
    clean_user.id       = req.user.id
    clean_user.username = req.user.username
    clean_user.service  = req.user.service
  }

  common.util.sendjson(res,clean_user)
}


exports.social_msg = function( req, res, next, when ) {
  var user = req.user
  if( !user ) return common.util.sendcode(400);
  
  if( user.service ) {
    var d = new Date( parseInt(when,10) )

    send_social_msg[user.service]( 
      user, 
      'Burning out on '+d+'! Better get back to work... ', 
      function(ok) {
        common.util.sendjson(res,{ok:ok})
      }
    )
  }
}