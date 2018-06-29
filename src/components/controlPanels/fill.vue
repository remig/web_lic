<template>
	<panel-base :title="this.title">
		<div class="form-group">
			<label
				for="fillColorInput"
				class="control-label col-sm-5"
			>
				Color
			</label>
			<el-color-picker
				v-model="color"
				v-on:active-change="updateColor"
				v-on:change="updateValues"
				show-alpha
				id="fillColorInput"
			></el-color-picker>
		</div>
		<div class="form-group" v-if="gradient != null">
			<label for="gradientInput" class="control-label col-sm-5">Gradient</label>
			<label class="control-label">NYI</label>
			<!-- <input v-model="gradient" v-on:input="updateValues" type="number" min="0" class="form-control" id="gradientInput"/> -->
		</div>
		<div class="form-group" v-if="imageFilename != null">
			<label for="imageInput" class="control-label col-sm-5">
				Image
				<el-button
					type="text"
					class="template-close"
					v-if="imageFilename"
					icon="el-icon-close"
					v-on:click="removeImage"
					size="small"
				></el-button>
			</label>
			<el-button
				v-if="imageFilename"
				icon="el-icon-picture-outline"
				v-on:click="pickImage"
				class="tight"
			>
				{{truncatedImageName}}
			</el-button>
			<el-button
				v-else
				icon="el-icon-picture-outline"
				v-on:click="pickImage"
			></el-button>
		</div>
	</panel-base>
</template>

<script>

import _ from '../../util';
import store from '../../store';
import openFileHandler from '../../fileUploader';
import panelBase from './panel_base.vue';

export default {
	props: {
		templateEntry: '',
		title: {type: String, default: 'Fill'}
	},
	components: {
		panelBase
	},
	data() {
		const template = _.get(this.templateEntry, store.state.template).fill;
		return {
			color: template.color,
			gradient: template.gradient,
			imageFilename: template.image == null ? null : template.image.filename || ''
		};
	},
	methods: {
		pickImage() {
			openFileHandler('.png', 'dataURL', (src, filename) => {

				const template = _.get(this.templateEntry, store.state.template).fill;
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
			const template = _.get(this.templateEntry, store.state.template).fill;
			this.imageFilename = template.image = '';
			this.updateValues();
		},
		updateColor(newColor) {
			this.color = (newColor === 'transparent') ? null : newColor;
			this.updateValues();
		},
		updateValues() {
			const template = _.get(this.templateEntry, store.state.template).fill;
			template.color = this.color;
			this.$emit('new-values', {type: this.templateEntry, noLayout: true});
		}
	},
	computed: {
		truncatedImageName() {
			const fn = this.imageFilename;
			return (fn.length > 12) ? fn.substr(0, 8) + '...png' : fn;
		}
	}
};

</script>
