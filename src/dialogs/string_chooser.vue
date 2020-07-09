/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<licDialog
		:title="title"
		:width="width"
	>
		<el-form onSubmit="return false;">
			<el-form-item :label="label" class="string_chooser_input">
				<input
					ref="set_focus"
					v-model="newString"
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

export default {
	data: function() {
		return {
			newString: null,
			title: '',
			label: '',
			width: '500px',
		};
	},
	methods: {
		updateValues() {
			this.$emit('update', {...this.$data});
		},
		ok() {
			this.$emit('ok', this.newString);
			this.$emit('close');
		},
		cancel() {
			this.$emit('cancel');
			this.$emit('close');
		},
	},
};
</script>

<style>

.string_chooser_input {
	display: flex;
}

.string_chooser_input .el-form-item__content {
	display: inline-block;
	padding-top: 3px;
	flex-grow: 1;
}

</style>
