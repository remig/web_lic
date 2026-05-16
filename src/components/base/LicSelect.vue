/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<LicDropdown ref="dropdownRef" :label="selectedLabel">
		<template #trigger>
			<span class="lic-select-trigger-content">
				<span class="lic-select-current">{{ selectedLabel }}</span>
				<span v-for="opt in options" :key="opt.value" class="lic-select-sizer" aria-hidden="true">{{
					opt.label
				}}</span>
			</span>
		</template>
		<div
			v-for="opt in options"
			:key="opt.value"
			:class="['lic-dropdown-item', { selected: opt.value === currentValue }]"
			@click="select(opt.value)"
		>
			{{ opt.label }}
		</div>
	</LicDropdown>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

import LicDropdown from './LicDropdown.vue';

const props = defineProps<{
	modelValue?: string;
	value?: string;
	options: { value: string; label: string }[];
}>();

const emit = defineEmits(['update:modelValue', 'input', 'change']);

const dropdownRef = ref<InstanceType<typeof LicDropdown> | null>(null);

const currentValue = computed(() => props.modelValue ?? props.value ?? '');

const selectedLabel = computed(
	() => props.options.find((o) => o.value === currentValue.value)?.label ?? currentValue.value,
);

function select(value: string) {
	emit('update:modelValue', value);
	emit('input', value);
	emit('change', value);
	dropdownRef.value?.close();
}
</script>

<style>
.lic-dropdown-item.selected {
	font-weight: bold;
}

.lic-select-trigger-content {
	display: grid;

	> * {
		grid-area: 1 / 1;
	}

	.lic-select-sizer {
		visibility: hidden;
	}
}
</style>
