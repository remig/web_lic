/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<div class="rotationBuilder">
		<div v-if="props.title" class="panel-row">
			{{ props.title }}
		</div>
		<div class="rotationListBox">
			<div
				v-for="(rot, idx) in rotation"
				:key="'rotation_' + idx"
				class="flex-row rotation-row"
				style="gap: 12px"
			>
				<span v-if="props.includeLabels">{{ t('dialog.rotation.axis') }}</span>
				<LicSelect
					v-model="rot.axis"
					:options="axisOptions"
					class="axis-select"
					data-testid="rotate-axis-select"
					@change="updateValues"
				/>
				<span v-if="props.includeLabels">{{ t('dialog.rotation.angle') }}</span>
				<input
					v-model.number="rot.angle"
					type="number"
					min="-360"
					max="360"
					class="form-control"
					data-testid="rotate-angle-input"
					@input="updateValues"
				/>
				<LicButton class="icon" icon="fas fa-minus" @click="removeRotation(idx)" />
			</div>
			<LicButton class="icon" icon="fas fa-plus" @click="addRotation" />
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

import LicButton from '@/components/base/LicButton.vue';
import LicSelect from '@/components/base/LicSelect.vue';

import { type Rotation } from '../item_types';
import { t } from '../translations';
import _ from '../util';

const axisOptions = [
	{ value: 'x', label: 'X' },
	{ value: 'y', label: 'Y' },
	{ value: 'z', label: 'Z' },
];

const props = withDefaults(
	defineProps<{
		title?: string;
		initialRotation?: Rotation[];
		includeLabels?: boolean;
	}>(),
	{
		title: () => t('dialog.rotation.title'),
		initialRotation: () => [],
		includeLabels: true,
	},
);

const emit = defineEmits<{ (e: 'new-values', rotation: Rotation[]): void }>();

const rotation = ref<Rotation[]>(_.cloneDeep(props.initialRotation));

watch(
	() => props.initialRotation,
	(newVal) => {
		rotation.value = _.cloneDeep(newVal ?? []);
	},
);

function updateValues() {
	emit('new-values', _.cloneDeep(rotation.value));
}

function addRotation() {
	rotation.value.push({ axis: 'x', angle: 0 });
	updateValues();
}

function removeRotation(idx: number) {
	rotation.value.splice(idx, 1);
	updateValues();
}
</script>

<style>
.rotationBuilder .icon {
	padding: 9px 10px;
}

.rotationBuilder .rotationListBox {
	border: 1px solid #e5e5e5;
	border-radius: 4px;
	padding: 15px 0 10px 15px;
	margin-bottom: 10px;
	font-size: 14px;
	font-weight: 700;
	color: #606266;
}

.rotation-row {
	margin-bottom: 8px;
}

.rotationBuilder input[type='number'] {
	width: 70px;
}

.axis-select .lic-btn {
	width: 50px;
}
</style>
