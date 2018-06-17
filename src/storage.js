'use strict';

import _ from './util';

const keys = {
	model: 'lic_model',
	uiDefaults: 'ui_defaults',
	locale: 'locale',
	customFonts: 'custom_fonts',
	pliTransforms: 'pli_transforms'
};

const api = {
	get: {},
	save: {},
	clear: {
		// TODO: Should update status bar when stuff is cleared.  Should update status bar more in general.
		everything() {
			localStorage.clear();
		}
	}
};

// Add default implementations of 'get', 'save' and 'clear' for each key
_.forEach(keys, (k, v) => {
	api.get[k] = function() {
		var res = localStorage.getItem(v);
		if (res == null) {  // If key is totally null, save and return an empty object instead
			return api.save[k]({});
		}
		return JSON.parse(res);
	};
	api.save[k] = function(json) {
		localStorage.setItem(v, JSON.stringify(json));
		return json;
	};
	api.clear[k] = function() {
		localStorage.removeItem(v);
	};
});

export default api;
