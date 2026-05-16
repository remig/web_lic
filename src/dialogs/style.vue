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
			<LicButton type="cancel" @click="emit('cancel')" />
			<LicButton type="ok" @click="ok" />
		</template>
	</LicDialog>
</template>

<script setup lang="ts">

import {t} from '@/translations';
import {ref} from 'vue';

import LicButton from '@/components/base/LicButton.vue';
import LicColorPicker from '@/components/base/LicColorPicker.vue';
import LicDialog from '@/components/base/LicDialog.vue';
import LicSelectFontName from '@/components/base/LicSelectFontName.vue';

import _ from '../util';

interface StyleResult {
	text: string;
	font: string;
	color: string;
}

const props = defineProps<{title: string; text: string; color: string; font: string}>();
const emit = defineEmits<{(e: 'ok', v: StyleResult): void; (e: 'cancel'): void}>();

const fontParts = _.fontToFontParts(props.font);
const text = ref(props.text);
const color = ref(_.color.toRGB(props.color).toString());
const family = ref(fontParts.fontFamily ?? '');
const size = ref(parseInt(fontParts.fontSize ?? '0', 10));
const bold = ref(fontParts.fontWeight === 'bold');
const italic = ref(fontParts.fontStyle === 'italic');

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
}

</script>

<style>

.styleDialog {
	.size-input {
		width: 75px;
	}
}

</style>
