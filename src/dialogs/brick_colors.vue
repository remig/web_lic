<template>
	<el-dialog
		:title="tr('dialog.brick_colors.title')"
		:modal="false"
		:show-close="false"
		:visible="visible"
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
					<td>{{row.id}}</td>
					<td style="text-align: left;">{{row.name | prettyPrint}}</td>
					<td>
						<el-color-picker
							v-model="row.color"
							color-format="hex"
						/>
					</td>
					<td>
						<el-color-picker
							v-model="row.edge"
							color-format="hex"
						/>
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
import undoStack from '../undoStack';
import LDParse from '../LDParse';

export default {
	// TODO: Add option to draw grid above / below page elements
	data: function() {
		const colors = [];
		_.forOwn(LDParse.colorTable, (v, k) => {
			if (v.color < 0 || v.edge < 0) {
				return;
			}
			k = parseInt(k, 10);
			colors[k] = {
				id: k,
				name: v.name,
				color: v.color,
				edge: v.edge
			};
		});
		return {
			visible: false,
			colorData: colors
		};
	},
	methods: {
		show() {
			this.visible = true;
		},
		ok() {
			this.visible = false;
			let haveChange = false;
			const undo = [], redo = [];
			this.colorData.forEach(el => {
				const ldColor = LDParse.colorTable[el.id];
				if (ldColor.color !== el.color) {
					if (ldColor.originalColor == null) {
						redo.push({root: ldColor, op: 'add', path: '/originalColor', value: ldColor.color});
						undo.push({root: ldColor, op: 'remove', path: '/originalColor'});
					}
					redo.push({root: ldColor, op: 'replace', path: '/color', value: el.color});
					undo.push({root: ldColor, op: 'replace', path: '/color', value: ldColor.color});
					haveChange = true;
				}
				if (ldColor.edge !== el.edge) {
					if (ldColor.originalEdge == null) {
						redo.push({root: ldColor, op: 'add', path: '/originalEdge', value: ldColor.edge});
						undo.push({root: ldColor, op: 'remove', path: '/originalEdge'});
					}
					redo.push({root: ldColor, op: 'replace', path: '/edge', value: el.edge});
					undo.push({root: ldColor, op: 'replace', path: '/edge', value: ldColor.edge});
					haveChange = true;
				}
			});
			if (haveChange) {
				const change = {action: {undo, redo}};
				const text = this.tr('dialog.brick_colors.action');
				undoStack.commit(change, null, text, ['csi', 'pliItem']);
				store.mutations.csi.markAllDirty();
				store.mutations.pliItem.markAllDirty();
				this.$root.redrawUI();
			}
		},
		reset() {
			_.forOwn(LDParse.colorTable, (v, k) => {
				const el = this.colorData[k];
				if (el == null) {
					return;
				}
				if (v.originalColor) {
					el.color = v.originalColor;
				} else if (el.color !== v.color) {
					el.color = v.color;
				}
				if (v.originalEdge) {
					el.edge = v.originalEdge;
				} else if (el.edge !== v.edge) {
					el.edge = v.edge;
				}
			});
		},
		cancel() {
			this.visible = false;
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

