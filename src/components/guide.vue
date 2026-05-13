/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<div
		ref="el"
		:data-id="`guide-${id}`"
		:class="['guide', orientation === 'vertical' ? 'guide-vertical' : 'guide-horizontal']"
		:style="orientation === 'vertical'
			? {left: position + 'px', height: (pageSize.height + 20) + 'px'}
			: {top: position + 'px', width: (pageSize.width + 20) + 'px'}"
	/>
</template>

<script setup lang="ts">

import {ref} from 'vue';
import _ from '../util';
import undoStack from '../undo_stack';
import uiState from '../ui_state';

const props = defineProps<{
	position: number;
	orientation: string;
	pageSize: {width: number; height: number};
	id: number;
}>();

const el = ref<HTMLElement | null>(null);

function moveBy(dx: number, dy: number) {
	// TOOD: Improve performance here to cut down guide drag flicker
	if (props.orientation === 'vertical') {
		let left = parseFloat(el.value!.style.left) + dx;
		left = _.clamp(left, 0, props.pageSize.width);
		document.querySelectorAll(`[data-id="guide-${props.id}"]`).forEach(guideEl => {
			(guideEl as HTMLElement).style.left = left + 'px';
		});
	} else {
		let top = parseFloat(el.value!.style.top) + dy;
		top = _.clamp(top, 0, props.pageSize.height);
		document.querySelectorAll(`[data-id="guide-${props.id}"]`).forEach(guideEl => {
			(guideEl as HTMLElement).style.top = top + 'px';
		});
	}
}

function savePosition() {
	const attr = (props.orientation === 'vertical') ? 'left' : 'top';
	const position = parseFloat(el.value!.style[attr]);
	const change = uiState.mutations.guides.setPosition(props.id, position);
	undoStack.commit(change, null, 'Move Guide');
}

defineExpose({moveBy, savePosition});

</script>

<style>

.guide {
	position: absolute;
}

.guide-vertical {
	border-right: 1px solid black;
	top: -10px;
	width: 1px;
	cursor: e-resize;
}

.guide-horizontal {
	border-top: 1px solid black;
	left: -10px;
	height: 1px;
	cursor: n-resize;
}

</style>
