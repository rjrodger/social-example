"use strict";


var common = require('./common')

var connect    = common.connect
var dispatch   = common.dispatch
var everyauth  = common.everyauth

var DataCapsule = common.DataCapsule


var config = common.config
var api    = common.api



var dc, authcap


function init_datacapsule( callback ) {
  dc = new DataCapsule({})

  dc.capsule( 'internal','user', config.secret, function( err, cap ) {
    if( err) return console.log(err);
    authcap = cap
    callback()
  })
}


function init_connect() {

  var port = process.env.VCAP_APP_PORT || process.env.PORT || parseInt( process.argv[2], 10 )
  var staticFolder = __dirname + '/../site/public'

  console.log('port='+port+' static='+staticFolder)


  function make_promise( user, promise ) {
    authcap.save( user, function( err, user ){
      if( err ) return promise.fail(err)
      promise.fulfill(user)
    })

    return promise
  }

  // turn on to see OAuth flow
  //everyauth.debug = true

  everyauth.everymodule
    .findUserById(function(id,callback){
      authcap.load(id,function( err, user ){
        if( err ) return callback(err);
        callback(null,user)
      })
    })
    .moduleErrback( function (err, data) {
      if( err ) console.dir(err);
      throw err;
    })

  everyauth.twitter
    .consumerKey( config.twitter.key )
    .consumerSecret( config.twitter.secret )
    .findOrCreateUser( function (session, accessToken, accessTokenSecret, twitterUserMetadata) {

      var user = { 
        id:'tw-'+twitterUserMetadata.id, 
        username: twitterUserMetadata.screen_name, 
        service:'twitter',
        key:accessToken,
        secret:accessTokenSecret
      }

      return make_promise( user, this.Promise() )
    })
    .redirectPath('/')


  everyauth.facebook
    .appId( config.facebook.key )
    .appSecret( config.facebook.secret )
    .findOrCreateUser( function (session, accessToken, accessTokenExtra, fbUserMetadata) {

      var user = { 
        id:'fb-'+fbUserMetadata.id, 
        username: fbUserMetadata.username, 
        service:'facebook',
        key:accessToken
      }

      return make_promise( user, this.Promise() )
    })
    .mobile(true)
    .scope('publish_stream,email')
    .redirectPath('/')


  var server = connect.createServer(
    //connect.logger(),
    connect.bodyParser(),
    connect.cookieParser(),
    connect.query(),
    connect.session({secret: config.secret}),

    everyauth.middleware(),
    dc.middleware(),

    dispatch({
      '/user': {
        GET: api.get_user,
        '/socialmsg/:when': {
          POST: api.social_msg
        }
      }
    }),

    function(req,res,next){
      if( 0 === req.url.indexOf('/api/ping') ) {
        console.log(req.url+': '+JSON.stringify(req.query))
        res.writeHead(200)
        res.end( JSON.stringify({ok:true,time:new Date()}) )
      }
      else next();
    },
    
    connect.static( staticFolder )
  )

  server.listen( port )
}


function start() {
  init_datacapsule(init_connect)
}

exports.start = start

if( 0 < process.argv[1].indexOf('server.js') ) {
  start()
}

