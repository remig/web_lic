/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<el-dialog
		:title="title"
		:modal="false"
		:show-close="false"
		:visible="visible"
		width="500px"
		class="rotatePartImageDialog"
	>
		<el-form :inline="true" label-width="50px">
			<el-form-item :label="tr('x')">
				<input
					v-model.number="rotation.x"
					type="number"
					class="form-control"
					@input="updateValues"
				>
			</el-form-item>
			<el-form-item :label="tr('y')">
				<input
					v-model.number="rotation.y"
					type="number"
					class="form-control"
					@input="updateValues"
				>
			</el-form-item>
			<el-form-item :label="tr('z')">
				<input
					v-model.number="rotation.z"
					type="number"
					class="form-control"
					@input="updateValues"
				>
			</el-form-item>
		</el-form>
		<el-form v-if="showRotateIconCheckbox" :inline="true" label-width="180px">
			<el-form-item :label="tr('dialog.rotate_part_image.add_rotate_icon')">
				<el-checkbox v-model="addRotateIcon" @change="updateValues" />
			</el-form-item>
		</el-form>
		<span slot="footer" class="dialog-footer">
			<el-button @click="cancel">{{tr("cancel")}}</el-button>
			<el-button type="primary" @click="ok()">{{tr("ok")}}</el-button>
		</span>
	</el-dialog>
</template>

<script>

export default{
	data: function() {
		return {
			visible: false,
			title: '',
			rotation: {
				x: 0, y: 0, z: 0
			},
			addRotateIcon: true,
			showRotateIconCheckbox: true
		};
	},
	methods: {
		updateValues() {
			this.$emit('update', this.$data);
		},
		ok() {
			this.visible = false;
			this.$emit('ok', this.$data);
		},
		cancel() {
			this.visible = false;
			this.$emit('cancel', this.$data);
		}
	}
};
</script>

<style>

.rotatePartImageDialog input {
	width: 80px;
}

</style>
