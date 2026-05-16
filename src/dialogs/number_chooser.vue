/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<LicDialog
		:title="title"
		:width="width ?? '500px'"
	>
		<div class="label-input-row">
			{{label}}
			<div>
				<input
					ref="set_focus"
					v-model.number="currentValue"
					:min="min ?? 0"
					:max="max ?? 100"
					:step="step ?? 1"
					type="number"
					class="form-control"
					@input="updateValues"
				>
				<div v-if="bodyText" style="margin-top: 15px" v-html="bodyText" />
			</div>
		</div>
		<template #footer>
			<LicButton type="cancel" @click="cancel" />
			<LicButton type="ok" @click="ok" />
		</template>
	</LicDialog>
</template>

<script setup lang="ts">

// TODO: Need to implement my own better looking number input, with nice scroll buttons.

import {ref} from 'vue';

import LicButton from '@/components/base/LicButton.vue';
import LicDialog from '@/components/base/LicDialog.vue';

const props = defineProps<{
	title: string;
	label?: string;
	initialValue?: number | null;
	min?: number;
	max?: number;
	step?: number;
	bodyText?: string;
	width?: string;
}>();
const emit = defineEmits<{(e: 'update', value: number): void; (e: 'ok', value: number): void; (e: 'cancel'): void}>();

const currentValue = ref(props.initialValue ?? 0);

function updateValues() {
	emit('update', currentValue.value);
}

function ok() {
	emit('ok', currentValue.value);
}

function cancel() {
	emit('cancel');
}

</script>

<style>
</style>
