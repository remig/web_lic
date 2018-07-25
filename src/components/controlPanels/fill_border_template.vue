/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<div>
		<fill-panel
			:template-entry="templateEntry"
			@new-values="newValues"
		/>
		<border-panel
			:template-entry="templateEntry"
			@new-values="newValues"
		/>
	</div>
</template>

<script>

import FillPanel from './fill.vue';
import BorderPanel from './border.vue';

export default {
	components: {FillPanel, BorderPanel},
	props: {
		templateEntry: {type: String, required: true}
	},
	methods: {
		newValues() {
			this.$emit('new-values', this.templateEntry);
		}
	}
};

</script>
