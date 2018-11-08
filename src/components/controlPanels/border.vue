/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<panel-base :title="title" label-width="120px">
		<el-form-item label="Color">
			<el-color-picker
				v-model="color"
				show-alpha
				@active-change="updateColor"
				@change="updateValues"
			/>
		</el-form-item>
		<el-form-item label="Line Width">
			<input
				v-model.number="width"
				type="number"
				min="0"
				class="form-control"
				@input="updateValues"
			>
		</el-form-item>
		<el-form-item v-if="cornerRadius != null" label="Corner Radius">
			<input
				v-model.number="cornerRadius"
				type="number"
				min="0"
				class="form-control"
				@input="updateValues"
			>
		</el-form-item>
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
		title: {type: String, 'default': 'Border'}
	},
	data() {
		const template = _.get(store.state.template, this.templateEntry).border;
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
			const template = _.get(store.state.template, this.templateEntry).border;
			template.width = this.width;
			template.color = this.color;
			template.cornerRadius = this.cornerRadius;
			this.$emit('new-values', this.templateEntry);
		}
	}
};

</script>
