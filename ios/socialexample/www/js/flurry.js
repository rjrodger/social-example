FlurryPlugin = function()
{
    
};
FlurryPlugin.prototype.pageView = function()
{
  alert('lpv')
    PhoneGap.exec(null,null,"FlurryPlugin","logPageView",[]);
};
FlurryPlugin.prototype.logEvent = function(name)
{
    PhoneGap.exec(null,null,"FlurryPlugin","logEvent",[name]);
};

PhoneGap.addConstructor(function() 
{
    if(!window.plugins)
    {
        window.plugins = {};
    }
    window.plugins.FlurryPlugin = new FlurryPlugin();
});
