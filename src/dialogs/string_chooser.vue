/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<LicDialog
		:title="title"
		:width="width"
	>
		<label class="label-input-row">
			{{labelText}}
			<input
				ref="set_focus"
				v-model="newString"
				class="form-control"
				@input="updateValues"
			>
		</label>
		<template #footer>
			<LicButton type="cancel" @click="cancel" />
			<LicButton type="ok" @click="ok" />
		</template>
	</LicDialog>
</template>

<script setup lang="ts">

import {ref} from 'vue';
import LicDialog from '@/components/base/LicDialog.vue';
import LicButton from '@/components/base/LicButton.vue';

const emit = defineEmits(['update', 'ok', 'cancel', 'close']);

const newString = ref<string | null>(null);
const title = ref('');
const labelText = ref('');
const width = ref('500px');

defineExpose({newString, title, label: labelText, width});

function updateValues() {
	emit('update', {
		newString: newString.value,
		title: title.value,
		label: labelText.value,
		width: width.value,
	});
}

function ok() {
	emit('ok', newString.value);
	emit('close');
}

function cancel() {
	emit('cancel');
	emit('close');
}

</script>

<style>
</style>
