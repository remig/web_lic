/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<licDialog
		:title="tr('dialog.transform_part.title')"
		width="600px"
		class="transformPartDialog"
	>
		<el-form :inline="true" label-width="40px">
			<el-form-item :label="tr('dialog.transform_part.position')" label-width="90px" />
			<el-form-item :label="tr('glossary.x')">
				<input
					ref="set_focus"
					v-model.number="position.x"
					type="number"
					class="form-control"
					@input="updateValues"
				>
			</el-form-item>
			<el-form-item :label="tr('glossary.y')">
				<input
					v-model.number="position.y"
					type="number"
					class="form-control"
					@input="updateValues"
				>
			</el-form-item>
			<el-form-item :label="tr('glossary.z')">
				<input
					v-model.number="position.z"
					type="number"
					class="form-control"
					@input="updateValues"
				>
			</el-form-item>
		</el-form>
		<el-form :inline="true" label-width="40px">
			<el-form-item :label="tr('dialog.transform_part.rotation')" label-width="90px" />
			<el-form-item :label="tr('glossary.x')">
				<input
					v-model.number="rotation.x"
					type="number"
					class="form-control"
					@input="updateValues"
				>
			</el-form-item>
			<el-form-item :label="tr('glossary.y')">
				<input
					v-model.number="rotation.y"
					type="number"
					class="form-control"
					@input="updateValues"
				>
			</el-form-item>
			<el-form-item :label="tr('glossary.z')">
				<input
					v-model.number="rotation.z"
					type="number"
					class="form-control"
					@input="updateValues"
				>
			</el-form-item>
		</el-form>
		<span slot="footer" class="dialog-footer">
			<el-button @click="cancel">{{tr("dialog.cancel")}}</el-button>
			<el-button type="primary" @click="ok()">{{tr("dialog.ok")}}</el-button>
		</span>
	</licDialog>
</template>

<script>

export default{
	data: function() {
		return {
			title: '',
			rotation: {x: 0, y: 0, z: 0},
			position: {x: 0, y: 0, z: 0},
			addRotateIcon: true,
			showRotateIconCheckbox: true
		};
	},
	methods: {
		updateValues() {
			this.$emit('update', this.$data);
		},
		ok() {
			this.$emit('ok', this.$data);
			this.$emit('close');
		},
		cancel() {
			this.$emit('cancel', this.$data);
			this.$emit('close');
		}
	}
};
</script>

<style>

.transformPartDialog input {
	width: 80px;
}

</style>
