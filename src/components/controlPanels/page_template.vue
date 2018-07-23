<template>
	<div>
		<panel-base title="Page Size" label-width="100px">
			<el-form-item label-width="0px">
				<el-checkbox
					v-model="maintainAspectRatio"
					@change="changeAspectRatio"
				>
					Maintain Aspect Ratio ({{aspectRatio.toFixed(2)}})
				</el-checkbox>
			</el-form-item>
			<el-form-item label="Width (px)">
				<input
					v-model.number="width"
					type="number"
					min="0"
					class="form-control"
					@input="updateValues"
				>
			</el-form-item>
			<el-form-item label="Height (px)">
				<input
					v-model.number="height"
					type="number"
					min="0"
					class="form-control col-sm-10"
					@input="updateValues"
				>
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

import store from '../../store';
import FillPanel from './fill.vue';
import BorderPanel from './border.vue';
import PanelBase from './panel_base.vue';

// TODO: add default page layout UI
// TODO: should add UI to choose whether to redo layout or just extend canvas
// TODO: need to re-layout title page too, on some operations like page resize
// TODO: for page size, add preset sizes like 'A4', 'legal', etc.  See here for list of formats & sizes:
// https://github.com/MrRio/jsPDF/blob/master/jspdf.js
export default {
	components: {PanelBase, FillPanel, BorderPanel},
	data() {
		const template = store.state.template.page;
		return {
			width: template.width,
			height: template.height,
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
		updateValues() {
			const template = store.state.template.page;
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
				this.$emit('new-values', 'Page');
			}
		}
	}
};

</script>
