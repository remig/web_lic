/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<LicDialog :title="t('dialog.export_hi_res_pdf.title')" width="525px" class="pdfExportDialog">
		<div style="--label-width: 140px">
			<div class="label-input-row">
				{{ t('dialog.export_hi_res_pdf.page_size') }}
				<div class="flex-row">
					<input
						ref="set_focus"
						:value="pageSize.width"
						min="0"
						max="10000"
						type="number"
						class="form-control"
						@input="updateWidth($event)"
					/>
					<span>{{ t('dialog.export_hi_res_pdf.by') }}</span>
					<input
						:value="pageSize.height"
						min="0"
						max="10000"
						type="number"
						class="form-control"
						@input="updateHeight($event)"
					/>
					<LicSelect :value="newState.units" :options="unitOptions" @change="updateUnits" />
				</div>
			</div>
			<div class="label-input-row">
				{{ t('dialog.export_hi_res_pdf.image_res') }}
				<div class="flex-row">
					<input
						v-model.number="newState.dpi"
						min="0"
						max="1000"
						type="number"
						class="form-control"
					/>
					<span>{{ t('dialog.export_hi_res_pdf.dpi') }}</span>
				</div>
			</div>
		</div>
		<template #footer>
			<LicButton type="cancel" @click="emit('cancel')" />
			<LicButton type="ok" @click="ok" />
		</template>
	</LicDialog>
</template>

<script setup lang="ts">
import { t } from '@/translations';
import { reactive } from 'vue';

import LicButton from '@/components/base/LicButton.vue';
import LicDialog from '@/components/base/LicDialog.vue';
import LicSelect from '@/components/base/LicSelect.vue';

import uiState from '../ui_state';
import _, { type UnitTypes } from '../util';

interface PdfExportResult {
	dpi: number;
	units: UnitTypes;
	pageSize: { width: number; height: number };
}

const props = defineProps<{
	pageSizeInPixels: { width: number; height: number };
}>();
const emit = defineEmits<{
	(e: 'ok', v: PdfExportResult): void;
	(e: 'cancel'): void;
}>();

const unitOptions = ['point', 'mm', 'cm', 'in'].map((u) => ({
	value: u,
	label: u,
}));

const newState = reactive(uiState.get('dialog.export.pdf')); // dpi & units
const pageSize = reactive({
	width: _.units.pixelsToUnits(props.pageSizeInPixels.width, newState.units),
	height: _.units.pixelsToUnits(props.pageSizeInPixels.height, newState.units),
});
const aspectRatio = props.pageSizeInPixels.width / props.pageSizeInPixels.height;

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
}
</script>

<style>
.pdfExportDialog {
	input {
		width: 95px;
	}
}
</style>
