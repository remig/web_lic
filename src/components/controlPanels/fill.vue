/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<panel-base :title="title" class="fillTemplate" label-width="80px">
		<el-form-item :label="tr('glossary.color')">
			<el-color-picker
				v-model="color"
				show-alpha
				@active-change="updateColor"
				@change="updateValues"
			/>
		</el-form-item>
		<el-form-item v-if="gradient != null" :label="tr('template.fill.gradient')">
			<label class="el-form-item__label">NYI</label>
		</el-form-item>
		<el-form-item v-if="imageFilename != null" :label="tr('template.fill.image')">
			<el-button
				v-if="imageFilename"
				icon="el-icon-picture-outline"
				class="tight"
				@click="pickImage"
			>
				{{truncatedImageName}}
			</el-button>
			<el-button
				v-else
				icon="el-icon-picture-outline"
				@click="pickImage"
			/>
			<el-button
				v-if="imageFilename"
				type="text"
				class="template-close"
				icon="el-icon-close"
				size="small"
				@click="removeImage"
			/>
		</el-form-item>
	</panel-base>
</template>

<script>

import _ from '../../util';
import store from '../../store';
import openFileHandler from '../../fileUploader';
import PanelBase from './panel_base.vue';

export default {
	components: {PanelBase},
	props: {
		templateEntry: {type: String, required: true},
		title: {type: String, 'default': 'template.fill.title'}
	},
	data() {
		const template = _.get(store.state.template, this.templateEntry).fill;
		return {
			color: template.color,
			gradient: template.gradient,
			imageFilename: template.image == null ? null : template.image.filename || ''
		};
	},
	methods: {
		pickImage() {
			openFileHandler('.png', 'dataURL', (src, filename) => {

				const template = _.get(store.state.template, this.templateEntry).fill;
				template.image = {filename, src};
				this.imageFilename = filename;

				const image = new Image();
				image.onload = () => {
					store.cache.set('page', 'backgroundImage', image);
					this.updateValues();
				};
				image.src = src;
			});
		},
		removeImage() {
			const template = _.get(store.state.template, this.templateEntry).fill;
			this.imageFilename = template.image = '';
			this.updateValues();
		},
		updateColor(newColor) {
			this.color = (newColor === 'transparent') ? null : newColor;
			this.updateValues();
		},
		updateValues() {
			const template = _.get(store.state.template, this.templateEntry).fill;
			template.color = this.color;
			this.$emit('new-values', {type: this.templateEntry, noLayout: true});
		}
	},
	computed: {
		truncatedImageName() {
			const fn = this.imageFilename;
			return (fn.length > 12) ? fn.substr(0, 5) + '...png' : fn;
		}
	}
};

</script>

<style>

.el-button.tight {
	padding: 9px;
	max-width: 110px;
	overflow: hidden;
}

</style>
