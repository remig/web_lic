<template>
	<panel-base title="Font">
		<div class="form-group">
			<label for="font" class="sr-only">Select a font</label>
			<div class="col-sm-10">
				<el-select v-model="family" @change="updateFontName" id="font">
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
			</div>
		</div>
		<div class="form-group">
			<div class="col-sm-12">
				<button
					v-on:click.stop.prevent="toggleProp('bold')"
					class="btn btn-secondary btn-primary"
				>
					<strong>B</strong>
				</button>
				<button
					v-on:click.stop.prevent="toggleProp('italic')"
					class="btn btn-secondary"
				>
					<em>I</em>
				</button>
				<button
					v-on:click.stop.prevent="toggleProp('underline')"
					class="btn btn-secondary"
				>
					<u>U</u>
				</button>
			</div>
		</div>
		<div class="form-group">
			<label for="fontSize" class="control-label col-sm-4">Size</label>
			<div class="col-sm-5">
				<input
					v-model.number="size"
					v-on:input="updateValues"
					type="number"
					min="0"
					class="form-control"
					id="fontSize"
				/>
			</div>
		</div>
		<div class="form-group">
			<label for="borderColorInput" class="control-label col-sm-4">Color</label>
			<el-color-picker
				v-model="color"
				v-on:active-change="updateColor"
				v-on:change="updateValues"
				show-alpha
			></el-color-picker>
		</div>
	</panel-base>
</template>

<script>
/* global Vue: false */

import _ from '../../util';
import store from '../../store';
import Storage from '../../storage';
import DialogManager from '../../dialog';
import panelBase from './panel_base.vue';

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
	inject: ['templateEntry'],
	components: {
		panelBase
	},
	data() {
		const template = _.get(this.templateEntry, store.state.template);
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
		updateFontName() {
			if (this.family === 'Custom...') {
				DialogManager.setDialog('fontNameDialog');
				Vue.nextTick(() => {
					const dialog = DialogManager.getDialog();
					dialog.$off();  // TODO: initialize these event listeners just once... somewhere, somehow.  This code smells.
					dialog.$on('ok', newValues => {
						this.family = newValues.fontName;
						this.addCustomFont(newValues.fontName);
						this.updateValues();
					});
					dialog.font = this.fontString();
					dialog.fontName = '';
					dialog.show({x: 400, y: 150});
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
			const template = _.get(this.templateEntry, store.state.template);
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
