/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<LicDialog :title="t('dialog.snap.title')" width="300px">
		<div style="--label-width: 120px">
			<div class="label-input-row">
				{{ t('dialog.snap.enabled') }}
				<label class="lic-checkbox">
					<input v-model="newState.enabled" type="checkbox" @change="update" />
				</label>
			</div>
		</div>
		<template #footer>
			<LicButton type="cancel" @click="cancel" />
			<LicButton type="ok" @click="ok" />
		</template>
	</LicDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import LicButton from '@/components/base/LicButton.vue';
import LicDialog from '@/components/base/LicDialog.vue';

import { t } from '../translations';
import uiState from '../ui_state';
import undoStack from '../undo_stack';
import _ from '../util';

const emit = defineEmits<{ (e: 'ok'): void; (e: 'cancel'): void }>();

const snap = uiState.get('snap');
const newState = ref(_.cloneDeep(snap));
const originalState = snap;

function update() {
	uiState.set('snap', _.cloneDeep(newState.value));
}

function ok() {
	const root = uiState.getCurrentState(),
		op = 'replace',
		path = '/snap';
	const redo = [{ root, op, path, value: _.cloneDeep(newState.value) }];
	const undo = [{ root, op, path, value: originalState }];
	undoStack.commit({ redo, undo }, null, 'Configure Snap');
	emit('ok');
}

function cancel() {
	uiState.set('snap', originalState);
	emit('cancel');
}
</script>
