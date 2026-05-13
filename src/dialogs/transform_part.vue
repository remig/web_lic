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

import {ref} from 'vue';
import {t} from '@/translations';
import LicDialog from '@/components/base/LicDialog.vue';
import LicButton from '@/components/base/LicButton.vue';

const emit = defineEmits(['update', 'ok', 'cancel', 'close']);

const title = ref('');
const rotation = ref({x: 0, y: 0, z: 0});
const position = ref({x: 0, y: 0, z: 0});
const addRotateIcon = ref(true);
const showRotateIconCheckbox = ref(true);

defineExpose({title, rotation, position, addRotateIcon, showRotateIconCheckbox});

function currentProps() {
	return {
		title: title.value,
		rotation: rotation.value,
		position: position.value,
		addRotateIcon: addRotateIcon.value,
		showRotateIconCheckbox: showRotateIconCheckbox.value,
	};
}

function updateValues() {
	emit('update', currentProps());
}

function ok() {
	emit('ok', currentProps());
	emit('close');
}

function cancel() {
	emit('cancel');
	emit('close');
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
