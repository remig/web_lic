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
import EventBus from '../event_bus';
import * as translate from '../translations';

async function pickLanguage() {
	const currentLocale = translate.getLocale();
	if (currentLocale != null || translate.LanguageList.length < 2) {
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
			languageList: translate.LanguageList,
		};
	},
	methods: {
		ok() {
			this.visible = false;
			translate.setLocale(this.chosenLocaleCode);
			this.$emit('close');
		},
		changeLanguage() {
			translate.setLocale(this.chosenLocaleCode);
			EventBus.$emit('redraw-ui');
		},
	},
	pickLanguage,
};

</script>
