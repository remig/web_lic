'use strict';

import _ from './util';
import uiState from './uiState';

const keys = {
	model: 'lic_model',
	ui: 'ui_defaults',
	customFonts: 'custom_fonts'
};

const api = {
	get: {},
	save: {},
	replace: {},
	clear: {}  // TODO: update status bar when stuff is cleared.  Should update status bar more in general
};

// Add default implementations of 'get', 'save' and 'clear' for each key
_.forOwn(keys, (v, k) => {
	api.get[k] = function() {
		const res = localStorage.getItem(v);
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
		_.forOwn(json, (v, k) => {
			target[k] = v;
		});
		api.replace[k](target);
	};
});

api.clear.ui = function() {
	// Don't leave local storage UI state empty; copy default UI state back to local storage.
	api.replace.ui(uiState.getDefaultState());
	uiState.resetUIState();
};

api.clear.everything = function() {
	localStorage.clear();
	api.clear.ui();
};

api.get.customFonts = function() {
	const res = localStorage.getItem(keys.customFonts);
	if (res == null) {  // If key is totally null, save and return an empty array instead
		return api.replace.customFonts([]);
	}
	return JSON.parse(res);
};

export default api;
