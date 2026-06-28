/* Web Lic - Copyright (C) 2019 Remi Gagne */

<template>
	<LicDialog id="locale_chooser_dialog" :title="t('dialog.locale_chooser.title')" width="400px">
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

<script setup lang="ts">
import { ref } from 'vue';

import LicButton from '@/components/base/LicButton.vue';
import LicDialog from '@/components/base/LicDialog.vue';
import LicSelect from '@/components/base/LicSelect.vue';

import EventBus from '../event_bus';
import { LanguageList, setLocale, t } from '../translations';

const emit = defineEmits<{ (e: 'ok'): void }>();

const chosenLocaleCode = ref('en');
const localeOptions = LanguageList.map((item) => ({
	value: item.code,
	label: item.language,
}));

function ok() {
	setLocale(chosenLocaleCode.value);
	emit('ok');
}

function changeLanguage() {
	setLocale(chosenLocaleCode.value);
	EventBus.emit('redraw-ui', {});
}
</script>
