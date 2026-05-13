/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<LicDialog
		:title="t('dialog.export_hi_res_pdf.title')"
		width="525px"
		class="pdfExportDialog"
	>
		<div style="--label-width: 140px">
			<div class="label-input-row">
				{{t('dialog.export_hi_res_pdf.page_size')}}
				<div class="flex-row">
					<input
						ref="set_focus"
						:value="pageSize.width"
						min="0"
						max="10000"
						type="number"
						class="form-control"
						@input="updateWidth($event)"
					>
					<span>{{t("dialog.export_hi_res_pdf.by")}}</span>
					<input
						:value="pageSize.height"
						min="0"
						max="10000"
						type="number"
						class="form-control"
						@input="updateHeight($event)"
					>
					<LicSelect :value="newState.units" :options="unitOptions" @change="updateUnits" />
				</div>
			</div>
			<label class="label-input-row">
				{{t('dialog.export_hi_res_pdf.image_res')}}
				<div class="flex-row">
					<input
						v-model.number="newState.dpi"
						min="0"
						max="1000"
						type="number"
						class="form-control"
					>
					<span>{{t("dialog.export_hi_res_pdf.dpi")}}</span>
				</div>
			</label>
		</div>
		<template #footer>
			<LicButton type="cancel" @click="emit('close')" />
			<LicButton type="ok" @click="ok" />
		</template>
	</LicDialog>
</template>

<script setup lang="ts">

import {reactive} from 'vue';
import {t} from '@/translations';
import LicDialog from '@/components/base/LicDialog.vue';
import LicButton from '@/components/base/LicButton.vue';
import LicSelect from '@/components/base/LicSelect.vue';
import _, {type UnitTypes} from '../util';
import uiState from '../ui_state';

const emit = defineEmits(['ok', 'close']);

const unitOptions = ['point', 'mm', 'cm', 'in'].map(u => ({value: u, label: u}));

const newState = reactive(uiState.get('dialog.export.pdf'));  // dpi & units
const pageSize = reactive({width: 0, height: 0});  // stored in newState.units
let aspectRatio = 0;

function show(pageSizeInPixels: {width: number; height: number}) {
	const units = newState.units;
	pageSize.width = _.units.pixelsToUnits(pageSizeInPixels.width, units);
	pageSize.height = _.units.pixelsToUnits(pageSizeInPixels.height, units);
	aspectRatio = pageSizeInPixels.width / pageSizeInPixels.height;
}

function updateWidth(event: Event) {
	pageSize.width = _.round(parseFloat((event.target as HTMLInputElement).value), 2);
	pageSize.height = _.round(pageSize.width / aspectRatio, 2);
}

function updateHeight(event: Event) {
	pageSize.height = _.round(parseFloat((event.target as HTMLInputElement).value), 2);
	pageSize.width = _.round(pageSize.height * aspectRatio, 2);
}

function updateUnits(newUnits: UnitTypes) {
	const widthInPixels = _.units.unitsToPixels(pageSize.width, newState.units);
	pageSize.width = _.round(_.units.pixelsToUnits(widthInPixels, newUnits), 2);
	const heightInPixels = _.units.unitsToPixels(pageSize.height, newState.units);
	pageSize.height = _.round(_.units.pixelsToUnits(heightInPixels, newUnits));
	newState.units = newUnits;
}

function ok() {
	const units = newState.units;
	emit('ok', {
		dpi: newState.dpi,
		units: newState.units,
		pageSize: {
			width: _.units.unitToPoints(pageSize.width, units),
			height: _.units.unitToPoints(pageSize.height, units),
		},
	});
	emit('close');
}

defineExpose({show});

</script>

<style>

.pdfExportDialog input {
	width: 95px;
}

</style>
