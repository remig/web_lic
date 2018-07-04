<template>
	<el-dialog
		:modal="false"
		:show-close="false"
		:visible="visible"
		title="Import Model"
		class="importModelDialog"
		width="630px"
	>
		<el-row>
			<span>Steps per Page</span>
			<input
				v-model.number="newState.stepsPerPage"
				:disabled="newState.useMaxSteps"
				min="1"
				max="10"
				type="number"
				class="form-control"
			>
			<el-checkbox
				v-model="newState.useMaxSteps"
				label="As many as can fit nicely"
			/>
		</el-row>
		<el-row>
			<el-checkbox
				v-model="newState.include.titlePage"
				label="Include Title Page"
			/>
			<el-checkbox
				v-model="newState.include.partListPage"
				label="Include Part List Page (NYI)"
			/>
			<el-checkbox
				v-model="newState.include.pli"
				label="Include PLIs in each Step"
			/>
		</el-row>
		<span slot="footer" class="dialog-footer">
			<el-button type="primary" @click="ok()">{{tr("ok")}}</el-button>
		</span>
	</el-dialog>
</template>

<script>

import uiState from '../uiState';

export default {
	data: function() {
		return {
			visible: false,
			newState: uiState.get('dialog.importModel')
		};
	},
	methods: {
		ok() {
			this.visible = false;
			this.$emit('ok', this.newState);
		}
	}
};
</script>

<style>

.importModelDialog .el-dialog__body {
	padding: 0;
}

.importModelDialog .el-row {
	margin: 20px;
}

.importModelDialog .el-checkbox+.el-checkbox {
	margin-left: 15x;
}

.importModelDialog input {
	display: inline;
	width: 80px;
	margin: 0 20px 0 10px;
}

</style>
