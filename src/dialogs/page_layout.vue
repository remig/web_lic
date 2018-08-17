/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<el-dialog
		:title="tr('dialog.page_layout.title')"
		:modal="false"
		:show-close="false"
		:visible="visible"
		width="500px"
		class="pageLayoutDialog"
	>
		<el-form :inline="true" label-width="100px">
			<el-form-item :label="tr('dialog.page_layout.rows')">
				<el-checkbox v-model="autoRows" @change="updateValues">
					{{tr('auto')}}
				</el-checkbox>
			</el-form-item>
			<el-form-item>
				<input
					:disabled="autoRows"
					v-model.number="values.rows"
					type="number"
					min="1"
					class="form-control"
					@input="updateValues"
				>
			</el-form-item>
		</el-form>
		<el-form :inline="true" label-width="100px">
			<el-form-item :label="tr('dialog.page_layout.cols')">
				<el-checkbox v-model="autoCols" @change="updateValues">
					{{tr('auto')}}
				</el-checkbox>
			</el-form-item>
			<el-form-item>
				<input
					:disabled="autoCols"
					v-model.number="values.cols"
					type="number"
					min="1"
					class="form-control"
					@input="updateValues"
				>
			</el-form-item>
		</el-form>
		<el-form :inline="true" label-width="100px">
			<el-form-item :label="tr('dialog.page_layout.orientation')">
				<el-radio
					v-model="values.direction"
					label="horizontal"
					@change="updateValues"
				>
					{{tr('dialog.page_layout.horizontal')}}
				</el-radio>
				<el-radio
					v-model="values.direction"
					label="vertical"
					@change="updateValues"
				>
					{{tr('dialog.page_layout.vertical')}}
				</el-radio>
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
			autoRows: true,
			autoCols: true,
			values: {
				rows: 0,
				cols: 0,
				direction: 'vertical'
			}
		};
	},
	methods: {
		show() {
			if (this.values.rows === 'auto') {
				this.values.rows = 1;
				this.autoRows = true;
			} else {
				this.autoRows = false;
			}
			if (this.values.cols === 'auto') {
				this.values.cols = 1;
				this.autoCols = true;
			} else {
				this.autoCols = false;
			}
			this.visible = true;
		},
		updateValues() {
			this.$emit('update', this.actualValues);
		},
		ok() {
			this.visible = false;
			this.$emit('ok', this.actualValues);
		},
		cancel() {
			this.visible = false;
			this.$emit('cancel', this.actualValues);
		}
	},
	computed: {
		actualValues() {
			return {
				rows: this.autoRows ? 'auto' : this.values.rows,
				cols: this.autoCols ? 'auto' : this.values.cols,
				direction: this.values.direction
			};
		}
	}
};
</script>

<style>

.pageLayoutDialog input {
	width: 90px;
}

</style>
