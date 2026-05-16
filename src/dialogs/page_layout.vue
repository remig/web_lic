/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<LicDialog :title="t('dialog.page_layout.title')" width="400px" class="pageLayoutDialog">
		<div class="flex-row panel-row">
			<span class="page-layout-label">{{ t('dialog.page_layout.rows') }}</span>
			<label class="lic-checkbox">
				<input v-model="autoRows" type="checkbox" @change="updateValues" />
				{{ t('glossary.auto') }}
			</label>
			<input
				v-model.number="values.rows"
				:disabled="autoRows"
				type="number"
				min="1"
				class="form-control"
				@input="updateValues"
			/>
		</div>
		<div class="flex-row panel-row">
			<span class="page-layout-label">{{ t('dialog.page_layout.cols') }}</span>
			<label class="lic-checkbox">
				<input v-model="autoCols" type="checkbox" @change="updateValues" />
				{{ t('glossary.auto') }}
			</label>
			<input
				v-model.number="values.cols"
				:disabled="autoCols"
				type="number"
				min="1"
				class="form-control"
				@input="updateValues"
			/>
		</div>
		<div class="flex-row panel-row">
			<span class="page-layout-label">{{ t('dialog.page_layout.orientation') }}</span>
			<label class="lic-radio">
				<input
					type="radio"
					name="direction"
					value="horizontal"
					:checked="values.direction === 'horizontal'"
					@change="setDirection('horizontal')"
				/>
				{{ t('dialog.page_layout.horizontal') }}
			</label>
			<label class="lic-radio">
				<input
					type="radio"
					name="direction"
					value="vertical"
					:checked="values.direction === 'vertical'"
					@change="setDirection('vertical')"
				/>
				{{ t('dialog.page_layout.vertical') }}
			</label>
		</div>
		<template #footer>
			<LicButton type="cancel" @click="cancel" />
			<LicButton type="ok" @click="ok" />
		</template>
	</LicDialog>
</template>

<script setup lang="ts">
import { t } from '@/translations';
import { computed, reactive, ref } from 'vue';

import LicButton from '@/components/base/LicButton.vue';
import LicDialog from '@/components/base/LicDialog.vue';

import { type GridLayout, type Orientations } from '../item_types';

const props = defineProps<{ initialLayout: GridLayout }>();
const emit = defineEmits<{
	(e: 'update', v: GridLayout): void;
	(e: 'ok', v: GridLayout): void;
	(e: 'cancel'): void;
}>();

const autoRows = ref(props.initialLayout.rows === 'auto');
const autoCols = ref(props.initialLayout.cols === 'auto');
const values = reactive({
	rows: props.initialLayout.rows === 'auto' ? 1 : (props.initialLayout.rows as number),
	cols: props.initialLayout.cols === 'auto' ? 1 : (props.initialLayout.cols as number),
	direction: props.initialLayout.direction,
});

const actualValues = computed<GridLayout>(() => ({
	rows: autoRows.value ? 'auto' : values.rows,
	cols: autoCols.value ? 'auto' : values.cols,
	direction: values.direction,
}));

function setDirection(dir: Orientations) {
	values.direction = dir;
	updateValues();
}

function updateValues() {
	emit('update', actualValues.value);
}

function ok() {
	emit('ok', actualValues.value);
}

function cancel() {
	emit('cancel');
}
</script>

<style>
.pageLayoutDialog {
	input {
		width: 90px;
	}
}

.page-layout-label {
	width: 80px;
	flex-shrink: 0;
}
</style>
