/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<licDialog
		:title="tr('dialog.scene_rendering.title')"
		width="420px"
		class="sceneRenderingDialog"
	>
		<el-form label-width="180px">
			<el-form-item :label="tr('dialog.scene_rendering.edge_width')">
				<input
					v-model.number="values.edgeWidth"
					type="number"
					min="0"
					max="10"
					class="form-control sceneRenderingInput"
					@input="updateValues"
				>
			</el-form-item>
			<el-form-item :label="tr('dialog.scene_rendering.zoom')">
				<input
					ref="set_focus"
					v-model.number="values.zoom"
					type="number"
					class="form-control sceneRenderingInput"
					@input="updateValues"
				>
			</el-form-item>
			<rotateBuilder
				:title="tr('dialog.scene_rendering.rotate_title')"
				:initial-rotation="values.rotation"
				@new-values="updateValues"
			/>
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
import undoStack from '../undo_stack';
import rotateBuilder from '../components/rotate.vue';
import EventBus from '../event_bus';

export default{
	components: {rotateBuilder},
	data: function() {
		this.originalRenderState = _.cloneDeep(store.state.template.sceneRendering);
		return {
			values: _.cloneDeep(store.state.template.sceneRendering)
		};
	},
	methods: {
		updateValues(newRotation) {
			if (newRotation && Array.isArray(newRotation)) {
				this.values.rotation = newRotation;
			}
			store.mutations.sceneRendering.set({...this.values, refresh: true});
			EventBus.$emit('redraw-ui', {clearSelection: true});
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
			EventBus.$emit('redraw-ui', {clearSelection: true});
			this.$emit('close');
		}
	}
};
</script>

<style>

.sceneRenderingInput {
	width: 95px;
}

</style>
