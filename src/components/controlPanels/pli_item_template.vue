/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<TransformPanel :template-entry="templateEntry" @new-values="newValues" />
</template>

<script setup lang="ts">
import { getCurrentInstance } from 'vue';

import { store } from '../../store';
import TransformPanel from './transform.vue';

const props = defineProps<{ selectedItem: any; templateEntry: string }>();
const emit = defineEmits(['new-values']);

const instance = getCurrentInstance();

function apply() {
	(instance?.proxy?.$parent as any)?.applyDirtyAction('pliItem');
}

function newValues() {
	const pli = store.get.parent(props.selectedItem) as any;
	pli?.pliItems.forEach((id: any) => (store.get.pliItem(id).isDirty = true));
	emit('new-values', 'pliitem');
}

defineExpose({ apply });
</script>
