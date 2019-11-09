/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<licDialog
		:title="tr('dialog.ld_color_picker.title')"
		class="ldColorPickerDialog"
		width="500px"
	>
		<table class="el-table brickColorTable">
			<tr>
				<th>{{tr('dialog.ld_color_picker.ld_code')}}</th>
				<th style="text-align: left;">
					{{tr('dialog.ld_color_picker.name')}}
				</th>
				<th style="text-align: left;">
					{{tr('dialog.ld_color_picker.choose')}}
				</th>
			</tr>
		</table>
		<div class="brickColorTableScroll">
			<table class="el-table brickColorTable">
				<tr v-for="row in colorData" :key="row.id" class="brickColorRow">
					<td>{{row.id}}</td>
					<td style="text-align: left;">
						{{_.startCase(row.name)}}
					</td>
					<td>
						<div class="swatch" @click="pick(row.id)">
							<div :style="{'background-color': row.color}" class="inner_swatch" />
						</div>
					</td>
				</tr>
			</table>
		</div>
		<span slot="footer" class="dialog-footer">
			<el-button @click="cancel">{{tr("dialog.cancel")}}</el-button>
		</span>
	</licDialog>
</template>

<script>

import _ from '../util';
import LDParse from '../ld_parse';
import Storage from '../storage';
const customColors = Storage.get.customBrickColors();

function buildColorTable() {
	const colors = [];
	_.forOwn(LDParse.colorTable, (v, k) => {
		if (v.color < 0 || v.edge < 0) {
			return;
		}
		k = parseInt(k, 10);
		const customColor = customColors[k] || {};
		colors[k] = {
			id: k,
			name: v.name,
			color: customColor.color || v.color,
			edge: customColor.edge || v.edge
		};
	});
	return colors.filter(el => el != null);
}

export default {
	data: function() {
		return {
			colorData: buildColorTable()
		};
	},
	methods: {
		pick(colorCode) {
			this.$emit('ok', colorCode);
			this.$emit('close');
		},
		cancel() {
			this.$emit('close');
		}
	}
};
</script>

<style>

.ldColorPickerDialog {
	table-layout: fixed;
}

.ldColorPickerDialog td:nth-of-type(1), .ldColorPickerDialog th:nth-of-type(1) {
	width: 100px;
}

.ldColorPickerDialog td:nth-of-type(2), .ldColorPickerDialog th:nth-of-type(2) {
	width: 140px;
}

.ldColorPickerDialog td:nth-of-type(3), .ldColorPickerDialog th:nth-of-type(3) {
	width: 50px;
}

.ldColorPickerDialog .swatch {
	width: 30px;
	height: 30px;
	border: 1px solid #ccc;
	border-radius: 4px;
	padding: 3px;
	margin-left: 20px;
	cursor: pointer;
}

.ldColorPickerDialog .inner_swatch {
	width: 100%;
	height: 100%;
	border: 1px solid #999;
	border-radius: 2px;
}

.ldColorPickerDialog .el-dialog__body {
	max-height: 70vh;
}

.brickColorTableScroll {
	max-height: 65vh;
	overflow-x: hidden;
	overflow-y: scroll;
}

.ldColorPickerDialog .el-table th, .ldColorPickerDialog .el-table td {
	padding: 5px 0;
	text-align: center;
	overflow: hidden;
}

.ldColorPickerDialog .el-color-picker {
	height: 34px;
}

</style>

