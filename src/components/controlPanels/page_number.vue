/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<div>
		<panel-base title="template.page_number.position">
			<div class="panel-row">
				<LicSelect v-model="position" :options="positionOptions" @change="updatePosition" />
			</div>
		</panel-base>
		<font-panel
			template-entry="page.numberLabel"
			@new-values="newValues"
		/>
	</div>
</template>

<script setup lang="ts">

import {t} from '@/translations';
import {ref} from 'vue';

import store from '../../store';
import LicSelect from '../base/LicSelect.vue';
import FontPanel from './font.vue';
import PanelBase from './panel_base.vue';

// TODO: add UI to choose default page layout
// TODO: add UI to choose whether to redo layout or just extend canvas
// TODO: need to re-layout title page too, on some operations like page resize
// TODO: explore component 'extends' to make panel / subpanel nesting easier https://vuejs.org/v2/api/#extends

const emit = defineEmits(['new-values']);

const position = ref(store.state.template.page.numberLabel.position);
const positionOptions = ['right', 'left', 'even-left', 'even-right'].map(p => ({
	value: p,
	label: t('template.page_number.positions.' + p),
}));

function newValues() {
	emit('new-values', 'pagenumber');
}

function updatePosition(newPosition: 'right' | 'left' | 'even-right' | 'even-left') {
	store.state.template.page.numberLabel.position = position.value = newPosition;
	newValues();
}

</script>
