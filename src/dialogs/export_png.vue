/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<LicDialog :title="t('dialog.export_hi_res_png.title')" width="450px" class="pngExportDialog">
		<div style="--label-width: 100px">
			<label class="label-input-row">
				{{ t('dialog.export_hi_res_png.scale') }}
				<input
					ref="set_focus"
					v-model.number="scale"
					min="0"
					max="100"
					step="0.1"
					type="number"
					class="form-control"
					@input="updateScale"
				/>
			</label>
			<div class="label-input-row">
				<span />
				<label class="lic-checkbox">
					<input v-model="maintainPrintSize" type="checkbox" />
					{{ t('dialog.export_hi_res_png.maintain_print_size') }}
				</label>
			</div>
			<label class="label-input-row">
				{{ t('dialog.export_hi_res_png.dpi') }}
				<input
					v-model.number="dpi"
					min="0"
					max="10000"
					type="number"
					class="form-control"
					@input="updateDPI"
				/>
			</label>
			<div class="panel-row">
				<div>
					<div v-html="t('dialog.export_hi_res_png.size_@mf', scaledPageSize)" />
					<div v-html="t('dialog.export_hi_res_png.print_size_@mf', scaledPrintSize)" />
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
import { computed, ref } from 'vue';

import LicButton from '@/components/base/LicButton.vue';
import LicDialog from '@/components/base/LicDialog.vue';

import uiState from '../ui_state';
import _ from '../util';

interface PngExportResult {
	scale: number;
	dpi: number;
}

const props = defineProps<{
	pageSizeInPixels: { width: number; height: number };
}>();
const emit = defineEmits<{
	(e: 'ok', v: PngExportResult): void;
	(e: 'cancel'): void;
}>();

const pageSize = ref(_.clone(props.pageSizeInPixels));
const scale = ref(uiState.get('dialog.export.images.scale'));
const dpi = ref(uiState.get('dialog.export.images.dpi') || 96);
const maintainPrintSize = ref(uiState.get('dialog.export.images.maintainPrintSize'));

const scaledPageSize = computed(() => ({
	width: Math.floor(pageSize.value.width * scale.value),
	height: Math.floor(pageSize.value.height * scale.value),
}));

const scaledPrintSize = computed(() => {
	const width = Math.floor(pageSize.value.width * scale.value);
	const height = Math.floor(pageSize.value.height * scale.value);
	const dpiScale = 96 / dpi.value;
	function conv(size: number, unit: 'cm' | 'in') {
		return _.round(_.units.pixelsToUnits(size, unit) * dpiScale, 2);
	}
	return {
		cm_width: conv(width, 'cm'),
		cm_height: conv(height, 'cm'),
		in_width: conv(width, 'in'),
		in_height: conv(height, 'in'),
	};
});

function updateScale() {
	if (maintainPrintSize.value) {
		dpi.value = 96 * scale.value;
	}
}

function updateDPI() {
	if (maintainPrintSize.value) {
		scale.value = dpi.value / 96;
	}
}

function ok() {
	uiState.get('dialog.export.images').scale = scale.value;
	uiState.get('dialog.export.images').dpi = dpi.value;
	uiState.get('dialog.export.images').maintainPrintSize = maintainPrintSize.value;
	emit('ok', { scale: scale.value, dpi: dpi.value });
}
</script>
