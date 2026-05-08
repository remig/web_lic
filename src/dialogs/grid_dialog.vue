/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<LicDialog
		:title="t('dialog.grid.title')"
		width="500px"
	>
		<div style="--label-width: 120px">
			<div class="label-input-row">
				{{t('dialog.grid.enabled')}}
				<label class="lic-checkbox">
					<input v-model="newState.enabled" type="checkbox" @change="update">
				</label>
			</div>
			<label class="label-input-row">
				{{t('dialog.grid.spacing')}}
				<input
					v-model.number="newState.spacing"
					:disabled="!newState.enabled"
					min="1"
					max="10000"
					type="number"
					class="form-control"
					@input="update"
				>
			</label>
			<label class="label-input-row">
				{{t('dialog.grid.offset')}}
				<div class="flex-row">
					<span class="gridInlineLabel">{{t("dialog.grid.offset_top")}}</span>
					<input
						v-model.number="newState.offset.top"
						:disabled="!newState.enabled"
						min="-1000"
						max="10000"
						type="number"
						class="form-control"
						@input="update"
					>
					<span class="gridInlineLabel2">{{t("dialog.grid.offset_left")}}</span>
					<input
						v-model.number="newState.offset.left"
						:disabled="!newState.enabled"
						min="-1000"
						max="10000"
						type="number"
						class="form-control"
						@input="update"
					>
				</div>
			</label>
			<hr>
			<div class="label-input-row">
				{{t('dialog.grid.line_style')}}
				<div style="--label-width: 70px">
					<div class="label-input-row">
						{{t('glossary.color')}}
						<div class="flex-row" style="min-height: 34px;">
							<label class="lic-checkbox gridAutoChecbox">
								<input
									v-model="useAutoColor"
									type="checkbox"
									:disabled="!newState.enabled"
									@change="update"
								>
								{{t('dialog.grid.auto_color')}}
							</label>
							<LicColorPicker
								v-show="!useAutoColor"
								v-model="lineColor"
								@change="updateColor"
							/>
						</div>
					</div>
					<label class="label-input-row">
						{{t('dialog.grid.width')}}
						<input
							v-model.number="newState.line.width"
							:disabled="!newState.enabled"
							min="1"
							max="100"
							type="number"
							class="form-control"
							@input="update"
						>
					</label>
					<label class="label-input-row">
						{{t('dialog.grid.dash')}}
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

import {ref} from 'vue';
import {tr as t} from '@/translations';
import LicDialog from '@/components/base/LicDialog.vue';
import LicButton from '@/components/base/LicButton.vue';
import LicColorPicker from '@/components/base/LicColorPicker.vue';
import _ from '../util';
import cache from '../cache';
import undoStack from '../undo_stack';
import uiState from '../ui_state';

const emit = defineEmits(['close']);

const useAutoColor = ref(true);
const lineColor = ref('');
const newState = ref(uiState.get('grid'));
let originalState: any = null;
let app: any = null;

function show(appRef: any) {
	const grid = uiState.get('grid');
	const color = grid.line.color;
	useAutoColor.value = (color === 'auto');
	lineColor.value = (color === 'auto') ? 'rgb(0, 0, 0)' : _.color.toRGB(color).toString();
	newState.value = _.cloneDeep(grid);
	originalState = grid;
	app = appRef;
}

function update() {
	if (useAutoColor.value) {
		newState.value.line.color = 'auto';
	} else {
		newState.value.line.color = lineColor.value;
	}
	uiState.set('grid', _.cloneDeep(newState.value));
	cache.set('uiState', 'gridPath', null);
	app.drawCurrentPage();
}

function updateColor(newColor: string) {
	newState.value.line.color = lineColor.value = newColor;
	update();
}

function ok() {
	const storeOp = {
		root: cache.get('uiState', 'gridPath'),
		op: 'replace',
		path: '/',
		value: null,
	};
	const root = uiState.getCurrentState(), op = 'replace', path = '/grid';
	const change = {
		redo: [
			{root, op, path, value: _.cloneDeep(newState.value)},
			storeOp,
		],
		undo: [
			{root, op, path, value: originalState},
			storeOp,
		],
	};
	undoStack.commit(change, null, 'Style Grid');
	emit('close');
}

function cancel() {
	uiState.set('grid', originalState);
	cache.set('uiState', 'gridPath', null);
	app.drawCurrentPage();
	emit('close');
}

defineExpose({show});

</script>

<style>

input[type="number"] {
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
