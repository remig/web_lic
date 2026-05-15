/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<LicDialog
		:title="t('dialog.import_model.title')"
		width="580px"
	>
		<div v-if="includePartsPerStep" class="flex-row panel-row">
			<span>{{t('dialog.import_model.parts_per_step_1')}}</span>
			<input
				v-model.number="newState.partsPerStep"
				min="1"
				type="number"
				class="form-control parts-per-step"
			>
			<span>{{t('dialog.import_model.parts_per_step_2')}}</span>
		</div>
		<div class="flex-row panel-row">
			<span>{{t('dialog.import_model.steps_per_page')}}</span>
			<input
				v-model.number="newState.stepsPerPage"
				:disabled="newState.useMaxSteps"
				min="1"
				max="10"
				type="number"
				class="form-control step-input"
			>
			<label class="lic-checkbox">
				<input
					v-model="newState.useMaxSteps"
					type="checkbox"
					data-testid="import-use-max-steps"
				>
				{{t('dialog.import_model.use_max_steps')}}
			</label>
		</div>
		<div>
			<LicDropdown
				:label="t('dialog.import_model.include.root')"
				data-testid="import-include-dropdown"
			>
				<div
					v-for="(checked, item) in newState.include"
					:key="`include_${item}`"
					class="lic-dropdown-item"
					:data-testid="`include-${item}`"
					@click="checkIncludeItem(item)"
				>
					{{t(`dialog.import_model.include.${item}`)}}
					<i v-if="checked" class="fas fa-check" />
				</div>
			</LicDropdown>
		</div>
		<template #footer>
			<LicButton type="ok" data-testid="import-ok" @click="ok" />
		</template>
	</LicDialog>
</template>

<script setup lang="ts">

import {ref} from 'vue';
import {t} from '@/translations';
import LicDialog from '@/components/base/LicDialog.vue';
import LicButton from '@/components/base/LicButton.vue';
import LicDropdown from '@/components/base/LicDropdown.vue';
import uiState from '@/ui_state';

interface ImportModelResult {
	partsPerStep: number | null;
	stepsPerPage: number;
	useMaxSteps: boolean;
	include: {pli: boolean; partListPage: boolean; titlePage: boolean};
}

const props = defineProps<{includePartsPerStep: boolean; partsPerStep: number | null}>();
const emit = defineEmits<{(e: 'ok', v: ImportModelResult): void; (e: 'cancel'): void}>();

const includePartsPerStep = ref(props.includePartsPerStep);
const newState = ref(uiState.get('dialog.importModel'));
newState.value.partsPerStep = props.partsPerStep;

function checkIncludeItem(item: string | number) {
	const key = String(item);
	newState.value.include[key] = !newState.value.include[key];
}

function ok() {
	emit('ok', newState.value);
}

</script>

<style>

.step-input {
	width: 100px;
}

</style>
