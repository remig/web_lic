/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<panel-base title="Transform" label-width="80px">
		<el-form-item label="Rotate X">
			<input
				v-model.number="x"
				type="number"
				min="-360"
				max="360"
				class="form-control"
				@input="updateValues"
			>
		</el-form-item>
		<el-form-item label="Y">
			<input
				v-model.number="y"
				type="number"
				min="-360"
				max="360"
				class="form-control"
				@input="updateValues"
			>
		</el-form-item>
		<el-form-item label="Z">
			<input
				v-model.number="z"
				type="number"
				min="-360"
				max="360"
				class="form-control"
				@input="updateValues"
			>
		</el-form-item>
		<el-form-item label="Scale">
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
	</panel-base>
</template>

<script>

import _ from '../../util';
import store from '../../store';
import PanelBase from './panel_base.vue';

export default {
	components: {PanelBase},
	props: ['templateEntry'],
	data() {
		const template = _.get(store.state.template, this.templateEntry);
		return {
			x: template.rotation.x,
			y: template.rotation.y,
			z: template.rotation.z,
			scale: template.scale
		};
	},
	methods: {
		updateValues() {
			const transform = _.get(store.state.template, this.templateEntry);
			const rotation = transform.rotation;
			if (rotation.x !== this.x || rotation.y !== this.y || rotation.z !== this.z
					|| transform.scale !== this.scale) {
				rotation.x = this.x;
				rotation.y = this.y;
				rotation.z = this.z;
				transform.scale = this.scale;
				this.$emit('new-values');
			}
		}
	}
};

</script>
