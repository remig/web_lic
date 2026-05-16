/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<div ref="containerRef" class="split-view">
		<div class="split-pane split-pane-left" :style="{ flexBasis: modelValue + '%' }">
			<slot name="left" />
		</div>
		<div ref="gutterRef" class="split-gutter" @mousedown.prevent="startDrag" />
		<div class="split-pane split-pane-right">
			<slot name="right" />
		</div>
	</div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

const props = withDefaults(
	defineProps<{
		modelValue: number;
		minLeft?: number;
		minRight?: number;
		gutterSize?: number;
	}>(),
	{ minLeft: 0, minRight: 0, gutterSize: 5 },
);

const emit = defineEmits<{ 'update:modelValue': [value: number] }>();

const containerRef = ref<HTMLElement | null>(null);
const gutterRef = ref<HTMLElement | null>(null);

let dragStartX = 0;
let dragStartLeftPx = 0;

function availableWidth(): number {
	return (containerRef.value?.offsetWidth ?? 0) - props.gutterSize;
}

function clampedPercent(px: number): number {
	const w = availableWidth();
	const clamped = Math.max(props.minLeft, Math.min(w - props.minRight, px));
	return (clamped / w) * 100;
}

function onMouseMove(e: MouseEvent) {
	emit('update:modelValue', clampedPercent(dragStartLeftPx + e.clientX - dragStartX));
}

function onMouseUp() {
	document.removeEventListener('mousemove', onMouseMove);
	document.removeEventListener('mouseup', onMouseUp);
	document.body.style.cursor = '';
	document.body.style.userSelect = '';
}

function startDrag(e: MouseEvent) {
	dragStartX = e.clientX;
	dragStartLeftPx = (props.modelValue / 100) * availableWidth();
	document.addEventListener('mousemove', onMouseMove);
	document.addEventListener('mouseup', onMouseUp);
	document.body.style.cursor = 'ew-resize';
	document.body.style.userSelect = 'none';
}

function onTouchMove(e: TouchEvent) {
	emit('update:modelValue', clampedPercent(dragStartLeftPx + e.touches[0].clientX - dragStartX));
}

function onTouchEnd() {
	document.removeEventListener('touchmove', onTouchMove);
	document.removeEventListener('touchend', onTouchEnd);
}

function onTouchStart(e: TouchEvent) {
	dragStartX = e.touches[0].clientX;
	dragStartLeftPx = (props.modelValue / 100) * availableWidth();
	document.addEventListener('touchmove', onTouchMove, { passive: true });
	document.addEventListener('touchend', onTouchEnd, { passive: true });
}

onMounted(() => {
	gutterRef.value?.addEventListener('touchstart', onTouchStart, { passive: true });
});

onBeforeUnmount(() => {
	gutterRef.value?.removeEventListener('touchstart', onTouchStart);
	document.removeEventListener('mousemove', onMouseMove);
	document.removeEventListener('mouseup', onMouseUp);
	document.removeEventListener('touchmove', onTouchMove);
	document.removeEventListener('touchend', onTouchEnd);
});
</script>

<style>
.split-view {
	display: flex;
	height: 100%;
	overflow: hidden;

	.split-pane {
		box-sizing: border-box;
		height: 100%;
		flex-shrink: 0;
		overflow: hidden;
	}

	.split-pane-right {
		flex: 1 1 auto;
		overflow: hidden;
	}

	.split-gutter {
		width: 5px;
		flex-shrink: 0;
		background-color: #777;
		cursor: ew-resize;
		height: 100%;
		touch-action: none;
	}
}
</style>
