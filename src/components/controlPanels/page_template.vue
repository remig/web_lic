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
					>
					{{tr('template.page.orientation.landscape')}}
				</label>
				<label class="lic-radio">
					<input
						type="radio"
						name="orientation"
						:disabled="haveCustomFormat"
						value="vertical"
						:checked="sizePreset.orientation === 'vertical'"
						@change="updateOrientation('vertical')"
					>
					{{tr('template.page.orientation.portrait')}}
				</label>
			</div>
			<label class="label-input-row">
				{{tr('template.page.width')}}
				<input
					v-model.number="width"
					:disabled="!haveCustomFormat"
					type="number"
					min="0"
					class="form-control"
					@input="updateValues"
				>
			</label>
			<label class="label-input-row">
				{{tr('template.page.height')}}
				<input
					v-model.number="height"
					:disabled="!haveCustomFormat"
					type="number"
					min="0"
					class="form-control"
					@input="updateValues"
				>
			</label>
			<div class="panel-row">
				<label class="lic-checkbox">
					<input
						v-model="maintainAspectRatio"
						type="checkbox"
						:disabled="!haveCustomFormat"
						@change="changeAspectRatio"
					>
					{{tr("template.page.aspect_ratio_@mf", {aspect_ratio: aspectRatio.toFixed(2)})}}
				</label>
			</div>
			<div class="panel-row">
				<div v-html="tr('template.page.printed_size')" />
				<div v-html="tr('template.page.centimeter_size_@mf', printedSize('cm'))" />
				<div v-html="tr('template.page.inch_size_@mf', printedSize('in'))" />
			</div>
		</panel-base>
		<fill-panel
			template-entry="page"
			@new-values="newValues"
		/>
		<border-panel
			template-entry="page"
			@new-values="newValues"
		/>
	</div>
</template>

<script setup lang="ts">

import {ref, computed} from 'vue';
import {tr} from '@/translations';
import _, {type UnitTypes} from '../../util';
import store from '../../store';
import FillPanel from './fill.vue';
import BorderPanel from './border.vue';
import PanelBase from './panel_base.vue';
import EventBus from '../../event_bus';
import LicSelect from '../base/LicSelect.vue';

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
	{value: 'custom', label: tr('template.page.formats.custom')},
	...Object.keys(pageSizeLookups).map(key => ({value: key, label: tr(`template.page.formats.${key}`)})),
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

const emit = defineEmits(['new-values']);

const haveCustomFormat = computed(() => sizePreset.value.format === 'custom');

function printedSize(unit: UnitTypes) {
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
	EventBus.$emit('page-resize');
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
		page.sizePreset = {...sizePreset.value};
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

</style>
