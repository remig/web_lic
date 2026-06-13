/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<div>
		<panel-base title="template.page.title" style="--label-width: 100px">
			<div class="panel-row">
				<LicSelect
					:value="sizePreset.format"
					:options="pageFormatOptions"
					@change="updatePagePreset"
				/>
			</div>
			<div class="flex-row panel-row">
				<label class="lic-radio">
					<input
						type="radio"
						name="orientation"
						:disabled="haveCustomFormat"
						value="horizontal"
						:checked="sizePreset.orientation === 'horizontal'"
						@change="updateOrientation('horizontal')"
					/>
					{{ t('template.page.orientation.landscape') }}
				</label>
				<label class="lic-radio">
					<input
						type="radio"
						name="orientation"
						:disabled="haveCustomFormat"
						value="vertical"
						:checked="sizePreset.orientation === 'vertical'"
						@change="updateOrientation('vertical')"
					/>
					{{ t('template.page.orientation.portrait') }}
				</label>
			</div>
			<label class="label-input-row">
				{{ t('template.page.width') }}
				<input
					v-model.number="width"
					:disabled="!haveCustomFormat"
					type="number"
					min="0"
					class="form-control"
					@input="updateValues"
				/>
			</label>
			<label class="label-input-row">
				{{ t('template.page.height') }}
				<input
					v-model.number="height"
					:disabled="!haveCustomFormat"
					type="number"
					min="0"
					class="form-control"
					@input="updateValues"
				/>
			</label>
			<div class="panel-row">
				<label class="lic-checkbox">
					<input
						v-model="maintainAspectRatio"
						type="checkbox"
						:disabled="!haveCustomFormat"
						@change="changeAspectRatio"
					/>
					{{
						t('template.page.aspect_ratio_@mf', {
							aspect_ratio: aspectRatio.toFixed(2),
						})
					}}
				</label>
			</div>
			<div class="panel-row">
				<div v-html="t('template.page.printed_size')" />
				<div v-html="t('template.page.centimeter_size_@mf', printedSize('cm'))" />
				<div v-html="t('template.page.inch_size_@mf', printedSize('in'))" />
			</div>
		</panel-base>
		<panel-base title="template.page.layout.title">
			<div class="flex-row panel-row">
				<div
					class="layout-option"
					:class="{ selected: pageLayoutDirection === 'horizontal' }"
					@click="updatePageLayout('horizontal')"
				>
					{{ t('template.page.layout.horizontal') }}
				</div>
				<div
					class="layout-option"
					:class="{ selected: pageLayoutDirection === 'vertical' }"
					@click="updatePageLayout('vertical')"
				>
					{{ t('template.page.layout.vertical') }}
				</div>
			</div>
		</panel-base>
		<fill-panel template-entry="page" @new-values="newValues" />
		<border-panel template-entry="page" @new-values="newValues" />
	</div>
</template>

<script setup lang="ts">
import { type Orientations, Size } from '@/item_types';
import { t } from '@/translations';
import { computed, ref } from 'vue';

import EventBus from '../../event_bus';
import { store } from '../../store';
import _, { type UnitTypes } from '../../util';
import LicSelect from '../base/LicSelect.vue';
import BorderPanel from './border.vue';
import FillPanel from './fill.vue';
import PanelBase from './panel_base.vue';

const pageSizeLookups: Record<string, [number, number]> = {
	a3: [1123, 1587],
	a4: [794, 1123],
	a5: [559, 794],
	letter: [816, 1056],
	'gov-letter': [768, 1008],
	legal: [816, 1344],
	'junior-legal': [480, 768],
};

const pageFormatOptions = [
	{ value: 'custom', label: t('template.page.formats.custom') },
	...Object.keys(pageSizeLookups).map((key) => ({
		value: key,
		label: t(`template.page.formats.${key}`),
	})),
];

const template = store.state.template.page;

const width = ref(template.width);
const height = ref(template.height);
const sizePreset = ref({
	format: template.sizePreset?.format ?? 'custom',
	orientation: template.sizePreset?.orientation ?? 'vertical',
});
const aspectRatio = ref(template.width / template.height);
const maintainAspectRatio = ref(true);
const pageLayoutDirection = ref(template.layout.direction);

const emit = defineEmits(['new-values']);

const haveCustomFormat = computed(() => sizePreset.value.format === 'custom');

function printedSize(unit: UnitTypes): Size {
	return {
		width: _.round(_.units.pixelsToUnits(width.value, unit), 2),
		height: _.round(_.units.pixelsToUnits(height.value, unit), 2),
	};
}

function changeAspectRatio() {
	height.value = Math.floor(width.value / aspectRatio.value);
	updateValues();
}

function newValues() {
	EventBus.emit('page-resize');
	emit('new-values', 'page');
}

function updatePagePreset(newPagePreset: string) {
	sizePreset.value.format = newPagePreset;
	if (newPagePreset !== 'custom') {
		maintainAspectRatio.value = false;
		const pageSize = pageSizeLookups[newPagePreset];
		if (sizePreset.value.orientation === 'vertical') {
			width.value = pageSize[0];
			height.value = pageSize[1];
		} else {
			width.value = pageSize[1];
			height.value = pageSize[0];
		}
		aspectRatio.value = width.value / height.value;
	}
	updateValues();
}

function updateOrientation(newOrientation: string) {
	sizePreset.value.orientation = newOrientation;
	const tmp = width.value;
	width.value = height.value;
	height.value = tmp;
	aspectRatio.value = 1 / aspectRatio.value;
	updateValues();
}

function updatePageLayout(direction: Orientations) {
	pageLayoutDirection.value = direction;
	store.mutations.templatePage.setPageLayout({ direction });
	newValues();
}

function updateValues() {
	const page = store.state.template.page;
	let haveChange = false;
	if (width.value !== page.width || height.value !== page.height) {
		if (maintainAspectRatio.value) {
			if (width.value !== page.width) {
				height.value = Math.floor(width.value / aspectRatio.value);
			} else if (height.value !== page.height) {
				width.value = Math.floor(height.value * aspectRatio.value);
			}
		}
		page.width = width.value;
		page.height = height.value;
		haveChange = true;
	}
	if (!_.isEqual(page.sizePreset, sizePreset.value)) {
		page.sizePreset = { ...sizePreset.value };
		haveChange = true;
	}
	if (haveChange) {
		newValues();
	}
}
</script>

<style>
.pageSizeInfo {
	margin-top: 15px;
}

.pageSizeInfo > div {
	line-height: unset;
	color: #606266;
}

.layout-option {
	flex: 1;
	padding: 4px 8px;
	text-align: center;
	cursor: pointer;
	border: 1px solid #dcdfe6;
	border-radius: 4px;
	color: #606266;

	& + .layout-option {
		margin-left: 6px;
	}

	&.selected {
		border-color: #409eff;
		color: #409eff;
		background-color: #ecf5ff;
	}

	&:hover:not(.selected) {
		border-color: #c0c4cc;
		color: #303133;
	}
}
</style>
