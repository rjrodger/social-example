package org.apache.cordova.plugins.flurry;

import org.json.JSONArray;


import com.phonegap.api.Plugin;
import com.phonegap.api.PluginResult;


import com.flurry.android.FlurryAgent;


public class FlurryPlugin extends Plugin {

	
	@Override
	public PluginResult execute(String action, JSONArray data, String callbackId) {
		PluginResult result = null;
		try {
			if ("pageView".equals(action)) {
				FlurryAgent.onPageView();
				result = new PluginResult(PluginResult.Status.OK);
			}
		} 
		catch (Exception e) {
			result = new PluginResult(PluginResult.Status.JSON_EXCEPTION);
		}			
		return result;
	}

}
