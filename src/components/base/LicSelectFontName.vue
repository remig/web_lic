/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<div class="lic-select-font-name">
		<LicSelect :value="currentValue" :options="options" @change="handleChange" />
		<LicDialog
			v-if="showDialog"
			:title="t('dialog.custom_font.title')"
			width="630px"
		>
			<div style="--label-width: 160px">
				<label class="label-input-row">
					{{t('dialog.custom_font.name_input')}}
					<input
						v-model="dialogFontName"
						class="form-control"
					>
				</label>
				<div class="label-input-row">
					{{t('dialog.custom_font.sample_text')}}
					<div :style="{fontFamily: dialogFontName}" class="fontNameDisplay">
						{{t('dialog.custom_font.sample_characters')}}
					</div>
				</div>
			</div>
			<template #footer>
				<LicButton type="cancel" @click="onCancel" />
				<LicButton type="ok" @click="onOk" />
			</template>
		</LicDialog>
	</div>
</template>

<script setup lang="ts">
import {ref, computed, watch} from 'vue';
import {tr as t} from '@/translations';
import Storage from '@/storage';
import LicSelect from './LicSelect.vue';
import LicDialog from './LicDialog.vue';
import LicButton from './LicButton.vue';

const BASE_FAMILIES = ['Helvetica', 'Times New Roman'];

function getFamilyNames(): string[] {
	return [...BASE_FAMILIES, ...Storage.get.customFonts(), 'Custom...'];
}

function addCustomFont(family: string) {
	if (!family) {
		return;
	}
	const customs = Storage.get.customFonts();
	const lower = family.toLowerCase();
	const all = [...BASE_FAMILIES, ...customs].map(f => f.toLowerCase());
	if (!all.includes(lower)) {
		customs.push(family);
		Storage.replace.customFonts(customs);
	}
}

const props = defineProps<{
	modelValue?: string;
	value?: string;
}>();

const emit = defineEmits(['update:modelValue', 'input', 'change']);

const showDialog = ref(false);
const options = ref(getFamilyNames().map(f => ({value: f, label: f})));
const dialogFontName = ref('');

const currentValue = computed(() => props.modelValue ?? props.value ?? '');

let lastFamily = currentValue.value;

watch(currentValue, newVal => {
	if (newVal && newVal !== 'Custom...') {
		lastFamily = newVal;
		addCustomFont(newVal);
		options.value = getFamilyNames().map(f => ({value: f, label: f}));
	}
}, {immediate: true});

function handleChange(newFamily: string) {
	if (newFamily === 'Custom...') {
		dialogFontName.value = '';
		showDialog.value = true;
	} else {
		lastFamily = newFamily;
		emit('update:modelValue', newFamily);
		emit('input', newFamily);
		emit('change', newFamily);
	}
}

function onOk() {
	const fontName = dialogFontName.value;
	addCustomFont(fontName);
	options.value = getFamilyNames().map(f => ({value: f, label: f}));
	emit('update:modelValue', fontName);
	emit('input', fontName);
	emit('change', fontName);
	showDialog.value = false;
}

function onCancel() {
	emit('update:modelValue', lastFamily);
	emit('input', lastFamily);
	showDialog.value = false;
}

</script>

<style>

.fontNameDisplay {
	line-height: 15px;
}

</style>
