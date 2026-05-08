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
				<strong>{{tr('template.font.bold_character')}}</strong>
			</button>
			<button
				type="button"
				:class="['lic-toggle-btn', { active: italic }]"
				@click="italic = !italic; updateValues()"
			>
				<em>{{tr('template.font.italic_character')}}</em>
			</button>
			<!-- <button
				type="button"
				:class="['lic-toggle-btn', { active: underline }]"
				@click="underline = !underline; updateValues()"
			>
				<u>{{tr('template.font.underline_character')}}</u>
			</button> -->
		</div>
		<label class="label-input-row">
			{{tr('glossary.size')}}
			<input
				v-model.number="size"
				type="number"
				min="0"
				class="form-control"
				@input="updateValues"
			>
		</label>
		<div class="label-input-row">
			{{tr('glossary.color')}}
			<LicColorPicker v-model="color" show-alpha @change="updateValues" />
		</div>
	</panel-base>
</template>

<script>

import _ from '../../util';
import store from '../../store';
import PanelBase from './panel_base.vue';
import LicColorPicker from '../base/LicColorPicker.vue';
import LicSelectFontName from '../base/LicSelectFontName.vue';

// TODO: support underlining fonts in general
export default {
	components: {PanelBase, LicColorPicker, LicSelectFontName},
	props: ['templateEntry'],
	data() {
		const template = _.get(store.state.template, this.templateEntry);
		const fontParts = _.fontToFontParts(template.font);
		return {
			family: fontParts.fontFamily,
			size: parseInt(fontParts.fontSize, 10),
			bold: fontParts.fontWeight === 'bold',
			italic: fontParts.fontStyle === 'italic',
			underline: false,
			color: template.color,
		};
	},
	methods: {
		updateValues() {
			const template = _.get(store.state.template, this.templateEntry);
			template.font = _.fontString(this);
			template.color = this.color;
			this.$emit('new-values', this.templateEntry);
		},
	},
};

</script>
