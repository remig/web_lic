/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<el-form class="rotationBuilder">
		<el-form-item :label="title" />
		<div class="rotationListBox">
			<el-form v-for="(rotation, idx) in rotations" :key="'rotation_' + idx" :inline="true">
				<el-form-item :label="tr('dialog.rotation.axis')">
					<el-select v-model="rotation.axis" @change="updateValues">
						<el-option key="x" label="X" value="x" />
						<el-option key="y" label="Y" value="y" />
						<el-option key="z" label="Z" value="z" />
					</el-select>
				</el-form-item>
				<el-form-item :label="tr('dialog.rotation.angle')">
					<input
						v-model.number="rotation.angle"
						type="number"
						min="-360"
						max="360"
						class="form-control"
						@input="updateValues"
					>
				</el-form-item>
				<el-button class="icon" icon="fas fa-minus" @click="removeRotation(idx)" />
			</el-form>
			<el-button class="icon" icon="fas fa-plus" @click="addRotation" />
		</div>
	</el-form>
</template>

<script>

/* global Vue: false */
export default {
	props: {
		title: {type: String, 'default': Vue.tr('dialog.rotation.title')},
		initialRotations: {type: Array}
	},
	data() {
		return {
			rotations: this.initialRotations || []
		};
	},
	methods: {
		updateValues() {
			this.$emit('new-values', this.rotations);
		},
		addRotation() {
			this.rotations.push({axis: 'x', angle: 0});
			this.updateValues();
		},
		removeRotation(idx) {
			this.rotations.splice(idx, 1);
			this.updateValues();
		}
	}
};

</script>

<style>

.rotationBuilder .icon {
	padding: 9px 10px;
}

.rotationBuilder .el-form-item {
	margin-bottom: unset;
}

.rotationBuilder .rotationListBox {
	border: 1px solid #e5e5e5;
	border-radius: 4px;
	padding: 15px 0 10px 15px;
	margin-bottom: 10px;
}
</style>
