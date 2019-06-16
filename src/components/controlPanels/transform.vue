/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<panel-base title="template.transform.title" label-width="80px">
		<el-form-item :label="tr('template.transform.scale')">
			<input
				v-model.number="scale"
				type="number"
				min="0"
				max="10"
				step="0.1"
				class="form-control"
				@input="updateValues"
			>
		</el-form-item>
		<rotate-builder
			:initial-rotation="rotation"
			:include-labels="false"
			title="Rotations"
			@new-values="updateValues"
		/>
	</panel-base>
</template>

<script>

import _ from '../../util';
import store from '../../store';
import PanelBase from './panel_base.vue';
import RotateBuilder from '../rotate.vue';

export default {
	components: {PanelBase, RotateBuilder},
	props: ['templateEntry'],
	methods: {
		updateValues(newRotation) {
			// TODO: only emit if something actually changed
			const transform = _.get(store.state.template, this.templateEntry);
			if (newRotation && Array.isArray(newRotation)) {
				transform.rotation = newRotation;
			}
			transform.scale = this.scale;
			this.$emit('new-values');
		}
	},
	computed: {
		rotation() {
			return _.get(store.state.template, this.templateEntry).rotation;
		},
		scale() {
			return _.get(store.state.template, this.templateEntry).scale;
		}
	}
};

</script>
