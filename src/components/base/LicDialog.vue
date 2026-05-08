/* Web Lic - Copyright (C) 2026 Remi Gagne */

<script setup lang="ts">
import {ref, onMounted} from 'vue';

const props = withDefaults(defineProps<{
	title?: string;
	modal?: boolean;
	width?: string;
}>(), {modal: false});

const el = ref<HTMLDialogElement | null>(null);

onMounted(() => {
	if (props.modal) {
		el.value!.showModal();
	} else {
		el.value!.show();
	}
});
</script>

<template>
	<dialog ref="el" :style="props.width ? {width: props.width} : {}">
		<header v-if="props.title" class="header">
			{{props.title}}
		</header>
		<div class="body">
			<slot />
		</div>
		<footer v-if="$slots.footer" class="footer">
			<slot name="footer" />
		</footer>
	</dialog>
</template>

<style scoped>

dialog {
	position: fixed;
	top: 16%;
	left: 0;
	right: 0;
	margin: auto;
	padding: 0;
	border: 1px solid #333;
	border-radius: 6px;
	box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
	z-index: 2000;
}

.header {
	padding: 16px 20px;
	border-bottom: 1px solid #ebeef5;
	font-size: 18px;
	color: #303133;
}

.body {
	padding: 20px;
}

.footer {
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
    gap: 8px;
	padding: 12px 20px;
	border-top: 1px solid #ebeef5;
}

</style>
