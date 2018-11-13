/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<licDialog
		:title="tr('dialog.import_model.title')"
		class="importModelDialog"
		width="630px"
	>
		<el-row>
			<span>{{tr('dialog.import_model.steps_per_page')}}</span>
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
				:label="tr('dialog.import_model.use_max_steps')"
			/>
		</el-row>
		<el-row>
			<el-checkbox
				v-model="newState.autoShrinkCSI"
				:label="tr('dialog.import_model.auto_shrink_csi')"
			/>
		</el-row>
		<el-row>
			<el-dropdown
				:hide-on-click="false"
				trigger="click"
				placement="bottom-start"
				@command="checkIncludeItem"
			>
				<span class="el-dropdown-link">{{tr('dialog.import_model.include.root')}}</span>
				<el-dropdown-menu slot="dropdown" class="includeDropDown">
					<template v-for="(checked, item) in newState.include">
						<el-dropdown-item
							:key="`include_${item}`"
							:command="item"
						>
							{{tr(`dialog.import_model.include.${item}`)}}
							<i v-if="checked" class="fas fa-check"/>
						</el-dropdown-item>
					</template>
				</el-dropdown-menu>
			</el-dropdown>
		</el-row>
		<span slot="footer" class="dialog-footer">
			<el-button type="primary" @click="ok()">{{tr("ok")}}</el-button>
		</span>
	</licDialog>
</template>

<script>

import uiState from '../uiState';

export default {
	data: function() {
		return {
			newState: uiState.get('dialog.importModel')
		};
	},
	methods: {
		checkIncludeItem(item) {
			this.newState.include[item] = !this.newState.include[item];
		},
		ok() {
			this.$emit('ok', this.newState);
			this.$emit('close');
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

.importModelDialog .el-dropdown {
	font-size: 14px;
	padding: 6px 12px;
}

.importModelDialog input {
	display: inline;
	width: 80px;
	margin: 0 20px 0 10px;
}

.includeDropDown {
	min-width: 320px;
}

.includeDropDown i {
	padding-top: 8px;
}

</style>
