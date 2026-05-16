/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<div>
		<fill-panel :template-entry="templateEntry" @new-values="newValues" />
		<border-panel :template-entry="templateEntry" @new-values="newValues" />
	</div>
</template>

<script setup lang="ts">
import BorderPanel from './border.vue';
import FillPanel from './fill.vue';

const props = defineProps<{ templateEntry: string }>();
const emit = defineEmits(['new-values']);

function newValues() {
	emit('new-values', props.templateEntry);
}
</script>
