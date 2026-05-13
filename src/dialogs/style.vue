/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<LicDialog
		:title="title"
		class="styleDialog"
		width="500px"
	>
		<div style="--label-width: 80px">
			<label class="label-input-row">
				{{t('dialog.style.label_text')}}
				<textarea v-model="text" rows="2" class="form-control" />
			</label>
			<div class="label-input-row">
				{{t('glossary.font')}}
				<div class="flex-row">
					<LicSelectFontName v-model="family" />
					<button
						type="button"
						:class="['lic-toggle-btn', { active: bold }]"
						@click="bold = !bold"
					>
						<strong>B</strong>
					</button>
					<button
						type="button"
						:class="['lic-toggle-btn', { active: italic }]"
						@click="italic = !italic"
					>
						<em>I</em>
					</button>
				</div>
			</div>
			<label class="label-input-row">
				{{t('glossary.font_size')}}
				<input
					v-model.number="size"
					type="number"
					min="0"
					class="form-control size-input"
				>
			</label>
			<div class="label-input-row">
				{{t('glossary.color')}}
				<LicColorPicker v-model="color" show-alpha />
			</div>
		</div>
		<template #footer>
			<LicButton type="cancel" @click="emit('close')" />
			<LicButton type="ok" @click="ok" />
		</template>
	</LicDialog>
</template>

<script setup lang="ts">

import {ref} from 'vue';
import {t} from '@/translations';
import LicDialog from '@/components/base/LicDialog.vue';
import LicButton from '@/components/base/LicButton.vue';
import LicColorPicker from '@/components/base/LicColorPicker.vue';
import LicSelectFontName from '@/components/base/LicSelectFontName.vue';
import _ from '../util';

const emit = defineEmits(['ok', 'close']);

const title = ref(t('dialog.style.title'));
const text = ref('');
const color = ref('');
const font = ref('');
const family = ref('');
const size = ref(0);
const bold = ref(false);
const italic = ref(false);
const underline = ref(false);

function show() {
	color.value = _.color.toRGB(color.value).toString();
	const fontParts = _.fontToFontParts(font.value);
	family.value = fontParts.fontFamily ?? '';
	size.value = parseInt(fontParts.fontSize ?? '0', 10);
	bold.value = fontParts.fontWeight === 'bold';
	italic.value = fontParts.fontStyle === 'italic';
	underline.value = false;
}

function ok() {
	emit('ok', {
		text: text.value,
		font: _.fontPartsToFont({
			fontSize: size.value + 'pt',
			fontFamily: family.value,
			fontWeight: bold.value ? 'bold' : '',
			fontStyle: italic.value ? 'italic' : '',
		}) ?? '',
		color: color.value,
	});
	emit('close');
}

defineExpose({title, text, color, font, show});

</script>

<style>

.styleDialog .size-input {
	width: 75px;
}

</style>
