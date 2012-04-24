
function FlurryPlugin() {
}


FlurryPlugin.prototype.pageView = function(successCallback, failureCallback) {
  alert('fpv')
  return PhoneGap.exec(
    successCallback,			
    failureCallback,		
    'FlurryPlugin',
    'pageView',		
    []);					
};


PhoneGap.addConstructor(function() {
  PhoneGap.addPlugin('FlurryPlugin', new FlurryPlugin());
});