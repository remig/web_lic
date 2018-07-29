/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<el-dialog
		:title="title"
		:modal="false"
		:show-close="false"
		:visible="visible"
		:width="width"
	>
		<el-form :label-width="calculatedLabelWidth">
			<el-form-item :label="label">
				<input
					v-model="newString"
					class="form-control"
					@input="updateValues"
				>
			</el-form-item>
		</el-form>
		<span slot="footer" class="dialog-footer">
			<el-button @click="cancel">{{tr("cancel")}}</el-button>
			<el-button type="primary" @click="ok()">{{tr("ok")}}</el-button>
		</span>
	</el-dialog>
</template>

<script>

export default {
	data: function() {
		return {
			visible: false,
			newString: null,
			title: 'Get String',
			label: '',
			labelWidth: '0',
			width: '500px'
		};
	},
	methods: {
		updateValues() {
			this.$emit('update', {...this.$data});
		},
		ok() {
			this.visible = false;
			this.$emit('ok', this.newString);
		},
		cancel() {
			this.visible = false;
			this.$emit('cancel');
		}
	},
	computed: {
		calculatedLabelWidth() {
			return this.label ? this.labelWidth : '0';
		}
	}
};
</script>
