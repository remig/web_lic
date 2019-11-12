/* Web Lic - Copyright (C) 2019 Remi Gagne */

<template>
	<licDialog
		id="locale_chooser_dialog"
		:title="tr('dialog.locale_chooser.title')"
		:modal="true"
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

import DialogManager from '../dialog';
import LanguageList from '../../languages/languages.json';
import EventBus from '../event_bus';
import {translate, setLocale, getLocale, noTranslate} from '../translations';

async function pickLanguage() {
	const currentLocale = getLocale();
	if (currentLocale != null || LanguageList.length < 2) {
		if (currentLocale != null) {
			EventBus.$emit('redraw-ui');
		}
	} else {
		await DialogManager('localeChooserDialog', dialog => {
			dialog.visible = true;
		});
	}
}

export default {
	data() {
		return {
			visible: false,
			chosenLocaleCode: 'en',
			languageList: LanguageList
		};
	},
	methods: {
		ok() {
			this.visible = false;
			setLocale(this.chosenLocaleCode);
			this.$emit('close');
		},
		changeLanguage() {
			setLocale(this.chosenLocaleCode);
			EventBus.$emit('redraw-ui');
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
