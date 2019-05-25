/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<licDialog
		:title="tr('dialog.scene_rendering.title')"
		width="400px"
		class="sceneRenderingDialog"
	>
		<el-form label-width="180px">
			<el-form-item :label="tr('dialog.scene_rendering.zoom')">
				<input
					v-model.number="values.zoom"
					type="number"
					class="form-control"
					@input="updateValues"
				>
			</el-form-item>
			<el-form-item :label="tr('dialog.scene_rendering.edge_width')">
				<input
					v-model.number="values.edgeWidth"
					type="number"
					min="0"
					max="10"
					class="form-control"
					@input="updateValues"
				>
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
import store from '../store';
import undoStack from '../undoStack';

export default{
	data: function() {
		return {
			values: _.cloneDeep(store.state.template.sceneRendering)
		};
	},
	methods: {
		updateValues() {
			store.mutations.sceneRendering.set({...this.values, refresh: true});
			this.app.redrawUI(true);
		},
		show(app) {
			this.originalRenderState = _.cloneDeep(store.state.template.sceneRendering);
			this.app = app;
		},
		ok() {
			undoStack.commit(
				'sceneRendering.zoom',
				this.values,
				this.tr('dialog.scene_rendering.undo'),
				['renderer']
			);
			this.$emit('close');
		},
		cancel() {
			store.mutations.sceneRendering.set({...this.originalRenderState, refresh: true});
			this.app.redrawUI(true);
			this.$emit('close');
		}
	}
};
</script>

<style>

.sceneRenderingDialog input {
	width: 95px;
}

</style>
