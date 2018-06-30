<template>
	<panel-base :title="title">
		<div class="form-group">
			<label
				for="fillColorInput"
				class="control-label col-sm-5"
			>
				Color
			</label>
			<el-color-picker
				id="fillColorInput"
				v-model="color"
				show-alpha
				@active-change="updateColor"
				@change="updateValues"
			/>
		</div>
		<div v-if="gradient != null" class="form-group">
			<label for="gradientInput" class="control-label col-sm-5">Gradient</label>
			<label class="control-label">NYI</label>
			<!-- <input v-model="gradient" v-on:input="updateValues" type="number" min="0" class="form-control" id="gradientInput"/> -->
		</div>
		<div v-if="imageFilename != null" class="form-group">
			<label for="imageInput" class="control-label col-sm-5">
				Image
				<el-button
					v-if="imageFilename"
					type="text"
					class="template-close"
					icon="el-icon-close"
					size="small"
					@click="removeImage"
				/>
			</label>
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
		</div>
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
		title: {type: String, default: 'Fill'}
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
