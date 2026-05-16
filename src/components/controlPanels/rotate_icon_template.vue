/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<div>
		<fill-panel template-entry="rotateIcon" @new-values="newValues" />
		<border-panel template-entry="rotateIcon" @new-values="newValues" />
		<border-panel
			template-entry="rotateIcon.arrow"
			title="glossary.arrow"
			@new-values="newValues"
		/>
	</div>
</template>

<script setup lang="ts">
import BorderPanel from './border.vue';
import FillPanel from './fill.vue';

const emit = defineEmits(['new-values']);

function newValues() {
	emit('new-values', 'rotateicon');
}
</script>
