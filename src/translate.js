/* global Vue: false */
'use strict';

import Storage from './storage';
import LanguageList from '../languages/languages.json';

LanguageList.sort((a, b) => {
	if (a.language < b.language) {
		return -1;
	} else if (a.language > b.language) {
		return 1;
	}
	return 0;
});

const loadedLanguages = {};  // key: locale code, value: language
let currentLocale = Storage.get.locale();

loadedLanguages.en = require('../languages/en.json');  // Always load English; fall back on this if a different language is missing a key

if (currentLocale && currentLocale !== 'en') {
	// TODO: loading languages via require means all languages are included in the compiled bundle.  Swith to ajax and load only what we need.
	loadedLanguages[currentLocale] = require(`../languages/${currentLocale}.json`);
}

function translate(key) {
	let value = loadedLanguages[currentLocale] || loadedLanguages.en;
	try {
		key.split('.').forEach(v => (value = value[v]));  // keys missing in chosen language will throw a TypeError; catch that and fall back to English, which has all keys.
	} catch (e) {
		value = loadedLanguages.en;
		key.split('.').forEach(v => (value = value[v]));
	}
	return value;
}

function getLocale() {
	return currentLocale;
}

function setLocale(locale) {
	currentLocale = locale;
	Storage.save.locale(locale);
	if (!(loadedLanguages.hasOwnProperty(locale))) {
		loadedLanguages[locale] = require(`../languages/${locale}.json`);
	}
}

function pickLanguage(app, cb, cb2) {
	if (currentLocale != null) {
		cb();
		return;
	}
	app.currentDialog = 'localeChooserDialog';
	Vue.nextTick(() => {
		const dialog = app.$refs.currentDialog;
		dialog.visible = true;
		dialog.onLanguageChange = cb2;
		dialog.onOK = cb;
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
