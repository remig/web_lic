/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<el-dialog
		:modal="false"
		:show-close="false"
		:visible="visible"
		title="Custom Font"
		width="630px"
		class="fontNameDialog"
	>
		<el-form label-width="160px">
			<el-form-item label="Enter the name of a font on your system">
				<input
					v-model="fontName"
					class="form-control"
					@input="updateValues"
				>
			</el-form-item>
			<el-form-item label="Sample Text">
				<div :style="{font: font}" class="fontNameDisplay">abc ABC 0 1 2 3 4 5 6 7 8 9</div>
			</el-form-item>
		</el-form>
		<span slot="footer" class="dialog-footer">
			<el-button @click="cancel">{{tr("cancel")}}</el-button>
			<el-button type="primary" @click="ok()">{{tr("ok")}}</el-button>
		</span>
	</el-dialog>
</template>

<script>

import _ from '../util';
import Storage from '../storage';

const familyNames = ['Helvetica', 'Times New Roman'];
const customFamilyNames = Storage.get.customFonts();

export default {
	data: function() {
		return {
			visible: false,
			font: '',
			fontName: ''
		};
	},
	methods: {
		updateValues() {
			const fontParts = _.fontToFontParts(this.font);
			fontParts.fontFamily = this.fontName;
			this.font = _.fontPartsToFont(fontParts);
		},
		ok() {
			this.visible = false;
			this.$emit('ok', this.fontName);
		},
		cancel() {
			this.visible = false;
			this.$emit('cancel');
		},
		getFamilyNames() {
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
		}
	}
};

</script>

<style>

.fontNameDialog  .el-form-item__label {
	line-height: 20px;
}

.fontNameDisplay {
	line-height: 15px;
}

</style>

