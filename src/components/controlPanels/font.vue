/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<panel-base title="glossary.font" style="--label-width: 70px">
		<div class="panel-row">
			<LicSelectFontName v-model="family" @change="updateValues" />
		</div>
		<div class="panel-row flex-row">
			<button
				type="button"
				:class="['lic-toggle-btn', { active: bold }]"
				@click="bold = !bold; updateValues()"
			>
				<strong>{{t('template.font.bold_character')}}</strong>
			</button>
			<button
				type="button"
				:class="['lic-toggle-btn', { active: italic }]"
				@click="italic = !italic; updateValues()"
			>
				<em>{{t('template.font.italic_character')}}</em>
			</button>
			<!-- <button
				type="button"
				:class="['lic-toggle-btn', { active: underline }]"
				@click="underline = !underline; updateValues()"
			>
				<u>{{t('template.font.underline_character')}}</u>
			</button> -->
		</div>
		<label class="label-input-row">
			{{t('glossary.size')}}
			<input
				v-model.number="size"
				type="number"
				min="0"
				class="form-control"
				@input="updateValues"
			>
		</label>
		<div class="label-input-row">
			{{t('glossary.color')}}
			<LicColorPicker v-model="color" show-alpha @change="updateValues" />
		</div>
	</panel-base>
</template>

<script setup lang="ts">

import {ref} from 'vue';
import {t} from '@/translations';
import _ from '../../util';
import store from '../../store';
import PanelBase from './panel_base.vue';
import LicColorPicker from '../base/LicColorPicker.vue';
import LicSelectFontName from '../base/LicSelectFontName.vue';

// TODO: support underlining fonts in general

const props = defineProps<{templateEntry: string}>();
const emit = defineEmits(['new-values']);

const template = _.get(store.state.template, props.templateEntry);
const fontParts = _.fontToFontParts(template.font);

const family = ref(fontParts.fontFamily ?? '');
const size = ref(parseInt(fontParts.fontSize ?? '0', 10));
const bold = ref(fontParts.fontWeight === 'bold');
const italic = ref(fontParts.fontStyle === 'italic');
const color = ref(template.color);

function updateValues() {
	const tpl = _.get(store.state.template, props.templateEntry);
	tpl.font = _.fontString({size: size.value, family: family.value, bold: bold.value, italic: italic.value});
	tpl.color = color.value;
	emit('new-values', props.templateEntry);
}

</script>
