/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<LicDialog :title="t('dialog.scene_rendering.title')" width="420px" class="sceneRenderingDialog">
		<div style="--label-width: 180px">
			<label class="label-input-row">
				{{ t('dialog.scene_rendering.edge_width') }}
				<input
					v-model.number="values.edgeWidth"
					type="number"
					min="0"
					max="10"
					class="form-control sceneRenderingInput"
					@input="applyValues"
				/>
			</label>
			<label class="label-input-row">
				{{ t('dialog.scene_rendering.zoom') }}
				<input
					ref="set_focus"
					v-model.number="values.zoom"
					type="number"
					class="form-control sceneRenderingInput"
					@input="applyValues"
				/>
			</label>
			<rotateBuilder
				:title="t('dialog.scene_rendering.rotate_title')"
				:initial-rotation="values.rotation"
				@new-values="applyRotation"
			/>
		</div>
		<template #footer>
			<LicButton type="cancel" @click="cancel" />
			<LicButton type="ok" @click="ok" />
		</template>
	</LicDialog>
</template>

<script setup lang="ts">
import { t } from '@/translations';
import { reactive } from 'vue';

import rotateBuilder from '../components/rotate.vue';
import LicButton from '@/components/base/LicButton.vue';
import LicDialog from '@/components/base/LicDialog.vue';

import EventBus from '../event_bus';
import { type Rotation } from '../item_types';
import store from '../store';
import undoStack from '../undo_stack';
import _ from '../util';

const emit = defineEmits<{ (e: 'ok'): void; (e: 'cancel'): void }>();

const values = reactive(_.cloneDeep(store.state.template.sceneRendering));
const originalRenderState = _.cloneDeep(store.state.template.sceneRendering);

function applyValues() {
	store.mutations.sceneRendering.set({ ...values, refresh: true });
	EventBus.emit('redraw-ui', { clearSelection: true });
}

function applyRotation(newRotation: Rotation[]) {
	values.rotation = newRotation;
	applyValues();
}

function ok() {
	undoStack.commit('sceneRendering.zoom', { ...values }, t('dialog.scene_rendering.undo'), [
		'renderer',
	]);
	emit('ok');
}

function cancel() {
	store.mutations.sceneRendering.set({ ...originalRenderState, refresh: true });
	EventBus.emit('redraw-ui', { clearSelection: true });
	emit('cancel');
}
</script>

<style>
.sceneRenderingInput {
	width: 95px;
}
</style>
