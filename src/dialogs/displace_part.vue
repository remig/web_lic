/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<LicDialog :title="t('dialog.displace_part.title')" width="480px">
		<div class="displace-grid">
			<span>{{ t('dialog.displace_part.part_distance') }}</span>
			<input
				v-model.number="values.partDistance"
				type="number"
				class="form-control"
				@input="updateValues"
			/>
			<span class="displace-second-label">{{ t('dialog.displace_part.arrow_length') }}</span>
			<input
				v-model.number="values.arrowLength"
				type="number"
				class="form-control"
				@input="updateValues"
			/>
			<span>{{ t('dialog.displace_part.arrow_distance') }}</span>
			<input
				v-model.number="values.arrowOffset"
				type="number"
				class="form-control"
				@input="updateValues"
			/>
			<span class="displace-second-label">{{ t('dialog.displace_part.arrow_rotation') }}</span>
			<input
				v-model.number="values.arrowRotation"
				type="number"
				class="form-control"
				@input="updateValues"
			/>
		</div>
		<template #footer>
			<LicButton type="cancel" @click="cancel" />
			<LicButton type="ok" @click="ok" />
		</template>
	</LicDialog>
</template>

<script setup lang="ts">
import { t } from '@/translations';
import { ref } from 'vue';

import LicButton from '@/components/base/LicButton.vue';
import LicDialog from '@/components/base/LicDialog.vue';

interface DisplacePartValues {
	partDistance: number;
	arrowOffset: number;
	arrowLength: number;
	arrowRotation: number;
}

const props = defineProps<{ initialValues: DisplacePartValues }>();
const emit = defineEmits<{
	(e: 'update', vals: DisplacePartValues): void;
	(e: 'ok', vals: DisplacePartValues): void;
	(e: 'cancel'): void;
}>();

const values = ref({ ...props.initialValues });

function updateValues() {
	emit('update', { ...values.value });
}

function ok() {
	emit('ok', { ...values.value });
}

function cancel() {
	emit('cancel');
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
