/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<licDialog
		:title="tr('dialog.export_hi_res_pdf.title')"
		width="525px"
		class="pdfExportDialog"
	>
		<el-form label-width="140px">
			<el-form-item :label="tr('dialog.export_hi_res_pdf.page_size')">
				<input
					ref="set_focus"
					:value="pageSize.width"
					min="0"
					max="10000"
					type="number"
					class="form-control"
					@input="updateWidth($event.target.value)"
				>
				<span>{{tr("dialog.export_hi_res_pdf.by")}}</span>
				<input
					:value="pageSize.height"
					min="0"
					max="10000"
					type="number"
					class="form-control"
					@input="updateHeight($event.target.value)"
				>
				<el-select :value="newState.units" @change="updateUnits">
					<el-option key="point" label="point" value="point"></el-option>
					<el-option key="mm" label="mm" value="mm"></el-option>
					<el-option key="cm" label="cm" value="cm"></el-option>
					<el-option key="in" label="in" value="in"></el-option>
				</el-select>
			</el-form-item>
			<el-form-item :label="tr('dialog.export_hi_res_pdf.image_res')">
				<input
					v-model.number="newState.dpi"
					min="0"
					max="1000"
					type="number"
					class="form-control"
				>
				<span>{{tr("dialog.export_hi_res_pdf.dpi")}}</span>
			</el-form-item>
		</el-form>
		<span slot="footer" class="dialog-footer">
			<el-button @click="cancel">{{tr("dialog.cancel")}}</el-button>
			<el-button type="primary" @click="ok()">{{tr("dialog.ok")}}</el-button>
		</span>
	</licDialog>
</template>

<script>

import _ from '../util';
import uiState from '../ui_state';

export default {
	data: function() {
		return {
			aspectRatio: 0,
			newState: uiState.get('dialog.export.pdf'),  // dpi & units
			pageSize: {width: 0, height: 0}  // stored in this.units
		};
	},
	methods: {
		show(pageSizeInPixels) {
			const units = this.newState.units;
			this.pageSize.width = _.units.pixelsToUnits(pageSizeInPixels.width, units);
			this.pageSize.height = _.units.pixelsToUnits(pageSizeInPixels.height, units);
			this.aspectRatio = pageSizeInPixels.width / pageSizeInPixels.height;
		},
		updateWidth(newWidth) {
			this.pageSize.width = _.round(parseFloat(newWidth), 2);
			this.pageSize.height = _.round(this.pageSize.width / this.aspectRatio, 2);
		},
		updateHeight(newHeight) {
			this.pageSize.height = _.round(parseFloat(newHeight), 2);
			this.pageSize.width = _.round(this.pageSize.height * this.aspectRatio, 2);
		},
		updateUnits(newUnits) {
			const widthInPixels = _.units.unitsToPixels(this.pageSize.width, this.newState.units);
			this.pageSize.width = _.round(_.units.pixelsToUnits(widthInPixels, newUnits), 2);
			const heightInPixels = _.units.unitsToPixels(this.pageSize.height, this.newState.units);
			this.pageSize.height = _.round(_.units.pixelsToUnits(heightInPixels, newUnits));
			this.newState.units = newUnits;
		},
		ok() {
			const units = this.newState.units;
			this.$emit('ok', {
				dpi: this.newState.dpi,
				units: this.newState.units,
				pageSize: {
					width: _.units.unitToPoints(this.pageSize.width, units),
					height: _.units.unitToPoints(this.pageSize.height, units)
				}
			});
			this.$emit('close');
		},
		cancel() {
			this.$emit('close');
		}
	}
};
</script>

<style>

.pdfExportDialog input {
	display: inline;
	width: 95px;
	margin: 0 5px;
}

</style>
