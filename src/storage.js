'use strict';

const keys = {
	model: 'lic_model',
	uiDefaults: 'ui_defaults',
	locale: 'locale',
	customFonts: 'custom_fonts'
};

const api = {
	get: {
		model() {
			return localStorage.getItem(keys.model);
		},
		uiDefaults() {
		},
		locale() {
			return localStorage.getItem(keys.locale);
		},
		customFonts() {
			return JSON.parse(localStorage.getItem(keys.customFonts)) || [];
		}
	},
	save: {
		model(model) {
			localStorage.setItem(keys.model, model);
		},
		uiDefaults() {
		},
		locale(locale) {
			localStorage.setItem(keys.locale, locale);
		},
		customFonts(fonts) {
			localStorage.setItem(keys.customFonts, JSON.stringify(fonts));
		}
	},
	// TODO: Should update status bar when stuff is cleared.  Should update status bare more in general.
	clear: {
		model() {
			localStorage.removeItem(keys.model);
		},
		uiDefaults() {
		},
		locale() {
			localStorage.removeItem(keys.locale);
		},
		customFonts() {
			localStorage.removeItem(keys.customFonts);
		},
		everything() {
			localStorage.clear();
		}
	}
};

export default api;
