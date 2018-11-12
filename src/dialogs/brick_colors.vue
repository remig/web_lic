/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<el-dialog
		:title="tr('dialog.brick_colors.title')"
		:modal="false"
		:show-close="false"
		:visible="true"
		class="brickColorDialog"
		width="500px"
	>
		<table class="el-table brickColorTable">
			<tr>
				<th>LDraw Code</th>
				<th style="text-align: left;">Name</th>
				<th>Color</th>
				<th>Edge Color</th>
			</tr>
		</table>
		<div class="brickColorTableScroll">
			<table class="el-table brickColorTable">
				<tr v-for="row in colorData" v-if="row" :key="row.id" class="brickColorRow">
					<td>{{(row.id) === studFaceColorCode ? '--' : row.id}}</td>
					<td style="text-align: left;">{{row.name | prettyPrint}}</td>
					<td>
						<el-color-picker v-model="row.color" color-format="hex" />
					</td>
					<td v-if="row.id !== studFaceColorCode">
						<el-color-picker v-model="row.edge" color-format="hex" />
					</td>
				</tr>
			</table>
		</div>
		<span slot="footer" class="dialog-footer">
			<el-button @click="reset">{{tr("reset")}}</el-button>
			<el-button @click="cancel">{{tr("cancel")}}</el-button>
			<el-button type="primary" @click="ok()">{{tr("ok")}}</el-button>
		</span>
	</el-dialog>
</template>

<script>

import _ from '../util';
import store from '../store';
import LDParse from '../LDParse';
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
	colors.unshift(colors.pop());  // Move last color (stud face) to first slot in the table
	return colors;
}

export default {
	data: function() {
		return {
			colorData: buildColorTable(),
			studFaceColorCode: LDParse.studFaceColorCode
		};
	},
	methods: {
		ok() {
			this.colorData.forEach(el => {
				const ldColor = LDParse.colorTable[el.id];
				let customColor = customColors[el.id];
				if (ldColor.color === el.color && customColor) {
					delete customColor.color;
				} else if (ldColor.color !== el.color) {
					customColor = customColors[el.id] = customColors[el.id] || {};
					customColor.color = el.color;
					if (el.id === LDParse.studFaceColorCode) {
						customColor.edge = el.edge = el.color;
					}
				}
				if (ldColor.edge === el.edge && customColor) {
					delete customColor.edge;
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
			Storage.replace.customBrickColors(customColors);
			LDParse.setCustomColorTable(customColors);
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
	height: 34px;
}

</style>
