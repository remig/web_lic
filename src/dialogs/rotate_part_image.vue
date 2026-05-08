/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<LicDialog
		:title="title"
		width="400px"
		class="rotatePartImageDialog"
	>
		<rotate-builder
			:initial-rotation="rotation"
			title=""
			@new-values="updateValues"
		/>
		<div v-if="showRotateIconCheckbox" class="panel-row">
			<label class="lic-checkbox">
				<input
					v-model="addRotateIcon"
					type="checkbox"
					data-testid="rotate-add-icon"
					@change="emit('update', currentData())"
				>
				{{tr('dialog.rotate_part_image.add_rotate_icon')}}
			</label>
		</div>
		<template #footer>
			<LicButton type="cancel" data-testid="rotate-cancel" @click="cancel" />
			<LicButton type="ok" data-testid="rotate-ok" @click="ok" />
		</template>
	</LicDialog>
</template>

<script setup lang="ts">

import {ref} from 'vue';
import {tr} from '@/translations';
import {type Rotation} from '@/item_types';
import LicButton from '@/components/base/LicButton.vue';
import LicDialog from '@/components/base/LicDialog.vue';
import rotateBuilder from '@/components/rotate.vue';

const title = ref('');
const addRotateIcon = ref(true);
const showRotateIconCheckbox = ref(true);
const rotation = ref<Rotation[]>([]);

const emit = defineEmits(['update', 'ok', 'cancel', 'close']);

defineExpose({title, addRotateIcon, showRotateIconCheckbox, rotation});

function currentData() {
	return {title: title.value, addRotateIcon: addRotateIcon.value, rotation: rotation.value};
}

function updateValues(newRotation: Rotation[]) {
	rotation.value = newRotation;
	emit('update', currentData());
}

function ok() {
	emit('ok', currentData());
	emit('close');
}

function cancel() {
	emit('cancel', currentData());
	emit('close');
}

</script>

<style>


</style>
