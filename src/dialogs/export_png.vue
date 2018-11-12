/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<el-dialog
		:title="tr('dialog.export_hi_res_png.title')"
		:modal="false"
		:show-close="false"
		:visible="true"
		width="550px"
		class="pngExportDialog"
	>
		<el-form label-width="140px">
			<el-form-item :label="tr('dialog.export_hi_res_png.scale')">
				<input
					v-model.number="scale"
					min="0"
					max="100"
					step="0.1"
					type="number"
					class="form-control"
					@input="updateScale"
				>
			</el-form-item>
			<el-form-item>
				<el-checkbox
					v-model="maintainPrintSize"
				>
					{{tr("dialog.export_hi_res_png.maintain_print_size")}}
				</el-checkbox>
			</el-form-item>
			<el-form-item :label="tr('dialog.export_hi_res_png.dpi')">
				<input
					v-model.number="dpi"
					min="0"
					max="10000"
					type="number"
					class="form-control"
					@input="updateDPI"
				>
			</el-form-item>
			<el-form-item>
				<div v-html="tr('dialog.export_hi_res_png.size_@mf', scaledPageSize)" />
				<div v-html="tr('dialog.export_hi_res_png.print_size_@mf', scaledPrintSize)" />
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

export default {
	data: function() {
		return {
			pageSize: {width: 0, height: 0},
			scale: uiState.get('dialog.export.images.scale'),
			dpi: uiState.get('dialog.export.images.dpi') || 96,
			maintainPrintSize: uiState.get('dialog.export.images.maintainPrintSize')
		};
	},
	methods: {
		show(originalPageSize) {
			this.pageSize = _.clone(originalPageSize);
			this.originalPageSize = _.clone(originalPageSize);
		},
		updateScale() {
			if (this.maintainPrintSize) {
				this.dpi = 96 * this.scale;
			}
		},
		updateDPI() {
			if (this.maintainPrintSize) {
				this.scale = this.dpi / 96;
			}
		},
		ok() {
			uiState.get('dialog.export.images').scale = this.scale;
			uiState.get('dialog.export.images').dpi = this.dpi;
			uiState.get('dialog.export.images').maintainPrintSize = this.maintainPrintSize;
			this.$emit('ok', {
				scale: this.scale,
				dpi: this.dpi
			});
			this.$emit('close');
		},
		cancel() {
			this.$emit('close');
		}
	},
	computed: {
		scaledPageSize() {
			return {
				width: Math.floor(this.pageSize.width * this.scale),
				height: Math.floor(this.pageSize.height * this.scale)
			};
		},
		scaledPrintSize() {
			const width = Math.floor(this.pageSize.width * this.scale);
			const height = Math.floor(this.pageSize.height * this.scale);
			const dpiScale = 96 / this.dpi;
			function conv(size, unit) {
				return _.round(_.units.pixelsToUnits(size, unit) * dpiScale, 2);
			}
			return {
				cm_width: conv(width, 'cm'),
				cm_height: conv(height, 'cm'),
				in_width: conv(width, 'in'),
				in_height: conv(height, 'in')
			};
		}
	}
};
</script>

<style>
.pngExportDialog .el-form-item {
	margin-bottom: 0;
}
</style>
