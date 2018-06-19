'use strict';

import _ from './util';
import uiDefaultState from './uiState';

const keys = {
	model: 'lic_model',
	ui: 'ui_defaults',
	locale: 'locale',
	customFonts: 'custom_fonts',
	pliTransforms: 'pli_transforms'
};

const api = {
	get: {},
	save: {},
	replace: {},
	clear: {}  // TODO: Should update status bar when stuff is cleared.  Should update status bar more in general.
};

// Add default implementations of 'get', 'save' and 'clear' for each key
_.forEach(keys, (k, v) => {
	api.get[k] = function() {
		var res = localStorage.getItem(v);
		if (res == null) {  // If key is totally null, save and return an empty object instead
			return api.replace[k]({});
		}
		return JSON.parse(res);
	};
	api.replace[k] = function(json) {  // Replace entire object in cache with passed in object
		localStorage.setItem(v, JSON.stringify(json));
		return json;
	};
	api.clear[k] = function() {
		localStorage.removeItem(v);
	};
	api.save[k] = function(json) {  //  Set only the properties in json in the cached object
		const target = api.get[k](v);
		_.forEach(json, (k, v) => {
			target[k] = v;
		});
		api.replace[k](target);
	};
});

api.clear.ui = function() {
	api.replace.ui(uiDefaultState);
};

api.clear.everything = function() {
	localStorage.clear();
	api.replace.ui(uiDefaultState);  // Still need default UI state
};

export default api;
