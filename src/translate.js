/* global Vue: false */
'use strict';

import _ from './util';
import uiState from './uiState';
import LanguageList from '../languages/languages.json';
import DialogManager from './dialog';

LanguageList.sort((a, b) => {
	if (a.language < b.language) {
		return -1;
	} else if (a.language > b.language) {
		return 1;
	}
	return 0;
});

const loadedLanguages = {};  // key: locale code, value: language
let currentLocale;

// TODO: when loading a language, flatten the hierarchy so it doesn't have to be traversed constantly.
// eg: {navbar: {file: {root: 'foo'}}} => {'navbar.file.root': 'foo'}
// And pre-compile any _@mf format strings into lookup functions
// And do all of this at build time, not runtime...

// Always load English; fall back on this if a different language is missing a key
loadedLanguages.en = require('../languages/en.json');

function __tr(key, args, locale) {
	let lookup = loadedLanguages[locale];
	const keys = key.split('.');
	for (let i = 0; i < keys.length; i++) {
		const v = keys[i];
		if (v.endsWith('_@mf')) {
			return _.template(lookup[v])(args);
		}
		lookup = lookup[v];
	}
	return lookup;
}

function translate(key, args) {
	let res;
	if (currentLocale && currentLocale !== 'en') {
		try {
			res = __tr(key, args, currentLocale);
		} catch (e) {
			console.log(`Locale ${currentLocale} missing translation key: ${key}`);  // eslint-disable-line no-console, max-len
			res = null;
		}
	}
	if (res == null) {  // If anything goes wrong with the non-english lookup, fallback to english
		try {
			res = __tr(key, args, 'en');
		} catch (e) {
			throw 'Invalid key lookup: ' + key;
		}
	}
	if (res == null) {
		throw 'Invalid key lookup: ' + key;
	}
	return res;
}

function getLocale() {
	return currentLocale;
}

function setLocale(locale) {
	currentLocale = locale;
	uiState.set('locale', locale);
	if (!(loadedLanguages.hasOwnProperty(locale))) {
		loadedLanguages[locale] = require(`../languages/${locale}.json`);
	}
}

function pickLanguage(onOk, onLanguageChange) {

	currentLocale = uiState.get('locale');
	if (currentLocale && currentLocale !== 'en') {
		// TODO: loading languages via require means all languages are included in the compiled bundle,
		// so need to switch to ajax and load only what we need
		loadedLanguages[currentLocale] = require(`../languages/${currentLocale}.json`);
	}

	if (currentLocale != null || LanguageList.length < 2) {
		onOk();
		if (currentLocale != null) {
			onLanguageChange();
		}
		return;
	}
	DialogManager('localeChooserDialog', dialog => {
		dialog.visible = true;
		dialog.onLanguageChange = onLanguageChange;
		dialog.onOK = onOk;
	});
}

Vue.component('localeChooserDialog', {
	template: '#localeChooserDialogTemplate',
	data() {
		return {
			visible: false,
			onOK: null,
			onLanguageChange: null,
			chosenLocaleCode: 'en',
			languageList: LanguageList
		};
	},
	methods: {
		ok() {
			this.visible = false;
			setLocale(this.chosenLocaleCode);
			if (typeof this.onOK === 'function') {
				this.onOK();
			}
		},
		changeLanguage() {
			setLocale(this.chosenLocaleCode);
			if (typeof this.onLanguageChange === 'function') {
				this.onLanguageChange();
			}
		}
	}
});

export default {translate, getLocale, setLocale, pickLanguage, LanguageList};
