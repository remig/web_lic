/* Web Lic - Copyright (C) 2019 Remi Gagne */

import _ from './util';
import uiState from './ui_state';
import LanguageList from '../languages/languages.json';
// TODO: for now, hardcode all known languages. Ugh.
import English from '../languages/en.json';
import French from '../languages/fr.json';
import German from '../languages/de.json';

LanguageList.sort((a, b) => {
	if (a.language < b.language) {
		return -1;
	} else if (a.language > b.language) {
		return 1;
	}
	return 0;
});

let currentLocale: string;

const noTranslateKey = '_tr_';

// TODO: when loading a language, flatten the hierarchy so it doesn't have to be traversed constantly.
// eg: {navbar: {file: {root: 'foo'}}} => {'navbar.file.root': 'foo'}
// And pre-compile any _@mf format strings into lookup functions
// And do all of this at build time, not runtime...

interface LoadedLanguageType {
	[key: string]: any;
}

const loadedLanguages: LoadedLanguageType = {
	en: English,
	fr: French,
	de: German,
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
		} catch {
			console.log(`Locale ${currentLocale} missing translation key: ${key}`);  // eslint-disable-line no-console, max-len
			res = null;
		}
	}
	if (res == null) {  // If anything goes wrong with the non-english lookup, fallback to english
		try {
			res = __tr('en', key, args);
		} catch {
			throw 'Invalid translation key lookup: ' + key;
		}
	}
	if (res == null) {
		throw 'Invalid translation key lookup: ' + key;
	}
	return res;
}

function getLocale() {
	return currentLocale;
}

function setLocale(locale: string) {
	if (locale == null) {
		return;
	}
	currentLocale = locale;
	uiState.set('locale', locale);
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
