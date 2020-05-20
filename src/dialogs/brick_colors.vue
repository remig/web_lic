/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<licDialog
		:title="tr('dialog.brick_colors.title')"
		class="brickColorDialog"
		width="500px"
	>
		<table class="el-table brickColorTable">
			<tr>
				<th>{{tr('dialog.brick_colors.ld_code')}}</th>
				<th style="text-align: left;">{{tr('dialog.brick_colors.name')}}</th>
				<th>{{tr('glossary.color')}}</th>
				<th>{{tr('dialog.brick_colors.edge_color')}}</th>
			</tr>
		</table>
		<div class="brickColorTableScroll">
			<table class="el-table brickColorTable">
				<tr v-for="row in colorData" :key="row.id" class="brickColorRow">
					<td>{{row.id}}</td>
					<td style="text-align: left;">{{_.startCase(row.name)}}</td>
					<td>
						<el-color-picker v-model="row.color" color-format="hex"></el-color-picker>
					</td>
					<td>
						<el-color-picker v-model="row.edge" color-format="hex"></el-color-picker>
					</td>
				</tr>
			</table>
		</div>
		<span slot="footer" class="dialog-footer">
			<el-button @click="reset">{{tr("dialog.reset")}}</el-button>
			<el-button @click="cancel">{{tr("dialog.cancel")}}</el-button>
			<el-button type="primary" @click="ok">{{tr("dialog.ok")}}</el-button>
		</span>
	</licDialog>
</template>

<script>

import _ from '../util';
import store from '../store';
import LDParse from '../ld_parse';
import Storage from '../storage';
import backwardCompat from '../backward_compat';
const customColors = Storage.get.customBrickColors();

function buildColorTable() {
	const colors = [];
	_.forOwn(LDParse.colorTable, (v, k) => {
		if (v.color < 0 || v.edge < 0) {
			return;
		}
		k = parseInt(k, 10);
		const customColor = customColors[k] || {};
		colors.push({
			id: k,
			name: v.name,
			color: customColor.color || v.color,
			edge: customColor.edge || v.edge
		});
	});
	return colors;
}

export default {
	data: function() {
		return {
			colorData: buildColorTable()
		};
	},
	methods: {
		ok() {
			this.colorData.forEach(el => {
				const ldColor = LDParse.colorTable[el.id];
				let customColor = customColors[el.id];
				if (ldColor.color === el.color && customColor) {
					delete customColor.color;
					delete customColor.rgba;
				} else if (ldColor.color !== el.color) {
					customColor = customColors[el.id] = customColors[el.id] || {};
					customColor.color = el.color;
				}
				if (ldColor.edge === el.edge && customColor) {
					delete customColor.edge;
					delete customColor.edgeRgba;
				} else if (ldColor.edge !== el.edge) {
					customColor = customColors[el.id] = customColors[el.id] || {};
					customColor.edge = el.edge;
				}
				if (_.isEmpty(customColor)) {
					delete customColors[el.id];
				}
			});
			this.applyChange();
			this.$emit('close');
		},
		applyChange() {
			const fixedColors = backwardCompat.fixColorTable(customColors);
			LDParse.setCustomColorTable(fixedColors);
			Storage.replace.customBrickColors(fixedColors);
			store.mutations.csi.markAllDirty();
			store.mutations.pliItem.markAllDirty();
			this.$root.redrawUI();
		},
		reset() {
			this.colorData.forEach(el => {
				const entry = LDParse.colorTable[el.id];
				el.color = entry.color;
				el.edge = entry.edge;
			});
		},
		cancel() {
			this.$emit('close');
		}
	}
};
</script>

<style>

.brickColorTable {
	table-layout: fixed;
	width: 440px;
}

.brickColorTable td:nth-of-type(1), .brickColorTable th:nth-of-type(1) {
	width: 110px;
}

.brickColorTable td:nth-of-type(2), .brickColorTable th:nth-of-type(2) {
	width: 160px;
}

.brickColorTable td:nth-of-type(3), .brickColorTable th:nth-of-type(3) {
	width: 60px;
}

.brickColorTable td:nth-of-type(4), .brickColorTable th:nth-of-type(4) {
	width: 110px;
}

.brickColorDialog .el-dialog__body {
	max-height: 70vh;
}

.brickColorTableScroll {
	max-height: 65vh;
	overflow-x: hidden;
	overflow-y: scroll;
}

.brickColorDialog .el-table th, .brickColorDialog .el-table td {
	padding: 5px 0;
	text-align: center;
	overflow: hidden;
}

.brickColorDialog .el-color-picker {
	display: inline-block;
	height: 34px;
	margin-bottom: -4px;
}

</style>
