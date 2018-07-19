<template>
	<panel-base title="Font" label-width="70px">
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
			<el-button
				type="primary"
				class="fontStyleButton"
				@click.stop.prevent="toggleProp('bold')"
			>
				<strong>B</strong>
			</el-button>
			<el-button
				class="fontStyleButton"
				@click.stop.prevent="toggleProp('italic')"
			>
				<em>I</em>
			</el-button>
			<el-button
				class="fontStyleButton"
				@click.stop.prevent="toggleProp('underline')"
			>
				<u>U</u>
			</el-button>
		</el-form-item>
		<el-form-item label="Size">
			<input
				v-model.number="size"
				type="number"
				min="0"
				class="form-control"
				@input="updateValues"
			>
		</el-form-item>
		<el-form-item label="Color">
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
/* global Vue: false */

import _ from '../../util';
import store from '../../store';
import Storage from '../../storage';
import DialogManager from '../../dialog';
import fontNameDialog from '../../dialogs/font_name.vue';
import PanelBase from './panel_base.vue';

const familyNames = ['Helvetica', 'Times New Roman'];
const customFamilyNames = Storage.get.customFonts();

function getFamilyNames() {
	if (customFamilyNames.length) {
		return [
			{label: 'builtInFonts', options: familyNames},
			{label: 'customFonts', options: customFamilyNames},
			{label: 'custom', options: ['Custom...']}
		];
	}
	return [
		{label: 'builtInFonts', options: familyNames},
		{label: 'customFonts', options: ['Custom...']}
	];
}

// TODO: support underlining fonts in general
// TODO: font styling buttons (bold, italic, underline) need to toggle
export default {
	components: {PanelBase},
	props: ['templateEntry'],
	data() {
		const template = _.get(store.state.template, this.templateEntry);
		const fontParts = _.fontToFontParts(template.font);
		this.addCustomFont(fontParts.fontFamily);
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
		toggleProp(prop) {
			this[prop] = !this[prop];
			this.updateValues();
		},
		cacheFontName(show) {
			if (show) {
				this._lastFontFamily = this.family;
			}
		},
		updateFontName() {
			if (this.family === 'Custom...') {
				DialogManager.setDialog(fontNameDialog);
				Vue.nextTick(() => {
					const dialog = DialogManager.getDialog();
					dialog.$on('ok', fontName => {
						this.family = fontName;
						this.addCustomFont(fontName);
						this.updateValues();
					});
					dialog.$on('cancel', () => {
						this.family = this._lastFontFamily;
					});
					dialog.font = this.fontString();
					dialog.fontName = '';
					dialog.visible = true;
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
			template.font = this.fontString();
			template.color = this.color;
			this.$emit('new-values', this.templateEntry);
		},
		fontString() {
			return _.fontPartsToFont({
				fontSize: this.size + 'pt',
				fontFamily: this.family,
				fontWeight: this.bold ? 'bold' : null,
				fontStyle: this.italic ? 'italic' : null
			});
		},
		addCustomFont(family) {
			if (!_.isEmpty(family)) {
				const familyLower = family.toLowerCase();
				const names = [
					...familyNames.map(f => f.toLowerCase()),
					...customFamilyNames.map(f => f.toLowerCase())
				];
				if (!names.includes(familyLower)) {
					customFamilyNames.push(family);
					Storage.replace.customFonts(customFamilyNames);
				}
			}
			this.familyNames = getFamilyNames();
		}
	}
};

</script>

<style>

.fontStyleButton {
	width: 34px;
	height: 34px;
	padding: 9px 0;
}

</style>
