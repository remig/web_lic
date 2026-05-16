/* Web Lic - Copyright (C) 2018 Remi Gagne */

<template>
	<div>
		<panel-base title="template.pli.content">
			<div class="panel-row">
				<label class="lic-checkbox">
					<input v-model="includeSubmodels" type="checkbox" @change="updateValues" />
					{{ t('template.pli.include_submodels') }}
				</label>
			</div>
		</panel-base>
		<fill-panel template-entry="pli" @new-values="newValues" />
		<border-panel template-entry="pli" @new-values="newValues" />
	</div>
</template>

<script setup lang="ts">
import { t } from '@/translations';
import { ref } from 'vue';

import store from '../../store';
import BorderPanel from './border.vue';
import FillPanel from './fill.vue';
import PanelBase from './panel_base.vue';

const emit = defineEmits(['new-values']);

const includeSubmodels = ref(store.state.template.pli.includeSubmodels);

function newValues() {
	emit('new-values', 'pli');
}

function updateValues() {
	const template = store.state.template.pli;
	if (includeSubmodels.value !== template.includeSubmodels) {
		template.includeSubmodels = includeSubmodels.value;
		emit('new-values', 'pli');
	}
}
</script>
