/* Web Lic - Copyright (C) 2019 Remi Gagne */

import _ from './util';
import uiState from './ui_state';
import LanguageList from '../languages/languages.json';

LanguageList.sort((a, b) => {
	if (a.language < b.language) {
		return -1;
	} else if (a.language > b.language) {
		return 1;
	}
	return 0;
});

const tuple = <T extends string[]>(...args: T) => args;
const LocaleList = tuple(...LanguageList.map(e => e.code));
type LocaleType = typeof LocaleList[number];
let currentLocale: LocaleType;

const noTranslateKey = '_tr_';

// TODO: when loading a language, flatten the hierarchy so it doesn't have to be traversed constantly.
// eg: {navbar: {file: {root: 'foo'}}} => {'navbar.file.root': 'foo'}
// And pre-compile any _@mf format strings into lookup functions
// And do all of this at build time, not runtime...

interface LoadedLanguageType {
	[key: string]: any;
}

// Always load English; fall back on this if a different language is missing a key
const loadedLanguages: LoadedLanguageType = {
	en: require('../languages/en.json'),
};

function __tr(locale: string, key: string, args: any[]) {
	let lookup = loadedLanguages[locale];
	const keys = key.split('.');
	for (let i = 0; i < keys.length; i++) {
		const v = keys[i];
		if (v.includes('@')) {
			if (v.endsWith('_@c')) {
				lookup = lookup[v];
				for (let j = 0; j < args.length; j++) {
					lookup = lookup.replace('${' + j + '}', args[j]);
				}
				return lookup;
			} else if (v.endsWith('_@mf')) {
				return _.template(lookup[v])(args[0]);
			} else if (v.endsWith('_@link')) {
				return translateLink(lookup[v], args[0]);
			}
		}
		lookup = lookup[v];
	}
	return lookup;
}

function translateLink(text: string, link: string) {
	const email = '<a href="mailto:lic@bugeyedmonkeys.com" target="_blank">lic@bugeyedmonkeys.com</a>';
	return text
		.replace('$email{}', email)
		.replace('$link{', `<a href="${link}" target="_blank">`)
		.replace('}', '</a>');
}

function translate(key: string, ...args: any[]): string {

	if (key.startsWith(noTranslateKey)) {
		return key.replace(noTranslateKey, '');  // Don't translate these already translated strings
	}

	if (key.startsWith('ctrl+')) {
		return translate('glossary.ctrl') + ' + ' + key.charAt(key.length - 1).toUpperCase();
	}

	let res;
	if (currentLocale && currentLocale !== 'en') {
		try {
			res = __tr(currentLocale, key, args);
		} catch (e) {
			console.log(`Locale ${currentLocale} missing translation key: ${key}`);  // eslint-disable-line no-console, max-len
			res = null;
		}
	}
	if (res == null) {  // If anything goes wrong with the non-english lookup, fallback to english
		try {
			res = __tr('en', key, args);
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

function setLocale(locale: LocaleType) {
	if (locale == null) {
		return;
	}
	currentLocale = locale;
	uiState.set('locale', locale);
	if (!(loadedLanguages.hasOwnProperty(locale))) {
		// TODO: loading languages via require means all languages are included in the compiled bundle,
		// so need to switch to ajax and load only what we need
		loadedLanguages[locale] = require(`../languages/${locale}.json`);
	}
}

function restoreLanguage() {
	setLocale(uiState.get('locale'));
}

function noTranslate(str: string) {
	return noTranslateKey + str;
}

restoreLanguage();

export {
	translate as tr,
	getLocale,
	setLocale,
	LanguageList,
	noTranslate,
};
