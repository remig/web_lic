<template>
	<div>
		<div class="panel panel-template">
			<h5>Page Size</h5>
			<div class="panel-body">
				<form class="form-horizontal">
					<el-checkbox
						v-model="maintainAspectRatio"
						@change="changeAspectRatio"
					>
						Maintain Aspect Ratio ({{aspectRatio.toFixed(2)}})
					</el-checkbox>
					<div class="form-group paddingT10">
						<label class="control-label col-sm-5">Width (px)</label>
						<div class="col-sm-5">
							<input
								v-model.number="width"
								v-on:input="updateValues"
								type="number"
								min="0"
								class="form-control"
							/>
						</div>
					</div>
					<div class="form-group marginB05">
						<label class="control-label col-sm-5">Height (px)</label>
						<div class="col-sm-5">
							<input
								v-model.number="height"
								v-on:input="updateValues"
								type="number"
								min="0"
								class="form-control col-sm-10"
							/>
						</div>
					</div>
				</form>
			</div>
		</div>
		<fill-panel
			template-entry="page"
			v-on:new-values="newValues"
		></fill-panel>
		<border-panel
			template-entry="page"
			v-on:new-values="newValues"
		></border-panel>
	</div>
</template>

<script>

import store from '../../store';
import fillPanel from './fill.vue';
import borderPanel from './border.vue';

// TODO: add default page layout UI
// TODO: should add UI to choose whether to redo layout or just extend canvas
// TODO: need to re-layout title page too, on some operations like page resize
// TODO: for page size, add preset sizes like 'A4', 'legal', etc.  See here for list of formats & sizes: https://github.com/MrRio/jsPDF/blob/master/jspdf.js
// TODO: explore component 'extends' to make panel / subpanel nesting easier (https://vuejs.org/v2/api/#extends)
export default {
	data() {
		const template = store.state.template.page;
		return {
			width: template.width,
			height: template.height,
			aspectRatio: template.width / template.height,
			maintainAspectRatio: true
		};
	},
	components: {
		fillPanel,
		borderPanel
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
