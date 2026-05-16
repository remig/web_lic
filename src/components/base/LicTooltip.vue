/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<div class="lic-tooltip" @mouseenter="onEnter" @mouseleave="onLeave">
		<slot />
		<div v-if="visible" class="lic-tooltip-content">
			<slot name="content" />
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const visible = ref(false);
let timer: ReturnType<typeof setTimeout> | null = null;

function onEnter() {
	timer = setTimeout(() => {
		visible.value = true;
	}, 500);
}

function onLeave() {
	if (timer) {
		clearTimeout(timer);
		timer = null;
	}
	visible.value = false;
}
</script>

<style>
.lic-tooltip {
	position: relative;
	display: inline-block;
}

.lic-tooltip-content {
	position: absolute;
	left: calc(100% + 11px);
	top: 50%;
	transform: translateY(-50%);
	background: white;
	border: 1px solid #e4e7ed;
	border-radius: 4px;
	box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
	padding: 8px 12px;
	font-size: 13px;
	color: #606266;
	z-index: 3000;
	width: max-content;
	white-space: nowrap;

	&::before,
	&::after {
		content: '';
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		border: 9px solid transparent;
		right: 100%;
	}

	&::before {
		border-right-color: #e4e7ed;
	}

	&::after {
		border-width: 8px;
		border-right-color: white;
		right: calc(100% - 1px);
	}
}
</style>
