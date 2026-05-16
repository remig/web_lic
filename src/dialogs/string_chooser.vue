/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<LicDialog :title="title" :width="width ?? '500px'">
		<label class="label-input-row">
			{{ label }}
			<input ref="set_focus" v-model="newString" class="form-control" />
		</label>
		<template #footer>
			<LicButton type="cancel" @click="cancel" />
			<LicButton type="ok" @click="ok" />
		</template>
	</LicDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import LicButton from '@/components/base/LicButton.vue';
import LicDialog from '@/components/base/LicDialog.vue';

const props = defineProps<{
	title: string;
	label: string;
	initialValue?: string | null;
	width?: string;
}>();
const emit = defineEmits<{
	(e: 'ok', value: string): void;
	(e: 'cancel'): void;
}>();

const newString = ref(props.initialValue ?? '');

function ok() {
	emit('ok', newString.value);
}

function cancel() {
	emit('cancel');
}
</script>
