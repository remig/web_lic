/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<el-form class="rotationBuilder">
		<el-form-item v-if="title" :label="title" />
		<div class="rotationListBox">
			<el-form v-for="(rot, idx) in rotation" :key="'rotation_' + idx" :inline="true">
				<el-form-item :label="includeLabels ? tr('dialog.rotation.axis') : ''" class="axisInput">
					<el-select v-model="rot.axis" @change="updateValues">
						<el-option key="x" label="X" value="x" />
						<el-option key="y" label="Y" value="y" />
						<el-option key="z" label="Z" value="z" />
					</el-select>
				</el-form-item>
				<el-form-item :label="includeLabels ? tr('dialog.rotation.angle') : ''" class="angleInput">
					<input
						v-model.number="rot.angle"
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

import _ from '../util';
import LocaleManager from './translate.vue';
const tr = LocaleManager.translate;

export default {
	props: {
		title: {type: String, 'default': tr('dialog.rotation.title')},
		initialRotation: {type: Array},
		includeLabels: {type: Boolean, 'default': true}
	},
	data() {
		return {
			rotation: _.cloneDeep(this.initialRotation || [])
		};
	},
	methods: {
		updateValues() {
			this.$emit('new-values', _.cloneDeep(this.rotation));
		},
		addRotation() {
			this.rotation.push({axis: 'x', angle: 0});
			this.updateValues();
		},
		removeRotation(idx) {
			this.rotation.splice(idx, 1);
			this.updateValues();
		}
	}
};

</script>

<style>

.axisInput > .el-form-item__content {
	width: 60px;
}

.angleInput > .el-form-item__content {
	width: 70px;
}

.rotationBuilder .icon {
	padding: 9px 10px;
}

.rotationBuilder .rotationListBox {
	border: 1px solid #e5e5e5;
	border-radius: 4px;
	padding: 15px 0 10px 15px;
	margin-bottom: 10px;
}
</style>
