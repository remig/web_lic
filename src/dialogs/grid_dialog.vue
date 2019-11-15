/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<licDialog
		:title="tr('dialog.grid.title')"
		class="gridDialog"
		width="500px"
	>
		<el-form label-width="140px">
			<el-form-item :label="tr('dialog.grid.enabled')">
				<el-checkbox
					v-model="newState.enabled"
					@change="update"
				/>
			</el-form-item>
			<el-form-item
				:label="tr('dialog.grid.spacing')"
				:disabled="newState.enabled"
			>
				<input
					v-model.number="newState.spacing"
					:disabled="!newState.enabled"
					min="1"
					max="10000"
					type="number"
					class="form-control"
					@input="update"
				>
			</el-form-item>
			<el-form-item
				:label="tr('dialog.grid.offset')"
				:disabled="newState.enabled"
			>
				<span class="gridInlineLabel">{{tr("dialog.grid.offset_top")}}</span>
				<input
					v-model.number="newState.offset.top"
					:disabled="!newState.enabled"
					min="-1000"
					max="10000"
					type="number"
					class="form-control"
					@input="update"
				>
				<span class="gridInlineLabel2">{{tr("dialog.grid.offset_left")}}</span>
				<input
					v-model.number="newState.offset.left"
					:disabled="!newState.enabled"
					min="-1000"
					max="10000"
					type="number"
					class="form-control"
					@input="update"
				>
			</el-form-item>
			<el-form-item :label="tr('dialog.grid.line_style')">
				<el-form-item
					:label="tr('glossary.color')"
					label-width="70px"
				>
					<el-checkbox
						v-model="useAutoColor"
						:disabled="!newState.enabled"
						:label="tr('dialog.grid.auto_color')"
						class="gridAutoChecbox"
						@change="update"
					/>
					<el-color-picker
						v-model="lineColor"
						:disabled="useAutoColor || !newState.enabled"
						@active-change="updateColor"
					/>
				</el-form-item>
				<el-form-item :label="tr('dialog.grid.width')" label-width="70px">
					<input
						v-model.number="newState.line.width"
						:disabled="!newState.enabled"
						min="1"
						max="100"
						type="number"
						class="form-control"
						@input="update"
					>
				</el-form-item>
				<el-form-item :label="tr('dialog.grid.dash')" label-width="70px">
					<span class="gridInlineLabel">(NYI)</span>
				</el-form-item>
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
import cache from '../cache';
import undoStack from '../undo_stack';
import uiState from '../ui_state';

export default {
	// TODO: Add option to draw grid above / below page elements
	data: function() {
		return {
			useAutoColor: true,
			lineColor: '',
			newState: uiState.get('grid'),
		};
	},
	methods: {
		show(app) {
			const grid = uiState.get('grid');
			const color = grid.line.color;
			this.useAutoColor = (color === 'auto');
			this.lineColor = (color === 'auto') ? 'rgb(0, 0, 0)' : _.color.toRGB(color).toString();
			this.newState = _.cloneDeep(grid);
			this.originalState = grid;
			this.app = app;  // TODO: need easy way to signal app stuff like 'redraw page' or 'redraw UI'
		},
		update() {
			if (this.useAutoColor) {
				this.newState.line.color = 'auto';
			} else {
				this.newState.line.color = this.lineColor;
			}
			uiState.set('grid', _.cloneDeep(this.newState));
			cache.set('uiState', 'gridPath', null);
			this.app.drawCurrentPage();
		},
		updateColor(newColor) {
			this.newState.line.color = this.lineColor = newColor;
			this.update();
		},
		ok() {
			const storeOp = {
				root: cache.stateCache,
				op: 'replace',
				path: '/uiState/gridPath',
				value: null,
			};
			const root = uiState.getCurrentState(), op = 'replace', path = '/grid';
			const change = {
				redo: [
					{root, op, path, value: _.cloneDeep(this.newState)},
					storeOp,
				],
				undo: [
					{root, op, path, value: this.originalState},
					storeOp,
				],
			};
			undoStack.commit(change, null, 'Style Grid');
			this.$emit('close');
		},
		cancel() {
			uiState.set('grid', this.originalState);
			cache.set('uiState', 'gridPath', null);
			this.app.drawCurrentPage();
			this.$emit('close');
		},
	},
};
</script>

<style>

.gridDialog input {
	display: inline;
	width: 80px;
}

.gridInlineLabel {
	margin-right: 10px;
}

.gridInlineLabel2 {
	margin: 0 10px;
}

.gridAutoChecbox {
	margin-right: 15px;
}

</style>
