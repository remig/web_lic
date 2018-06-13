/* global Vue: false */
'use strict';

import Storage from './storage';
import LanguageList from '../languages/languages.json';

const loadedLanguages = {};  // key: locale code, value: language
let currentLocale = Storage.get.locale();

if (currentLocale == null) {
	loadedLanguages.en = require('../languages/en.json');
} else {
	loadedLanguages[currentLocale] = require(`../languages/${currentLocale}.json`);
}

function translate(key) {
	let value = loadedLanguages[currentLocale] || loadedLanguages.en;
	key.split('.').forEach(v => (value = value[v]));
	return value;
}

function getLocale() {
	return currentLocale;
}

function pickLanguage(app, cb, cb2) {
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
			languageList: this.getLanguages()
		};
	},
	methods: {
		ok() {
			this.visible = false;
			this.setLocale(this.chosenLocaleCode);
			if (typeof this.onOK === 'function') {
				this.onOK();
			}
		},
		changeLanguage() {
			this.setLocale(this.chosenLocaleCode);
			if (typeof this.onLanguageChange === 'function') {
				this.onLanguageChange();
			}
		},
		getLanguages() {
			const languages = Object.entries(LanguageList).map(([k, v]) => ({code: k, language: v}));
			languages.sort((a, b) => {
				return (a.language < b.language)
					? -1
					: ((a.language > b.language) ? 1 : 0);
			});
			return languages;
		},
		setLocale(code) {
			currentLocale = code;
			Storage.save.locale(code);
			if (!(loadedLanguages.hasOwnProperty(code))) {
				loadedLanguages[code] = require(`../languages/${code}.json`);
			}
		}
	}
});

export default {translate, getLocale, pickLanguage};
