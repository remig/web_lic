/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<div ref="containerRef" class="lic-color-picker">
		<button
			type="button"
			class="lic-color-swatch"
			@click="togglePicker"
		>
			<span class="swatch-inner" :style="swatchStyle" />
		</button>
		<div v-if="isOpen" class="lic-color-popup" :style="popupStyle">
			<ChromePicker
				:value="currentColor ?? '#000000'"
				:disable-alpha="!showAlpha"
				@input="onInput"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">

import {computed, onUnmounted,ref} from 'vue';
import {ChromePicker} from 'vue-color';

import 'vue-color/vue2/style.css';

const POPUP_W = 225;
const POPUP_H = 290;
const GAP = 4;

const props = withDefaults(defineProps<{
	modelValue?: string | null;
	value?: string | null;
	showAlpha?: boolean;
}>(), {showAlpha: false});

const emit = defineEmits(['update:modelValue', 'input', 'change']);

const isOpen = ref(false);
const containerRef = ref<HTMLElement | null>(null);
const popupStyle = ref({top: '0px', left: '0px'});

const currentColor = computed(() => props.modelValue ?? props.value ?? null);

const swatchStyle = computed(() => {
	if (!currentColor.value) {
		return {
			background: `
				linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%),
				linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%)
			`,
			backgroundSize: '8px 8px',
			backgroundPosition: '0 0, 4px 4px',
		};
	}
	return {backgroundColor: currentColor.value};
});

function calcPopupStyle() {
	const rect = containerRef.value!.getBoundingClientRect();
	const vw = window.innerWidth;
	const vh = window.innerHeight;

	let left = rect.left;
	if (left + POPUP_W > vw - GAP) {
		left = rect.right - POPUP_W;
	}
	left = Math.max(GAP, left);

	let top = rect.bottom + GAP;
	if (top + POPUP_H > vh - GAP) {
		top = rect.top - POPUP_H - GAP;
	}
	top = Math.max(GAP, top);

	popupStyle.value = {top: `${top}px`, left: `${left}px`};
}

function onInput(newColor: string) {
	const color = newColor === 'transparent' ? null : newColor;
	emit('update:modelValue', color);
	emit('input', color);
	emit('change', color);
}

function onOutsideClick(e: MouseEvent) {
	if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
		closePicker();
	}
}

function closePicker() {
	isOpen.value = false;
	document.removeEventListener('mousedown', onOutsideClick);
}

function togglePicker() {
	if (isOpen.value) {
		closePicker();
	} else {
		calcPopupStyle();
		isOpen.value = true;
		document.addEventListener('mousedown', onOutsideClick);
	}
}

onUnmounted(() => {
	document.removeEventListener('mousedown', onOutsideClick);
});

</script>

<style>

.lic-color-picker {
	display: inline-block;
	position: relative;

	.lic-color-swatch {
		width: 28px;
		height: 28px;
		border-radius: 4px;
		border: 1px solid #ccc;
		cursor: pointer;
		padding: 3px;
		background: white;
		display: flex;
	}

	.swatch-inner {
		display: block;
		width: 100%;
		height: 100%;
		border-radius: 2px;
	}
}

.lic-color-popup {
	position: fixed;
	z-index: 3000;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
	border-radius: 4px;
}

</style>
