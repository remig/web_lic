/* Web Lic - Copyright (C) 2018 Remi Gagne */

import uiState from './ui_state';

enum StorageKeys {
	model = 'lic_model',
	ui = 'ui_defaults',
	customFonts = 'custom_fonts',
	customBrickColors = 'custom_brick_colors'
}

interface ColorTable {
	[k: number]: ColorTableEntry
}

interface API {
	initialize(defaultState: object): void;
	get: {
		model(): any,
		ui: any,
		customFonts: any,
		customBrickColors(): ColorTable
	};
	replace: any;
	clear: any;
}

const api: API = {
	// TODO: Do *NOT* assume local storage always contains default UI settings.
	// If localStorage is wiped mid-model edit, Lic should not crash.
	initialize(defaultState: object) {
		if (localStorage.length === 0 || localStorage.getItem(StorageKeys.ui) == null) {
			localStorage.setItem(StorageKeys.ui, JSON.stringify(defaultState));
		}
	},
	get: {
		model: createGet(StorageKeys.model),
		ui: createGet(StorageKeys.ui),
		customFonts() {
			const res = localStorage.getItem(StorageKeys.customFonts);
			if (res == null) {  // If key is totally null, save and return an empty array instead
				return api.replace.customFonts([]);
			}
			return JSON.parse(res);
		},
		customBrickColors() {
			const res = localStorage.getItem(StorageKeys.customBrickColors);
			if (res == null) {  // If key is totally null, save and return an empty array instead
				return api.replace.customBrickColors({});
			}
			return JSON.parse(res);
		},
	},
	replace: {
		model: createReplace(StorageKeys.model),
		ui: createReplace(StorageKeys.ui),
		customFonts: createReplace(StorageKeys.customFonts),
		customBrickColors: createReplace(StorageKeys.customBrickColors),
	},
	clear: {
		// TODO: update status bar when stuff is cleared.  Should update status bar more in general
		model: createClear(StorageKeys.model),
		customFonts: createClear(StorageKeys.customFonts),
		customBrickColors: createClear(StorageKeys.customBrickColors),
		ui: function() {
			// Don't leave local storage UI state empty; copy default UI state back to local storage.
			api.replace.ui(uiState.getDefaultState());
			uiState.resetUIState();
		},
		everything() {
			localStorage.clear();
			api.clear.ui();
		},
	},
};

function createGet(k: StorageKeys) {
	return function get() {
		return JSON.parse(localStorage.getItem(k) || 'null');
	};
}

// Replace entire object in cache with passed in object
function createReplace(k: StorageKeys) {
	return function(json: object) {
		try {
			localStorage.setItem(k, JSON.stringify(json));
		} catch (e) {
			if (e && e.name === 'QuotaExceededError') {
				// TODO: use compression to save this giant state
				return json;
			}
		}
		return json;
	};
}

function createClear(k: StorageKeys) {
	return function() {
		localStorage.removeItem(k);
	};
}

export default api;
