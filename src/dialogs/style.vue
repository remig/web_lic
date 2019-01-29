/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<licDialog
		:title="title"
		class="styleDialog"
		width="500px"
	>
		<el-form label-width="100px">
			<el-form-item :label="tr('dialog.style.label_text')">
				<el-input
					:rows="2"
					v-model="text"
					type="textarea"
				/>
			</el-form-item>
			<el-form-item :label="tr('glossary.font')">
				<el-select
					v-model="family"
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
			</el-form-item>
			<el-form-item :label="tr('glossary.font_size')">
				<input
					v-model.number="size"
					type="number"
					min="0"
					class="form-control size-input"
				>
			</el-form-item>
			<el-form-item :label="tr('glossary.color')">
				<el-color-picker
					v-model="color"
					show-alpha
				/>
			</el-form-item>
		</el-form>
		<span slot="footer" class="dialog-footer">
			<el-button @click="cancel">{{tr("dialog.cancel")}}</el-button>
			<el-button type="primary" @click="ok()">{{tr("dialog.ok")}}</el-button>
		</span>
	</licDialog>
</template>

<script>

import _ from '../util';
import fontNameDialog from './font_name.vue';

export default {
	data: function() {
		return {
			title: this.tr('dialog.style.title'),
			text: '',
			color: '',
			font: '',
			family: '',
			size: 0,
			bold: false,
			italic: false,
			underline: false
		};
	},
	methods: {
		show() {
			this.color = _.color.toRGB(this.color).toString();
			const fontParts = _.fontToFontParts(this.font);
			fontNameDialog.methods.addCustomFont(fontParts.fontFamily);
			this.family = fontParts.fontFamily;
			this.size = parseInt(fontParts.fontSize, 10);
			this.bold = fontParts.fontWeight === 'bold';
			this.italic = fontParts.fontStyle === 'italic';
			this.underline = false;
		},
		toggleProp(prop) {
			this[prop] = !this[prop];
		},
		ok() {
			this.$emit('ok', {
				text: this.text,
				font: _.fontString(this),
				color: this.color
			});
			this.$emit('close');
		},
		cancel() {
			this.$emit('close');
		}
	},
	computed: {
		familyNames: fontNameDialog.methods.getFamilyNames
	}
};
</script>

<style>

.styleDialog .size-input {
	width: 75px;
}

</style>
