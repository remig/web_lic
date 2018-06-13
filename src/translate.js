'use strict';

import defaultLanguage from '../languages/en.json';

const languages = {
	en: defaultLanguage,
	default: defaultLanguage
};

const language = defaultLanguage;

function translate(key) {
	let value = language;
	key.split('.').forEach(v => (value = value[v]));
	return value;
}

function setLanguage(language) {
}

export {translate, setLanguage};
