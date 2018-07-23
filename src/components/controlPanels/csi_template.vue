<template>
	<div>
		<transform-panel
			:template-entry="templateEntry"
			@new-values="newValues"
		/>
		<fill-panel
			template-entry="step.csi.displacementArrow"
			title="Displacement Arrow Color"
			@new-values="newArrowStyle"
		/>
		<!--<border-panel title="Displacement Arrow Border" v-on:new-values="newArrowStyle"></border-panel>-->
	</div>
</template>

<script>

import store from '../../store';
import TransformPanel from './transform.vue';
import FillPanel from './fill.vue';

export default {
	components: {TransformPanel, FillPanel},
	props: ['selectedItem', 'templateEntry'],
	methods: {
		apply() {
			this.$parent.applyDirtyAction('csi');
		},
		newArrowStyle() {
			store.get.csi(this.selectedItem).isDirty = true;
			this.$emit('new-values', 'CSI');
		},
		newValues() {
			store.get.csi(this.selectedItem).isDirty = true;
			this.$emit('new-values', {type: 'CSI', noLayout: true});
		}
	}
};

</script>
