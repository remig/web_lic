/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<LicDialog
		:title="tr('dialog.displace_part.title')"
		width="480px"
	>
		<div class="displace-grid">
			<span>{{tr('dialog.displace_part.part_distance')}}</span>
			<input
				v-model.number="values.partDistance"
				type="number"
				class="form-control"
				@input="updateValues"
			>
			<span class="displace-second-label">{{tr('dialog.displace_part.arrow_length')}}</span>
			<input
				v-model.number="values.arrowLength"
				type="number"
				class="form-control"
				@input="updateValues"
			>
			<span>{{tr('dialog.displace_part.arrow_distance')}}</span>
			<input
				v-model.number="values.arrowOffset"
				type="number"
				class="form-control"
				@input="updateValues"
			>
			<span class="displace-second-label">{{tr('dialog.displace_part.arrow_rotation')}}</span>
			<input
				v-model.number="values.arrowRotation"
				type="number"
				class="form-control"
				@input="updateValues"
			>
		</div>
		<template #footer>
			<LicButton type="cancel" @click="cancel" />
			<LicButton type="ok" @click="ok" />
		</template>
	</LicDialog>
</template>

<script setup lang="ts">

import {ref} from 'vue';
import {tr} from '@/translations';
import LicDialog from '@/components/base/LicDialog.vue';
import LicButton from '@/components/base/LicButton.vue';

const emit = defineEmits(['update', 'ok', 'cancel', 'close']);

const values = ref({
	partDistance: 0,
	arrowOffset: 0,
	arrowLength: 0,
	arrowRotation: 0,
});

defineExpose({values});

function updateValues() {
	emit('update', {...values.value});
}

function ok() {
	emit('ok', {...values.value});
	emit('close');
}

function cancel() {
	emit('cancel', {...values.value});
	emit('close');
}

</script>

<style>

.displace-grid {
	display: grid;
	grid-template-columns: max-content 90px max-content 90px;
	column-gap: 8px;
	row-gap: 18px;
	align-items: center;
	font-size: 14px;
	font-weight: 700;
	color: #606266;
}

.displace-second-label {
	padding-left: 24px;
}

</style>
