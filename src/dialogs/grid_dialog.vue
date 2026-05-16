/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<LicDialog :title="t('dialog.grid.title')" width="500px">
		<div style="--label-width: 120px">
			<div class="label-input-row">
				{{ t('dialog.grid.enabled') }}
				<label class="lic-checkbox">
					<input v-model="newState.enabled" type="checkbox" @change="update" />
				</label>
			</div>
			<label class="label-input-row">
				{{ t('dialog.grid.spacing') }}
				<input
					v-model.number="newState.spacing"
					:disabled="!newState.enabled"
					min="1"
					max="10000"
					type="number"
					class="form-control"
					@input="update"
				/>
			</label>
			<div class="label-input-row">
				{{ t('dialog.grid.offset') }}
				<div class="flex-row">
					<span class="gridInlineLabel">{{ t('dialog.grid.offset_top') }}</span>
					<input
						v-model.number="newState.offset.top"
						:disabled="!newState.enabled"
						min="-1000"
						max="10000"
						type="number"
						class="form-control"
						@input="update"
					/>
					<span class="gridInlineLabel2">{{ t('dialog.grid.offset_left') }}</span>
					<input
						v-model.number="newState.offset.left"
						:disabled="!newState.enabled"
						min="-1000"
						max="10000"
						type="number"
						class="form-control"
						@input="update"
					/>
				</div>
			</div>
			<hr />
			<div class="label-input-row">
				{{ t('dialog.grid.line_style') }}
				<div style="--label-width: 70px">
					<div class="label-input-row">
						{{ t('glossary.color') }}
						<div class="flex-row" style="min-height: 34px">
							<label class="lic-checkbox gridAutoChecbox">
								<input
									v-model="useAutoColor"
									type="checkbox"
									:disabled="!newState.enabled"
									@change="update"
								/>
								{{ t('dialog.grid.auto_color') }}
							</label>
							<LicColorPicker v-show="!useAutoColor" v-model="lineColor" @change="updateColor" />
						</div>
					</div>
					<label class="label-input-row">
						{{ t('dialog.grid.width') }}
						<input
							v-model.number="newState.line.width"
							:disabled="!newState.enabled"
							min="1"
							max="100"
							type="number"
							class="form-control"
							@input="update"
						/>
					</label>
					<label class="label-input-row">
						{{ t('dialog.grid.dash') }}
						<span>(NYI)</span>
					</label>
				</div>
			</div>
		</div>
		<template #footer>
			<LicButton type="cancel" @click="cancel" />
			<LicButton type="ok" @click="ok" />
		</template>
	</LicDialog>
</template>

<script setup lang="ts">
import { t } from '@/translations';
import { ref } from 'vue';

import LicButton from '@/components/base/LicButton.vue';
import LicColorPicker from '@/components/base/LicColorPicker.vue';
import LicDialog from '@/components/base/LicDialog.vue';

import cache from '../cache';
import * as UiOps from '../ui_ops';
import uiState from '../ui_state';
import undoStack from '../undo_stack';
import _ from '../util';

const emit = defineEmits<{ (e: 'ok'): void; (e: 'cancel'): void }>();

const grid = uiState.get('grid');
const useAutoColor = ref(grid.line.color === 'auto');
const autoLineColor = 'rgb(0, 0, 0)';
const lineColor = ref(
	grid.line.color === 'auto' ? autoLineColor : _.color.toRGB(grid.line.color).toString(),
);
const newState = ref(_.cloneDeep(grid));
const originalState = grid;

function update() {
	if (useAutoColor.value) {
		newState.value.line.color = 'auto';
	} else {
		newState.value.line.color = lineColor.value;
	}
	uiState.set('grid', _.cloneDeep(newState.value));
	cache.set('uiState', 'gridPath', null);
	UiOps.drawCurrentPage();
}

function updateColor(newColor: string) {
	newState.value.line.color = lineColor.value = newColor;
	update();
}

function ok() {
	const root = uiState.getCurrentState(),
		op = 'replace',
		path = '/grid';
	const redo = [{ root, op, path, value: _.cloneDeep(newState.value) }];
	const undo = [{ root, op, path, value: originalState }];
	const gridPathCache = cache.get('uiState', 'gridPath');
	if (gridPathCache != null) {
		const storeOp = {
			root: gridPathCache,
			op: 'replace',
			path: '/',
			value: null,
		};
		redo.push(storeOp);
		undo.push(storeOp);
	}
	undoStack.commit({ redo, undo }, null, 'Style Grid');
	emit('ok');
}

function cancel() {
	uiState.set('grid', originalState);
	cache.set('uiState', 'gridPath', null);
	UiOps.drawCurrentPage();
	emit('cancel');
}
</script>

<style>
input[type='number'] {
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
