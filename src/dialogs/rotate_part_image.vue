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
				{{t('dialog.rotate_part_image.add_rotate_icon')}}
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
import {t} from '@/translations';
import {type Rotation} from '@/item_types';
import LicButton from '@/components/base/LicButton.vue';
import LicDialog from '@/components/base/LicDialog.vue';
import rotateBuilder from '@/components/rotate.vue';

interface RotateResult {
	title: string;
	addRotateIcon: boolean;
	rotation: Rotation[];
}

const props = defineProps<{
	title: string;
	rotation: Rotation[] | null;
	addRotateIcon?: boolean;
	showRotateIconCheckbox?: boolean;
}>();
const emit = defineEmits<{(e: 'update', v: RotateResult): void; (e: 'ok', v: RotateResult): void; (e: 'cancel'): void}>();

const addRotateIcon = ref(props.addRotateIcon ?? true);
const showRotateIconCheckbox = ref(props.showRotateIconCheckbox ?? true);
const rotation = ref<Rotation[]>(props.rotation ?? []);

function currentData(): RotateResult {
	return {
		title: props.title,
		addRotateIcon: addRotateIcon.value,
		rotation: rotation.value,
	};
}

function updateValues(newRotation: Rotation[]) {
	rotation.value = newRotation;
	emit('update', currentData());
}

function ok() {
	emit('ok', currentData());
}

function cancel() {
	emit('cancel');
}

</script>

<style>


</style>
