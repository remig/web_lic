/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<div>
		<transform-panel
			:template-entry="templateEntry"
			@new-values="newValues"
		/>
		<fill-panel
			title="template.csi.displacement_arrow_color"
			template-entry="step.csi.displacementArrow"
			@new-values="newArrowStyle"
		/>
		<!--<border-panel title="Displacement Arrow Border" v-on:new-values="newArrowStyle"></border-panel>-->
	</div>
</template>

<script setup lang="ts">

import {getCurrentInstance} from 'vue';
import store from '../../store';
import TransformPanel from './transform.vue';
import FillPanel from './fill.vue';

const props = defineProps<{selectedItem: any; templateEntry: string}>();
const emit = defineEmits(['new-values']);

const instance = getCurrentInstance();

function apply() {
	(instance?.proxy?.$parent as any)?.applyDirtyAction('csi');
}

function newArrowStyle() {
	store.get.csi(props.selectedItem).isDirty = true;
	emit('new-values', 'csi');
}

function newValues() {
	store.get.csi(props.selectedItem).isDirty = true;
	emit('new-values', {type: 'csi', noLayout: true});
}

defineExpose({apply});

</script>
