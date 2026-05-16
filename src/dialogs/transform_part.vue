/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<LicDialog
		:title="t('dialog.transform_part.title')"
		width="600px"
		class="transformPartDialog"
	>
		<div class="flex-row panel-row" style="gap: 30px;">
			<span class="transform-section">{{t('dialog.transform_part.position')}}</span>
			<label class="flex-row">{{t('glossary.x')}}
				<input
					ref="set_focus"
					v-model.number="position.x"
					type="number"
					class="form-control"
					@input="updateValues"
				>
			</label>
			<label class="flex-row">{{t('glossary.y')}}
				<input v-model.number="position.y" type="number" class="form-control" @input="updateValues">
			</label>
			<label class="flex-row">{{t('glossary.z')}}
				<input v-model.number="position.z" type="number" class="form-control" @input="updateValues">
			</label>
		</div>
		<div class="flex-row panel-row" style="gap: 30px;">
			<span class="transform-section">{{t('dialog.transform_part.rotation')}}</span>
			<label class="flex-row">{{t('glossary.x')}}
				<input v-model.number="rotation.x" type="number" class="form-control" @input="updateValues">
			</label>
			<label class="flex-row">{{t('glossary.y')}}
				<input v-model.number="rotation.y" type="number" class="form-control" @input="updateValues">
			</label>
			<label class="flex-row">{{t('glossary.z')}}
				<input v-model.number="rotation.z" type="number" class="form-control" @input="updateValues">
			</label>
		</div>
		<template #footer>
			<LicButton type="cancel" @click="cancel" />
			<LicButton type="ok" @click="ok" />
		</template>
	</LicDialog>
</template>

<script setup lang="ts">

import {t} from '@/translations';
import {ref} from 'vue';

import LicButton from '@/components/base/LicButton.vue';
import LicDialog from '@/components/base/LicDialog.vue';

interface TransformValues {
	rotation: {x: number; y: number; z: number};
	position: {x: number; y: number; z: number};
}

const props = defineProps<TransformValues>();
const emit = defineEmits<{(e: 'update', v: TransformValues): void; (e: 'ok', v: TransformValues): void; (e: 'cancel'): void}>();

const rotation = ref({...props.rotation});
const position = ref({...props.position});

function currentValues(): TransformValues {
	return {rotation: rotation.value, position: position.value};
}

function updateValues() {
	emit('update', currentValues());
}

function ok() {
	emit('ok', currentValues());
}

function cancel() {
	emit('cancel');
}

</script>

<style>

.transformPartDialog {
	input {
		width: 90px;
	}
}

.transform-section {
	width: 70px;
	flex-shrink: 0;
}

</style>
