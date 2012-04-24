

var MONTH = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

var app = {
  model: {},
  view: {},

  social: [{name:'twitter'},{name:'facebook'}],
    
  util: {
    ym: function(monthspec) {
      var month = monthspec % 100
      var year  = (monthspec - month) / 100
      return [year,month]
    },
    monthend: function(monthspec) {
      var ym = app.util.ym(monthspec)
      return new Date(ym[0],ym[1]-1,31)
    },
    incmonth: function(monthspec) {
      var ym = app.util.ym(monthspec)
      ym[1]++
      if( 12 < ym[1] ) {
        ym[0]++
        ym[1] = 1
      }
      return (ym[0]*100)+ym[1]
    },
    thismonth: function() {
      var d = new Date()
      return (d.getFullYear()*100)+d.getMonth()+1
    },
    formatmonth: function(monthspec) {
      var ym = app.util.ym(monthspec)
      return MONTH[ym[1]-1]+' '+ym[0]
    }
  }
}

var bb = {
  model: {},
  view: {}
}


bb.init = function() {

  bb.model.State = Backbone.Model.extend({    
    initialize: function( items ) {
      var self = this
      _.bindAll(self)
      self.on('entry-update',self.calcdeath)
    },

    init: function(){
      var self = this
      var death = new Date()
      self.set({death:death})
    },

    calcdeath: function(){
      var self = this
      var death = new Date()
      self.sortlist(function(list){
        var balance = 0
        var last_income = 0
        var last_expend = 0
        var last_month_date
        var last_type

        for( var i = 0; i < list.length; i++ ) {
          var entry = list[i]

          balance += (('expend'==entry.type?-1:1) * entry.amount)

          if( last_type == entry.type ) {
            balance += (('expend'==last_type?1:-1) * ('expend'==last_type?last_income:last_expend))
          }

          if( balance <= 0 ) {
            death = app.util.monthend(entry.month)
            self.set({death:death})
            break
          }

          last_month_date = app.util.monthend(entry.month)
          last_type = entry.type

          if( 'expend'==entry.type ) {
            last_expend = entry.amount
          }
          else {
            last_income = entry.amount
          }


        }

        if( 0 < balance ) {
          var maxmillislife = 5 * 365 * 24 * 60 * 60 * 1000
          var millislife = maxmillislife

          if( last_income < last_expend ) {
            var coverm = balance / (last_expend-last_income);
            var millislife = Math.min(maxmillislife,coverm * 30 * 24 * 60 * 60 * 1000)
          }
        
          death = last_month_date ? new Date( last_month_date.getTime()+millislife ) : death
          self.set({death:death})
        }

      })
    },

    sortlist: function(cb) {
      app.dc.list({},function(err,list){
        if( err ) return console.log(err);
        list.sort(function(a,b){
          if( a.month == b.month ) {
            return 'income'==a.type?-1:1;
          }
          else return a.month - b.month;
        })

        cb( list )
      })
    }
  })


  bb.view.Header = Backbone.View.extend({    
    initialize: function( items ) {
      var self = this
      _.bindAll(self)

      self.elem = {
        login_btn: $('#header_login'),
        logout_btn: $('#header_logout')
      }

      app.model.state.on('change:user',self.render)
    },

    render: function() {
      var self = this

      var user = app.model.state.get('user')
      
      if( user ) {
        self.elem.login_btn.hide()
        self.elem.logout_btn.show()
      }
      else {
        self.elem.login_btn.show()
        self.elem.logout_btn.hide()
      }
    }
  })


  bb.view.SocialMsg = Backbone.View.extend({    
    initialize: function( items ) {
      var self = this
      _.bindAll(self)

      self.elem = {msg:{}}
      app.social.forEach(function(service){
        self.elem.msg[service.name] = $('#social_msg_'+service.name)
        self.elem.msg[service.name].tap(function(){
          self.socialmsg(service)
        })
      })

      app.model.state.on('change:user',self.render)
    },

    render: function() {
      var self = this

      var user = app.model.state.get('user')
      app.social.forEach(function(service){
        var btn = self.elem.msg[service.name].show()

        if( user && user.service === service.name ) {
          btn.show()
        }
        else {
          btn.hide()
        }
      })
    },

    socialmsg: function( service ) {
      console.log(service.name)

      var death = app.model.state.get('death')

      http.post('/user/socialmsg/'+death.getTime(),{},function(res){
        alert( res.ok ? 'Message sent!' : 'Unable to send message.')
      })
    }
  })



  bb.view.Clock = Backbone.View.extend({    
    initialize: function( items ) {
      var self = this
      _.bindAll(self)

      app.model.state.on('change:death',self.render)
    },

    render: function() {
      var death = app.model.state.get('death')

      $('#deathbg1').show();
      $('#death').countdown('destroy');
      $('#death').countdown({until: death, format:'yowdhms', compact:false, layout:$('#ymwd_tm').html()});
      $('#death1').countdown('destroy');
      $('#death1').countdown({until: death, format:'yowdhms', compact:false, layout:$('#hms_tm').html()});
    }
  })


  bb.view.EntryList = Backbone.View.extend({    
    initialize: function( type ) {
      var self = this
      _.bindAll(self)

      $('#'+type+'_more').tap(function(){self.addmonth()})

      self.elem = {
        list: $('#'+type+'_list'),
        entry_tm: $('#entry_tm'),
      }

      self.type = type

      app.model.state.on('entry-update',self.render)
    },

    render: function() {
      var self = this

      app.model.state.sortlist(function(list){
        self.elem.list.empty().hide()

        for( var i = 0; i < list.length; i++ ) {
          var entry = list[i]
          if( entry.type === self.type ) {
            app.view[entry.type].rendermonth(entry)
          }
        }

        self.elem.list.show()
      })
    },


    addmonth: function( entry ) {
      var self = this

      if( !entry ) {
        if( self.last ) { 
          entry = {month:app.util.incmonth(self.last.month),amount:0,type:self.type}
        }
        else {
          return;
        }
      }

      app.dc.save(entry,function(err,entry){
        if( err) return console.log(err);

        self.render()
        app.model.state.trigger('entry-update')
      })
    },

    rendermonth: function( entry ) {
      var self = this

      var entry_div = self.elem.entry_tm.clone()
      entry_div.find('.monthentry').text( app.util.formatmonth(entry.month) )
      var input_amount = entry_div.find('.amount')

      input_amount.val(entry.amount).attr({id:self.type+'_'+entry.id}).blur(function(event){

        app.dc.load(entry.id, function(err,entry) {
          if( err) return console.log(err);

          entry.amount = parseInt(input_amount.val(),10)

          if( isNaN(entry.amount) ) {
            entry.amount = 0
            input_amount.val(0)
          }

          app.dc.save(entry,function(err,entry){
            if( err) return console.log(err);

            self.rendermonth( entry )
            app.model.state.trigger('entry-update')
            app.dc.sync()
          })
        })
      })

      self.elem.list.append(entry_div.children()).trigger("create")
      self.last = entry
    }
  })
}


app.boot = function() {

}

app.start = function() {
  var trigger_entry_update = function(){app.model.state.trigger('entry-update')}
  app.dc.init(trigger_entry_update)

  if( !localStorage.installtime ) {
    localStorage.installtime = ''+new Date().getTime()

    var thismonth = app.util.thismonth()
    var nextmonth = app.util.incmonth( thismonth )

    app.view.income.addmonth({month:thismonth,amount:30000,type:'income'})
    app.view.income.addmonth({month:nextmonth,amount:0,type:'income'})
    app.view.expend.addmonth({month:thismonth,amount:10000,type:'expend'})
  }

  http.get('/user',function(user){
    if( user.id ) {
      app.model.state.set({user:user})
    }
  })

  app.dc.sync(trigger_entry_update)

  setInterval(function(){
    app.dc.sync(trigger_entry_update)
  },60000)

  $(document).bind("pagechange", function(){
    app.dc.sync(trigger_entry_update)
  })
}

app.erroralert = function( error ) {
  alert(error)
}


app.init = function() {
  app.dc = new DataCapsule({
    prefix:'capsule',
    acc:'001',
    coll:'entry',
    spec:'app=sdc',
    makeid: function(item) {
      return item.month+'_'+item.type
    }
  })


  bb.init()

  app.model.state = new bb.model.State()
  app.model.state.init()

  app.view.clock = new bb.view.Clock()
  app.view.clock.render()

  app.view.header    = new bb.view.Header()

  app.view.socialmsg = new bb.view.SocialMsg()
  app.view.socialmsg.render()

  app.view.income = new bb.view.EntryList('income')
  app.view.expend = new bb.view.EntryList('expend')

  app.start()
}


app.boot()
$(app.init)
