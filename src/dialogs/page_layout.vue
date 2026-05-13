/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<LicDialog
		:title="t('dialog.page_layout.title')"
		width="400px"
		class="pageLayoutDialog"
	>
		<div class="flex-row panel-row">
			<span class="page-layout-label">{{t('dialog.page_layout.rows')}}</span>
			<label class="lic-checkbox">
				<input v-model="autoRows" type="checkbox" @change="updateValues">
				{{t('glossary.auto')}}
			</label>
			<input
				v-model.number="values.rows"
				:disabled="autoRows"
				type="number"
				min="1"
				class="form-control"
				@input="updateValues"
			>
		</div>
		<div class="flex-row panel-row">
			<span class="page-layout-label">{{t('dialog.page_layout.cols')}}</span>
			<label class="lic-checkbox">
				<input v-model="autoCols" type="checkbox" @change="updateValues">
				{{t('glossary.auto')}}
			</label>
			<input
				v-model.number="values.cols"
				:disabled="autoCols"
				type="number"
				min="1"
				class="form-control"
				@input="updateValues"
			>
		</div>
		<div class="flex-row panel-row">
			<span class="page-layout-label">{{t('dialog.page_layout.orientation')}}</span>
			<label class="lic-radio">
				<input
					type="radio"
					name="direction"
					value="horizontal"
					:checked="values.direction === 'horizontal'"
					@change="setDirection('horizontal')"
				>
				{{t('dialog.page_layout.horizontal')}}
			</label>
			<label class="lic-radio">
				<input
					type="radio"
					name="direction"
					value="vertical"
					:checked="values.direction === 'vertical'"
					@change="setDirection('vertical')"
				>
				{{t('dialog.page_layout.vertical')}}
			</label>
		</div>
		<template #footer>
			<LicButton type="cancel" @click="cancel" />
			<LicButton type="ok" @click="ok" />
		</template>
	</LicDialog>
</template>

<script setup lang="ts">

import {ref, reactive, computed} from 'vue';
import {t} from '@/translations';
import LicDialog from '@/components/base/LicDialog.vue';
import LicButton from '@/components/base/LicButton.vue';
import {type GridLayout, type Orientations} from '../item_types';

const emit = defineEmits(['update', 'ok', 'cancel', 'close']);

const autoRows = ref(true);
const autoCols = ref(true);
const values = reactive<GridLayout>({
	rows: 0,
	cols: 0,
	direction: 'vertical',
});

const actualValues = computed<GridLayout>(() => ({
	rows: autoRows.value ? 'auto' : values.rows,
	cols: autoCols.value ? 'auto' : values.cols,
	direction: values.direction,
}));

function show() {
	if (values.rows === 'auto') {
		values.rows = 1;
		autoRows.value = true;
	} else {
		autoRows.value = false;
	}
	if (values.cols === 'auto') {
		values.cols = 1;
		autoCols.value = true;
	} else {
		autoCols.value = false;
	}
}

function setDirection(dir: Orientations) {
	values.direction = dir;
	updateValues();
}

function updateValues() {
	emit('update', actualValues.value);
}

function ok() {
	emit('ok', actualValues.value);
	emit('close');
}

function cancel() {
	emit('cancel', actualValues.value);
	emit('close');
}

defineExpose({autoRows, autoCols, values, show});

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
