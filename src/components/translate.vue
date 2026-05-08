/* Web Lic - Copyright (C) 2019 Remi Gagne */

<template>
	<LicDialog
		:title="t('dialog.locale_chooser.title')"
		width="400px"
	>
		<LicSelect
			id="localeChooserSelect"
			v-model="chosenLocaleCode"
			:options="localeOptions"
			@change="changeLanguage"
		/>
		<template #footer>
			<LicButton type="ok" @click="ok" />
		</template>
	</LicDialog>
</template>

<script lang="ts">

import * as translate from '../translations';
import DialogManager from '../dialog';
import EventBus from '../event_bus';

async function pickLanguage() {
	const currentLocale = translate.getLocale();
	if (currentLocale != null || translate.LanguageList.length < 2) {
		if (currentLocale != null) {
			EventBus.$emit('redraw-ui');
		}
	} else {
		await DialogManager('localeChooserDialog');
	}
}

export default {pickLanguage};

</script>

<script setup lang="ts">

import {ref} from 'vue';
import {tr as t} from '../translations';
import LicDialog from '@/components/base/LicDialog.vue';
import LicButton from '@/components/base/LicButton.vue';
import LicSelect from '@/components/base/LicSelect.vue';

const emit = defineEmits(['close']);

const chosenLocaleCode = ref('en');
const localeOptions = translate.LanguageList.map(item => ({value: item.code, label: item.language}));

function ok() {
	translate.setLocale(chosenLocaleCode.value);
	emit('close');
}

function changeLanguage() {
	translate.setLocale(chosenLocaleCode.value);
	EventBus.$emit('redraw-ui');
}

</script>
