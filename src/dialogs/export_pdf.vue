/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<el-dialog
		:title="tr('dialog.export_hi_res_pdf.title')"
		:modal="false"
		:show-close="false"
		:visible="visible"
		width="525px"
		class="pdfExportDialog"
	>
		<el-form label-width="140px">
			<el-form-item :label="tr('dialog.export_hi_res_pdf.page_size')">
				<input
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
					<el-option key="point" label="point" value="point" />
					<el-option key="mm" label="mm" value="mm" />
					<el-option key="cm" label="cm" value="cm" />
					<el-option key="in" label="in" value="in" />
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
			<el-button @click="cancel">{{tr("cancel")}}</el-button>
			<el-button type="primary" @click="ok()">{{tr("ok")}}</el-button>
		</span>
	</el-dialog>
</template>

<script>

import _ from '../util';
import uiState from '../uiState';

export default{
	data: function() {
		return {
			visible: false,
			aspectRatio: 0,
			newState: uiState.get('dialog.export.pdf'),  // dpi & units
			pageSize: {width: 0, height: 0},  // stored in this.units
			unitConversions: {  // this conversion factor * pixel count = units
				point: 0.75,
				in: 0.75 / 72,
				mm: 0.75 / 72 * 25.4,
				cm: 0.75 / 72 * 2.54
			}
		};
	},
	methods: {
		show(pageSizeInPixels) {
			this.aspectRatio = pageSizeInPixels.width / pageSizeInPixels.height;
			this.pageSize.width = this.pixelsToUnits(pageSizeInPixels.width);
			this.pageSize.height = this.pixelsToUnits(pageSizeInPixels.height);
			this.visible = true;
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
			const widthInPixels = this.unitsToPixels(this.pageSize.width, this.newState.units);
			this.pageSize.width = _.round(this.pixelsToUnits(widthInPixels, newUnits), 2);
			const heightInPixels = this.unitsToPixels(this.pageSize.height, this.newState.units);
			this.pageSize.height = _.round(this.pixelsToUnits(heightInPixels, newUnits));
			this.newState.units = newUnits;
		},
		pixelsToUnits(pixelCount, units) {
			units = units || this.newState.units;
			return pixelCount * this.unitConversions[units];
		},
		unitsToPixels(unitCount, units) {
			units = units || this.newState.units;
			return unitCount / this.unitConversions[units];
		},
		unitToPoints(unitCount) {
			const pixels = this.unitsToPixels(unitCount);
			return this.pixelsToUnits(pixels, 'point');
		},
		ok() {
			this.visible = false;
			this.$emit('ok', {
				dpi: this.newState.dpi,
				units: this.newState.units,
				pageSize: {
					width: this.unitToPoints(this.pageSize.width),
					height: this.unitToPoints(this.pageSize.height)
				}
			});
		},
		cancel() {
			this.visible = false;
		}
	}
};
</script>
