/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<div ref="containerRef" class="lic-dropdown">
		<LicButton @click="toggle">
			<slot name="trigger">
				{{label}}
			</slot>
		</LicButton>
		<div v-if="isOpen" class="lic-dropdown-menu" :style="menuStyle">
			<slot />
		</div>
	</div>
</template>

<script setup lang="ts">

import {onUnmounted,ref} from 'vue';

import LicButton from './LicButton.vue';

defineProps<{label: string}>();

const isOpen = ref(false);
const containerRef = ref<HTMLElement | null>(null);
const menuStyle = ref({top: '0px', left: '0px'});

function calcMenuStyle() {
	const rect = containerRef.value!.getBoundingClientRect();
	menuStyle.value = {
		top: `${rect.bottom + 2}px`,
		left: `${rect.left}px`,
	};
}

function close() {
	isOpen.value = false;
	document.removeEventListener('mousedown', onOutsideClick);
}

function toggle() {
	if (isOpen.value) {
		close();
	} else {
		calcMenuStyle();
		isOpen.value = true;
		document.addEventListener('mousedown', onOutsideClick);
	}
}

function onOutsideClick(e: MouseEvent) {
	if (!containerRef.value) {
		return;
	}
	if (!containerRef.value.contains(e.target as Node)) {
		close();
	}
}

onUnmounted(() => document.removeEventListener('mousedown', onOutsideClick));

defineExpose({close});

</script>

<style>

.lic-dropdown {
	display: inline-block;
	position: relative;
}

.lic-dropdown-menu {
	position: fixed;
	z-index: 3000;
	background: white;
	border: 1px solid #e4e7ed;
	border-radius: 4px;
	box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
	padding: 6px 0;
}

.lic-dropdown-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 12px;
	padding: 8px 16px;
	cursor: pointer;
	font-size: 13px;
	color: #606266;
	white-space: nowrap;

	&:hover {
		background: #f5f7fa;
		color: #409eff;
	}
}

.lic-dropdown-divider {
	margin: 5px 0;
	border: none;
	border-top: 1px solid #ebeef5;
}

</style>
