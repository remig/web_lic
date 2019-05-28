/* Web Lic - Copyright (C) 2019 Remi Gagne */

<template>
	<licDialog
		id="locale_chooser_dialog"
		:title="tr('dialog.locale_chooser.title')"
		:modal="false"
		:show-close="false"
		:visible="visible"
		width="400px"
	>
		<el-select id="localeChooserSelect" v-model="chosenLocaleCode" @change="changeLanguage">
			<el-option
				v-for="item in languageList"
				:id="`locale_${item.code}`"
				:key="item.code"
				:label="item.language"
				:value="item.code"
			/>
		</el-select>
		<span slot="footer" class="dialog-footer">
			<el-button type="primary" @click="ok()">{{tr('dialog.ok')}}</el-button>
		</span>
	</licDialog>
</template>

<script>

'use strict';

import _ from '../util';
import uiState from '../uiState';
import DialogManager from '../dialog';
import LanguageList from '../../languages/languages.json';

LanguageList.sort((a, b) => {
	if (a.language < b.language) {
		return -1;
	} else if (a.language > b.language) {
		return 1;
	}
	return 0;
});

const noTranslateKey = '_tr_';
const loadedLanguages = {};  // key: locale code, value: language
let currentLocale;

// TODO: when loading a language, flatten the hierarchy so it doesn't have to be traversed constantly.
// eg: {navbar: {file: {root: 'foo'}}} => {'navbar.file.root': 'foo'}
// And pre-compile any _@mf format strings into lookup functions
// And do all of this at build time, not runtime...

// Always load English; fall back on this if a different language is missing a key
loadedLanguages.en = require('../../languages/en.json');

function __tr(key, args, locale) {
	let lookup = loadedLanguages[locale];
	const keys = key.split('.');
	for (let i = 0; i < keys.length; i++) {
		const v = keys[i];
		if (v.includes('@')) {
			if (v.endsWith('_@mf')) {
				return _.template(lookup[v])(args);
			} else if (v.endsWith('_@link')) {
				return translateLink(lookup[v], args);
			}
		}
		lookup = lookup[v];
	}
	return lookup;
}

function translateLink(text, link) {
	const email = '<a href="mailto:lic@bugeyedmonkeys.com" target="_blank">lic@bugeyedmonkeys.com</a>';
	return text
		.replace('$email{}', email)
		.replace('$link{', `<a href="${link}" target="_blank">`)
		.replace('}', '</a>');
}

function translate(key, args) {

	if (key.startsWith(noTranslateKey)) {
		return key.replace(noTranslateKey, '');  // Don't translate these already translated strings
	}

	if (key.startsWith('ctrl+')) {
		return translate('glossary.ctrl') + ' + ' + key.charAt(key.length - 1).toUpperCase();
	}

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
	if (locale == null) {
		return;
	}
	currentLocale = locale;
	uiState.set('locale', locale);
	if (!(loadedLanguages.hasOwnProperty(locale))) {
		// TODO: loading languages via require means all languages are included in the compiled bundle,
		// so need to switch to ajax and load only what we need
		loadedLanguages[locale] = require(`../../languages/${locale}.json`);
	}
}

function restoreLanguage() {
	setLocale(uiState.get('locale'));
}

function pickLanguage(onOk, onLanguageChange) {
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

function noTranslate(str) {
	return noTranslateKey + str;
}

restoreLanguage();

export default {
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
	},
	translate,
	getLocale,
	setLocale,
	pickLanguage,
	LanguageList,
	noTranslate
};

</script>
