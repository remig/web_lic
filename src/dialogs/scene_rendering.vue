/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<el-dialog
		:title="tr('dialog.scene_rendering.title')"
		:modal="false"
		:show-close="false"
		:visible="visible"
		width="550px"
		class="sceneRenderingDialog"
	>
		<el-form :inline="true" label-width="140px">
			<el-form-item :label="tr('dialog.scene_rendering.zoom')">
				<input
					v-model.number="values.zoom"
					type="number"
					min="-500"
					class="form-control"
					@input="updateValues"
				>
			</el-form-item>
		</el-form>
		<span slot="footer" class="dialog-footer">
			<el-button @click="cancel">{{tr("cancel")}}</el-button>
			<el-button type="primary" @click="ok()">{{tr("ok")}}</el-button>
		</span>
	</el-dialog>
</template>

<script>

import store from '../store';
import undoStack from '../undoStack';

export default{
	data: function() {
		return {
			visible: false,
			values: {
				zoom: store.state.template.sceneRendering.zoom
			}
		};
	},
	methods: {
		updateValues() {
			store.mutations.sceneRendering.zoom({zoom: this.values.zoom, refresh: true});
			this.app.redrawUI(true);
		},
		show(app) {
			this.originalZoom = store.state.template.sceneRendering.zoom;
			this.app = app;
			this.visible = true;
		},
		ok() {
			undoStack.commit(
				'sceneRendering.zoom',
				{zoom: this.values.zoom},
				this.tr('dialog.scene_rendering.undo'),
				['renderer']
			);
			this.visible = false;
		},
		cancel() {
			store.mutations.sceneRendering.zoom({zoom: this.originalZoom, refresh: true});
			this.app.redrawUI(true);
			this.visible = false;
		}
	}
};
</script>
