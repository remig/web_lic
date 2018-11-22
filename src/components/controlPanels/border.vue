/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<panel-base :title="title" label-width="120px">
		<el-form-item :label="tr('color')">
			<el-color-picker
				v-model="color"
				show-alpha
				@active-change="updateColor"
				@change="updateValues"
			/>
		</el-form-item>
		<el-form-item :label="tr('template.border.line_width')">
			<input
				v-model.number="width"
				type="number"
				min="0"
				class="form-control"
				@input="updateValues"
			>
		</el-form-item>
		<el-form-item v-if="cornerRadius != null" :label="tr('template.border.corner_radius')">
			<input
				v-model.number="cornerRadius"
				type="number"
				min="0"
				class="form-control"
				@input="updateValues"
			>
		</el-form-item>
		<el-form-item v-if="innerMargin != null" :label="tr('template.border.margin')">
			<input
				v-model.number="innerMargin"
				type="number"
				step="0.1"
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
import LocaleManager from '../../translate';

const tr = LocaleManager.translate;

export default {
	components: {PanelBase},
	props: {
		templateEntry: {type: String, required: true},
		title: {type: String, 'default': tr('template.border.title')}
	},
	data() {
		const template = _.get(store.state.template, this.templateEntry);
		return {
			width: template.border.width || 0,
			color: template.border.color,
			cornerRadius: template.border.cornerRadius,
			innerMargin: template.innerMargin == null ? null : template.innerMargin * 100
		};
	},
	methods: {
		updateColor(newColor) {
			this.color = (newColor === 'transparent') ? null : newColor;
			this.updateValues();
		},
		updateValues() {
			const template = _.get(store.state.template, this.templateEntry);
			template.border.width = this.width;
			template.border.color = this.color;
			template.border.cornerRadius = this.cornerRadius;
			template.innerMargin = this.innerMargin == null ? null : this.innerMargin / 100;
			this.$emit('new-values', this.templateEntry);
		}
	}
};

</script>
