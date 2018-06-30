<template>
	<panel-base title="Rotation">
		<div class="form-group">
			<label for="xRotation" class="control-label col-sm-2">X</label>
			<div class="col-sm-5">
				<input
					id="xRotation"
					v-model.number="x"
					type="number"
					min="-360"
					max="360"
					class="form-control"
					@input="updateValues"
				>
			</div>
		</div>
		<div class="form-group">
			<label for="yRotation" class="control-label col-sm-2">Y</label>
			<div class="col-sm-5">
				<input
					id="yRotation"
					v-model.number="y"
					type="number"
					min="-360"
					max="360"
					class="form-control"
					@input="updateValues"
				>
			</div>
		</div>
		<div class="form-group">
			<label for="zRotation" class="control-label col-sm-2">Z</label>
			<div class="col-sm-5">
				<input
					id="zRotation"
					v-model.number="z"
					type="number"
					min="-360"
					max="360"
					class="form-control"
					@input="updateValues"
				>
			</div>
		</div>
		<h5>Scale</h5>
		<div class="form-group">
			<div class="col-sm-6">
				<input
					id="scaleInput"
					v-model.number="scale"
					type="number"
					min="0"
					max="10"
					step="0.1"
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
import panelBase from './panel_base.vue';

// TODO: support underlining fonts in general
// TODO: font styling buttons (bold, italic, underline) need to toggle
export default {
	components: {panelBase},
	props: ['templateEntry'],
	data() {
		const template = _.get(this.templateEntry, store.state.template);
		this.templateItem = _.clone({});
		return {
			templateItem: null,
			x: template.rotation.x,
			y: template.rotation.y,
			z: template.rotation.z,
			scale: template.scale
		};
	},
	methods: {
		updateValues() {
			const transform = _.get(this.templateEntry, store.state.template);
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
