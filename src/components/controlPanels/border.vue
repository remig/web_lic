<template>
	<panel-base :title="title">
		<div class="form-group">
			<label
				for="borderColorInput"
				class="control-label col-sm-7"
			>
				Color
			</label>
			<el-color-picker
				v-model="color"
				show-alpha
				@active-change="updateColor"
				@change="updateValues"
			/>
		</div>
		<div class="form-group">
			<label for="lineWidth" class="control-label col-sm-7">Line Width</label>
			<div class="col-sm-5">
				<input
					id="lineWidth"
					v-model.number="width"
					type="number"
					min="0"
					class="form-control"
					@input="updateValues"
				>
			</div>
		</div>
		<div v-if="cornerRadius != null" class="form-group">
			<label for="cornerRadius" class="control-label col-sm-7">Corner Radius</label>
			<div class="col-sm-5">
				<input
					id="cornerRadius"
					v-model.number="cornerRadius"
					type="number"
					min="0"
					class="form-control"
					@input="updateValues"
				>
			</div>
		</div>
	</panel-base>
</template>

<script>

import _ from '../../util';
import store from '../../store';
import PanelBase from './panel_base.vue';

export default {
	components: {PanelBase},
	props: {
		templateEntry: {type: String, required: true},
		title: {type: String, default: 'Border'}
	},
	data() {
		const template = _.get(this.templateEntry, store.state.template).border;
		return {
			width: template.width || 0,
			color: template.color,
			cornerRadius: template.cornerRadius
		};
	},
	methods: {
		updateColor(newColor) {
			this.color = (newColor === 'transparent') ? null : newColor;
			this.updateValues();
		},
		updateValues() {
			const template = _.get(this.templateEntry, store.state.template).border;
			template.width = this.width;
			template.color = this.color;
			template.cornerRadius = this.cornerRadius;
			this.$emit('new-values', this.templateEntry);
		}
	}
};

</script>
