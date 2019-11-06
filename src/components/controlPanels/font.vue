/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<panel-base title="glossary.font" label-width="70px">
		<el-form-item label-width="0px">
			<el-select
				v-model="family"
				@visible-change="cacheFontName"
				@change="updateFontName"
			>
				<el-option-group v-for="group in familyNames" :key="group.label">
					<el-option
						v-for="font in group.options"
						:key="font"
						:value="font"
					>
						{{font}}
					</el-option>
				</el-option-group>
			</el-select>
		</el-form-item>
		<el-form-item label-width="0px">
			<el-checkbox-button
				v-model="bold"
				class="fontStyleButton"
				@change="updateValues()"
			>
				<strong>{{tr('template.font.bold_character')}}</strong>
			</el-checkbox-button>
			<el-checkbox-button
				v-model="italic"
				class="fontStyleButton"
				@change="updateValues()"
			>
				<em>{{tr('template.font.italic_character')}}</em>
			</el-checkbox-button>
			<!-- <el-checkbox-button
				v-model="underline"
				class="fontStyleButton"
				@change="updateValues()"
			>
				<u>{{tr('template.font.underline_character')}}</u>
			</el-checkbox-button> -->
		</el-form-item>
		<el-form-item :label="tr('glossary.size')">
			<input
				v-model.number="size"
				type="number"
				min="0"
				class="form-control"
				@input="updateValues"
			>
		</el-form-item>
		<el-form-item :label="tr('glossary.color')">
			<el-color-picker
				v-model="color"
				show-alpha
				@active-change="updateColor"
				@change="updateValues"
			/>
		</el-form-item>
	</panel-base>
</template>

<script>

import _ from '../../util';
import store from '../../store';
import DialogManager from '../../dialog';
import fontNameDialog from '../../dialogs/font_name.vue';
import PanelBase from './panel_base.vue';

const getFamilyNames = fontNameDialog.methods.getFamilyNames;
const addCustomFont = fontNameDialog.methods.addCustomFont;

// TODO: support underlining fonts in general
export default {
	components: {PanelBase},
	props: ['templateEntry'],
	data() {
		const template = _.get(store.state.template, this.templateEntry);
		const fontParts = _.fontToFontParts(template.font);
		addCustomFont(fontParts.fontFamily);
		return {
			family: fontParts.fontFamily,
			size: parseInt(fontParts.fontSize, 10),
			bold: fontParts.fontWeight === 'bold',
			italic: fontParts.fontStyle === 'italic',
			underline: false,
			color: template.color,
			familyNames: getFamilyNames()
		};
	},
	methods: {
		cacheFontName(show) {
			if (show) {
				this._lastFontFamily = this.family;
			}
		},
		updateFontName() {
			if (this.family === 'Custom...') {
				DialogManager(fontNameDialog, dialog => {
					dialog.$on('ok', fontName => {
						this.family = fontName;
						this.familyNames = getFamilyNames();
						this.updateValues();
					});
					dialog.$on('cancel', () => {
						this.family = this._lastFontFamily;
					});
					dialog.font = _.fontString(this);
					dialog.fontName = '';
				});
			} else {
				this.updateValues();
			}
		},
		updateColor(newColor) {
			this.color = (newColor === 'transparent') ? null : newColor;
			this.updateValues();
		},
		updateValues() {
			const template = _.get(store.state.template, this.templateEntry);
			template.font = _.fontString(this);
			template.color = this.color;
			this.$emit('new-values', this.templateEntry);
		}
	}
};

</script>
