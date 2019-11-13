/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<div>
		<fill-panel
			template-entry="rotateIcon"
			@new-values="newValues"
		/>
		<border-panel
			template-entry="rotateIcon"
			@new-values="newValues"
		/>
		<border-panel
			template-entry="rotateIcon.arrow"
			title="glossary.arrow"
			@new-values="newValues"
		/>
	</div>
</template>

<script>

import FillPanel from './fill.vue';
import BorderPanel from './border.vue';

export default {
	components: {FillPanel, BorderPanel},
	methods: {
		newValues() {
			this.$emit('new-values', 'rotateicon');
		},
	},
};

</script>
