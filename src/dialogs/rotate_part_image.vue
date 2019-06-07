/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<licDialog
		:title="title"
		width="400px"
		class="rotatePartImageDialog"
	>
		<el-form :inline="true" label-width="50px">
			<rotateBuilder
				ref="rotateBuilder"
				title=""
				@new-values="updateValues"
			/>
		</el-form>
		<el-form v-if="showRotateIconCheckbox" :inline="true" label-width="180px">
			<el-form-item>
				<el-checkbox v-model="addRotateIcon" @change="updateValues">
					{{tr('dialog.rotate_part_image.add_rotate_icon')}}
				</el-checkbox>
			</el-form-item>
		</el-form>
		<span slot="footer" class="dialog-footer">
			<el-button @click="cancel">{{tr("dialog.cancel")}}</el-button>
			<el-button type="primary" @click="ok()">{{tr("dialog.ok")}}</el-button>
		</span>
	</licDialog>
</template>

<script>

import rotateBuilder from '../components/rotate.vue';

export default{
	components: {rotateBuilder},
	data: function() {
		return {
			title: '',
			addRotateIcon: true,
			showRotateIconCheckbox: true
		};
	},
	methods: {
		setRotation(rotation) {
			this.$refs.rotateBuilder.rotation = rotation;
		},
		updateValues(newRotation) {
			if (newRotation) {
				this.$data.rotation = newRotation;
			}
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

.rotatePartImageDialog .el-checkbox {
	font-weight: 700;
}

</style>
