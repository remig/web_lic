/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<div>
		<panel-base :title="tr('template.page.title')" label-width="100px">
			<el-form-item label-width="0">
				<el-select :value="sizePreset.format" @change="updatePagePreset">
					<el-option
						key="custom"
						:label="tr('template.page.formats.custom')"
						value="custom"
					/>
					<el-option
						v-for="(value, key) in pageSizeLookups"
						:key="key"
						:label="tr(`template.page.formats.${key}`)"
						:value="key"
					/>
				</el-select>
			</el-form-item>
			<el-form-item label-width="0">
				<el-radio
					:disabled="haveCustomFormat"
					v-model="sizePreset.orientation"
					label="horizontal"
					@change="updateOrientation"
				>
					{{tr('template.page.orientation.landscape')}}
				</el-radio>
				<el-radio
					:disabled="haveCustomFormat"
					v-model="sizePreset.orientation"
					label="vertical"
					@change="updateOrientation"
				>
					{{tr('template.page.orientation.portrait')}}
				</el-radio>
			</el-form-item>
			<el-form-item :label="tr('template.page.width')">
				<input
					:disabled="!haveCustomFormat"
					v-model.number="width"
					type="number"
					min="0"
					class="form-control"
					@input="updateValues"
				>
			</el-form-item>
			<el-form-item :label="tr('template.page.height')">
				<input
					:disabled="!haveCustomFormat"
					v-model.number="height"
					type="number"
					min="0"
					class="form-control col-sm-10"
					@input="updateValues"
				>
			</el-form-item>
			<el-form-item label-width="0px">
				<el-checkbox
					:disabled="!haveCustomFormat"
					v-model="maintainAspectRatio"
					@change="changeAspectRatio"
				>
					{{tr("template.page.aspect_ratio_@mf", {aspect_ratio: aspectRatio.toFixed(2)})}}
				</el-checkbox>
			</el-form-item>
		</panel-base>
		<fill-panel
			template-entry="page"
			@new-values="newValues"
		/>
		<border-panel
			template-entry="page"
			@new-values="newValues"
		/>
	</div>
</template>

<script>

import _ from '../../util';
import store from '../../store';
import FillPanel from './fill.vue';
import BorderPanel from './border.vue';
import PanelBase from './panel_base.vue';

const pageSizeLookups = {  // [width, height] in pixels
	'a3': [1123, 1587],
	'a4': [794, 1123],
	'a5': [559, 794],
	'letter': [816, 1056],
	'gov-letter': [768, 1008],
	'legal': [816, 1344],
	'junior-legal': [480, 768]
};

// TODO: add UI to set default page layout (horizontal vs. vertical , row / cols, etc)
// TODO: should add UI to choose whether to redo layout or just extend canvas
// TODO: need to re-layout title page too, on some operations like page resize
export default {
	components: {PanelBase, FillPanel, BorderPanel},
	data() {
		const template = store.state.template.page;
		return {
			width: template.width,
			height: template.height,
			pageSizeLookups,
			sizePreset: {
				format: (template.sizePreset || {}).format || 'custom',
				orientation: (template.sizePreset || {}).orientation || 'vertical'
			},
			aspectRatio: template.width / template.height,
			maintainAspectRatio: true
		};
	},
	methods: {
		changeAspectRatio() {
			this.height = Math.floor(this.width / this.aspectRatio);
			this.updateValues();
		},
		newValues() {
			this.$emit('new-values', 'Page');
		},
		updatePagePreset(newPagePreset) {
			this.sizePreset.format = newPagePreset;
			if (newPagePreset !== 'custom') {
				this.maintainAspectRatio = false;
				const pageSize = pageSizeLookups[newPagePreset];
				if (this.sizePreset.orientation === 'vertical') {
					this.width = pageSize[0];
					this.height = pageSize[1];
				} else {
					this.width = pageSize[1];
					this.height = pageSize[0];
				}
				this.aspectRatio = this.width / this.height;
			}
			this.updateValues();
		},
		updateOrientation() {
			const tmp = this.width;
			this.width = this.height;
			this.height = tmp;
			this.aspectRatio = 1 / this.aspectRatio;
			this.updateValues();
		},
		updateValues() {
			const template = store.state.template.page;
			let haveChange = false;
			if (this.width !== template.width || this.height !== template.height) {
				if (this.maintainAspectRatio) {
					if (this.width !== template.width) {
						this.height = Math.floor(this.width / this.aspectRatio);
					} else if (this.height !== template.height) {
						this.width = Math.floor(this.height * this.aspectRatio);
					}
				}
				template.width = this.width;
				template.height = this.height;
				haveChange = true;
			}
			if (!_.isEqual(template.sizePreset, this.sizePreset)) {
				template.sizePreset = {...this.sizePreset};
				haveChange = true;
			}
			if (haveChange) {
				this.$emit('new-values', 'Page');
			}
		}
	},
	computed: {
		haveCustomFormat() {
			return this.sizePreset.format === 'custom';
		}
	}
};

</script>
