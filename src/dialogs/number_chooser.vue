/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<LicDialog
		:title="title"
		:width="width"
	>
		<label class="label-input-row">
			{{labelText}}
			<div>
				<input
					ref="set_focus"
					v-model.number="value"
					:min="min"
					:max="max"
					:step="step"
					type="number"
					class="form-control"
					@input="updateValues"
				>
				<div v-if="bodyText" style="margin-top: 15px" v-html="bodyText" />
			</div>
		</label>
		<template #footer>
			<LicButton type="cancel" @click="cancel" />
			<LicButton type="ok" @click="ok" />
		</template>
	</LicDialog>
</template>

<script setup lang="ts">

// TODO: Need to implement my own better looking number input, with nice scroll buttons.

import {ref} from 'vue';
import LicDialog from '@/components/base/LicDialog.vue';
import LicButton from '@/components/base/LicButton.vue';

const emit = defineEmits(['update', 'ok', 'cancel', 'close']);

const value = ref<number | null>(null);
const title = ref('');
const labelText = ref('');
const width = ref('500px');
const bodyText = ref('');
const min = ref(0);
const max = ref(100);
const step = ref(1);

defineExpose({value, title, label: labelText, width, bodyText, min, max, step});

function updateValues() {
	emit('update', value.value);
}

function ok() {
	emit('ok', value.value);
	emit('close');
}

function cancel() {
	emit('cancel');
	emit('close');
}

</script>

<style>
</style>
