

function DataCapsule( opt ) {
  var self = {}

  var prefix = opt.prefix
  var acc    = opt.acc
  var coll   = opt.coll
  var spec   = opt.spec

  var store = localStorage
  var rest_base = prefix+'/rest/'+acc+'/'+coll+'/'+spec
  var sync_base = prefix+'/sync/'+acc+'/'+coll+'/'+spec


  self.item_ids = []
  self.index = {}
  self.version = -1
  self.changes = {}


  var load_item = function(id) {
    var item = self.index[id]

    if( !item ) {
      var key = self.key(id)
      var itemstr = store.getItem(key)
      item = ( itemstr && JSON.parse(itemstr) ) || null
      item && ( self.index[id] = item )
    }

    return item
  }
  

  self.key = function( id ) {
    return acc+'~'+coll+'~'+spec+'~'+id
  }

  var ids_key     = self.key('~ids')
  var changes_key = self.key('~changes')
  var version_key = self.key('~version')
  

  self.init = function(cb) {
    self.item_ids = JSON.parse( store.getItem(ids_key) || '[]' )
    self.changes  = JSON.parse( store.getItem(changes_key) || '{}' )
    self.version  = parseInt( store.getItem(version_key), 10 )
    if( isNaN(self.version) ) {
      self.version = -1
    }
    cb && cb()
  }

  
  self.change = function( id, act ) {
    var prev = self.changes[id]
    if( prev ) {
      if( 'MOD' === act ) {
        if( 'ADD' === prev ) {
          act = 'ADD'
        }
      }
    }

    self.changes[id] = act

    store.setItem(changes_key,JSON.stringify(self.changes))
  }


  self.cancelchange = function(id) {
    delete self.changes[id]
    store.setItem(changes_key,JSON.stringify(self.changes))
  }
  
  self.sync = function(cb) {
    http.get(sync_base+'/version',function(res){
      if( self.version < res.version ) {
        http.get(sync_base+'/updates/'+self.version,function(update_res){
          var update_ids = []

          function setitem(i) {
            if( i < update_res.updates.length ) {
              var act  = update_res.updates[i].act
              var item = update_res.updates[i].item
              item.act$ = act

              if( 'DEL' == act ) {
                self.remove(item,function(){ setitem(i+1) })
              }
              else {
                self.save(item,function(){ setitem(i+1) })
              }
            }
            else {
              upload(res,update_ids)
            }
          }
          setitem(0)
        })
      }
      else {
        // upload if self.changes not empty
        for( var c in self.changes ) {
          upload(res,[])
          break;
        }
      }
    })

    function upload( res, update_ids ) {
      for( var i = 0; i < update_ids.length; i++ ) {
        var id = update_ids[i]
        self.cancelchange(id)
      }

      var change_ids = []
      for( var id in self.changes ) {
        change_ids.push(id)
      }
      
      var server_ids = {}

      function senditem(i) {
        if( i < change_ids.length ) {
          var id  = change_ids[i]
          var act = self.changes[id]

          function nextitem() {
            self.cancelchange(id)
            senditem(i+1)
          }

          var item = load_item(id)

          if( 'ADD' == act ) {
            delete item.id
            http.post(rest_base,item,function(server_item){
              server_ids[id] = server_item.id
              item.act$ = 'DEL'
              item.id = id
              self.remove(item,function(err,item){
                if( err ) return console.log(err);
                self.cancelchange(id)
                server_item.act$ = 'ADD'
                self.save(server_item,nextitem)
              })
            })
          }
          else if( 'MOD' == act ) {
            http.put(rest_base+'/'+id,item,nextitem)
          }
          else if( 'DEL' == act ) {
            http.del(rest_base+'/'+id,nextitem)
          }
        }
        else {
          self.version = res.version
          store.setItem(version_key,''+self.version)
          store.setItem(ids_key,JSON.stringify(self.item_ids))
          var out = {down:update_ids,up:change_ids,ids:server_ids,version:self.version}
          cb && cb(out)
        }
      }
      senditem(0)
    }
  }


  self.load = function( query, cb ) {
    var id = query
    if( 'string' != typeof(query) ) {
      id = query.id
    }

    var item = load_item(id)

    cb(null,item)
  }
  

  self.save = function( item, cb ) {
    var act = 'MOD'

    if( !item.id || 'ADD' === item.act$ ) {
      if( !item.id ) { 
        item.id = ( opt.makeid && opt.makeid(item) ) || ''+Math.random()
        act = 'ADD'
      }
      if( !self.index[item.id] ) {
        self.item_ids.push(item.id)
      }
    }

    var key = self.key(item.id)

    if( item.act$ ) {
      delete item.act$
    }
    else {
      self.change(item.id,act)
    }

    var itemstr = JSON.stringify(item)
    store.setItem(key,itemstr)

    store.setItem(ids_key,JSON.stringify(self.item_ids))

    self.index[item.id] = item

    cb(null,item)
  }

  
  self.remove = function( item, cb ) {
    var old = load_item(item.id)

    if( old ) {
      delete self.index[item.id]

      for( var i = 0; i < self.item_ids.length; i++ ) {
        if( self.item_ids[i] === item.id ) {
          self.item_ids.splice(i, 1)
          break
        }
      }

      if( item.act$ ) {
        delete item.act$
      }
      else {
        self.change(item.id,'DEL')
      }

      var key = self.key(item.id)
      store.removeItem(key)

      store.setItem(ids_key,JSON.stringify(self.item_ids))
    }

    cb(null,old)
  }


  self.list = function( query, cb ) {
    var items = []

    function getitem(i) {
      if( i < self.item_ids.length) {
        self.load( self.item_ids[i], function(err,item) {
          if( err ) return console.log(err);
          items.push(item)
          getitem(i+1)
        })
      }
      else {
        cb(null,items)
      }
    }
    getitem(0)
  }

  return self
}
